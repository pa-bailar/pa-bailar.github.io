// UI state and the event filtering that depends on it.

import type { AppState, DanceEvent } from "./types";
import { addDays, currentMonth, daysOf, endOfWeek, lastDay, shownDay, todayIso, toIsoDate } from "./lib/dates";
import { capitalize, formatMonthName } from "./lib/format";
import { isSaved } from "./lib/saved";
import { matchesQuery } from "./lib/search";

export function createInitialState(): AppState {
  return {
    view: "upcoming",
    typeFilter: "all",
    styleFilter: "all",
    accountFilter: null,
    query: "",
    savedOnly: false,
    month: currentMonth(),
    selectedDay: todayIso(),
  };
}

/** Styles with variants: filtering by the family ("salsa") also matches its variants ("salsa caleña"). */
export const STYLE_FAMILIES = ["salsa", "bachata"];

export function styleMatches(eventStyle: string, filter: string): boolean {
  return eventStyle === filter || (STYLE_FAMILIES.includes(filter) && eventStyle.startsWith(`${filter} `));
}

export function matchesFilters(event: DanceEvent, state: AppState): boolean {
  const typeOk = state.typeFilter === "all" || event.event_type === state.typeFilter;
  const styleOk = state.styleFilter === "all" || event.styles.some((style) => styleMatches(style, state.styleFilter));
  const accountOk = !state.accountFilter || event.account === state.accountFilter;
  const savedOk = !state.savedOnly || isSaved(event.id);
  return typeOk && styleOk && accountOk && savedOk && matchesQuery(event, state.query);
}

export function activeFilterCount(state: AppState): number {
  return [state.typeFilter !== "all", state.styleFilter !== "all", state.accountFilter !== null].filter(Boolean).length;
}

/** Anything narrowing the list: the filters, a search, or "Guardados". */
export function hasActiveFilters(state: AppState): boolean {
  return activeFilterCount(state) > 0 || state.query.trim() !== "" || state.savedOnly;
}

export function clearFilters(state: AppState) {
  state.typeFilter = "all";
  state.styleFilter = "all";
  state.accountFilter = null;
  state.query = "";
  state.savedOnly = false;
}

function monthPrefix(month: Date): string {
  return toIsoDate(month).slice(0, 7); // "YYYY-MM"
}

/** Whether the event has a day in the month ("YYYY-MM"): an event over several days may start the month before. */
function inMonth(event: DanceEvent, prefix: string): boolean {
  return event.date.slice(0, 7) <= prefix && lastDay(event).slice(0, 7) >= prefix;
}

/** Events the current view can show before filtering: upcoming ones (until their last day), or the displayed
 * month's (any of their days in it). */
export function eventsInView(events: DanceEvent[], state: AppState): DanceEvent[] {
  if (state.view === "upcoming") {
    const today = todayIso();
    return events.filter((event) => lastDay(event) >= today);
  }
  const prefix = monthPrefix(state.month);
  return events.filter((event) => inMonth(event, prefix));
}

/** The events on screen, in display order: the upcoming list, or the selected calendar day. Swiping in
 * the event viewer follows this order. */
export function visibleEvents(events: DanceEvent[], state: AppState): DanceEvent[] {
  const shown = eventsInView(events, state).filter((event) => matchesFilters(event, state));
  return state.view === "upcoming"
    ? shown
    : shown.filter((event) => event.date <= state.selectedDay && state.selectedDay <= lastDay(event));
}

/** Day to select after moving to another month: today in the current month, else its first event day. */
export function defaultDayForMonth(events: DanceEvent[], month: Date): string {
  const prefix = monthPrefix(month);
  const today = todayIso();
  if (today.startsWith(prefix)) return today;
  const firstDay = events.flatMap(daysOf).filter((day) => day.startsWith(prefix)).sort()[0];
  return firstDay ?? toIsoDate(month);
}

/** The DOM id of a period's section in the upcoming list ("periodo-fin-de-semana"). */
export function sectionId(periodKey: string): string {
  return `periodo-${periodKey}`;
}

export interface AgendaGroup {
  key: string; // stable, for the section's id: "hoy", "fin-de-semana", "2026-11"…
  label: string; // heading: "Este fin de semana"
  shortLabel: string; // jump bar chip: "Finde"
  events: DanceEvent[];
}

/**
 * Upcoming events grouped by period instead of by day, so days with one or two events don't each
 * leave a mostly empty row. Non-overlapping buckets, in the style of calendar "date range" grouping
 * (This week, Next week, Later this month, Next month…), with the weekend split out because it's
 * when most socials happen:
 *
 *   "Hoy"                    today, first: what most visitors want to know (cf. hoy-milonga, Eventbrite)
 *   "Esta semana"            tomorrow … Thursday of this week (only Monday–Wednesday)
 *   "Este fin de semana"     Friday … Sunday of this week (Friday night counts as weekend)
 *   "Próxima semana"         next Monday … Sunday
 *   "Más adelante en <mes>"  the rest of the current month
 *   "<Mes>" / "<Mes> de <año>"  one group per month for the next MONTH_HORIZON months (year shown when
 *                            it's not this year)
 *   "En <año>" / "Más adelante en <año>"  beyond that, one group per year ("Más adelante" when months of
 *                            that year already have their own groups)
 *
 * The far end goes by year, not by month: past the horizon only festivals and congresses are announced,
 * a handful a year. The horizon is relative to today, so in December next January still gets its own
 * group instead of being lumped into next year.
 * Weeks run Monday to Sunday, as in Colombian calendars. "Mañana" is shown on each card.
 * An event over several days that has already started is listed under "Hoy" while it goes on (shownDay).
 * Input must be sorted by date.
 */
/** Months after the current one that get a group each; later events are grouped by year. */
const MONTH_HORIZON = 6;

/** Months from the current one to `date`'s ("2026-10-07" → "2027-01-10": 3). */
function monthsAhead(today: string, date: string): number {
  const months = (iso: string) => Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7));
  return months(date) - months(today);
}

export function groupByPeriod(events: DanceEvent[], today = todayIso()): AgendaGroup[] {
  const thisWeekEnd = endOfWeek(today);
  const weekendStart = addDays(thisWeekEnd, -2); // Friday
  const nextWeekEnd = addDays(thisWeekEnd, 7);
  const currentMonth = today.slice(0, 7);

  const groups = new Map<string, AgendaGroup>();
  for (const event of events) {
    const [key, label, shortLabel] = periodOf(shownDay(event, today));
    const group = groups.get(key) ?? { key, label, shortLabel, events: [] };
    group.events.push(event);
    groups.set(key, group);
  }
  return [...groups.values()];

  function periodOf(date: string): [string, string, string] {
    if (monthsAhead(today, date) > MONTH_HORIZON) {
      const year = date.slice(0, 4);
      // Months of that year already listed (e.g. January to April): this group is the rest of it.
      const afterItsMonths = [...groups.keys()].some((key) => key.startsWith(`${year}-`));
      return afterItsMonths
        ? [`anio-${year}`, `Más adelante en ${year}`, `Resto de ${year}`]
        : [`anio-${year}`, `En ${year}`, year];
    }
    if (date === today) return ["hoy", "Hoy", "Hoy"];
    if (date < weekendStart) return ["esta-semana", "Esta semana", "Esta semana"];
    if (date <= thisWeekEnd) return ["fin-de-semana", "Este fin de semana", "Finde"];
    if (date <= nextWeekEnd) return ["proxima-semana", "Próxima semana", "Próx. semana"];
    const month = formatMonthName(date);
    if (date.startsWith(currentMonth)) return ["resto-del-mes", `Más adelante en ${month}`, `Resto de ${month}`];
    const otherYear = !date.startsWith(today.slice(0, 4));
    return [date.slice(0, 7), capitalize(formatMonthName(date, otherYear)), capitalize(otherYear ? `${month} ${date.slice(0, 4)}` : month)];
  }
}

/** Events grouped by date, keeping the input order (events.json is already sorted). An event over several
 * days is in each of its days. */
export function groupByDay(events: DanceEvent[]): Map<string, DanceEvent[]> {
  const groups = new Map<string, DanceEvent[]>();
  for (const event of events) {
    for (const day of daysOf(event)) groups.set(day, [...(groups.get(day) ?? []), event]);
  }
  return groups;
}
