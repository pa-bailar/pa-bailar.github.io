// UI state and the event filtering that depends on it.

import type { AppState, DanceEvent } from "./types";
import { addDays, currentMonth, daysOf, endOfWeek, lastDay, shownDay, startOn, todayIso, toIsoDate } from "./lib/dates";
import { capitalize, formatMonthName } from "./lib/format";
import { isSaved } from "./lib/saved";
import { matchesQuery } from "./lib/search";

export function createInitialState(): AppState {
  return {
    view: "upcoming",
    types: [],
    styles: [],
    dates: [],
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

/** Any of the rhythms chosen (none chosen: every event). */
export function matchesStyles(event: DanceEvent, styles: string[]): boolean {
  return !styles.length || event.styles.some((style) => styles.some((filter) => styleMatches(style, filter)));
}

/** The date filter applies to the upcoming list only: the calendar has its own days. */
function datesApply(state: AppState): boolean {
  return state.view === "upcoming" && state.dates.length > 0;
}

/** The groups of choices in the filters (the academy is set from a card, the search and Guardados apart). */
export type FilterGroup = "dates" | "styles" | "types";

/**
 * Whether the event passes every filter: AND across them (types, rhythms, dates, academy, Guardados, search),
 * OR within each group of choices. `except` leaves one group out: the options of that group are counted against
 * the others (filterModel, views/filters.ts).
 */
export function matchesFilters(event: DanceEvent, state: AppState, except?: FilterGroup): boolean {
  const typeOk = except === "types" || !state.types.length || state.types.includes(event.event_type);
  const stylesOk = except === "styles" || matchesStyles(event, state.styles);
  const datesOk = except === "dates" || !datesApply(state) || matchesDates(event, state.dates);
  const accountOk = !state.accountFilter || event.account === state.accountFilter;
  const savedOk = !state.savedOnly || isSaved(event.id);
  return typeOk && stylesOk && datesOk && accountOk && savedOk && matchesQuery(event, state.query);
}

/** Every choice in use, for the ⚙ badge: each date (in the list), rhythm and type, and the academy. */
export function activeFilterCount(state: AppState): number {
  const dates = state.view === "upcoming" ? state.dates.length : 0; // the calendar has its own days
  return dates + state.styles.length + state.types.length + (state.accountFilter ? 1 : 0);
}

/** Anything narrowing the list: the filters, a search, or "Guardados". */
export function hasActiveFilters(state: AppState): boolean {
  return activeFilterCount(state) > 0 || state.query.trim() !== "" || state.savedOnly;
}

/** A rhythm or a period chosen again is unchosen; otherwise it's added. */
export function toggled(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

/** "Limpiar": the dates, rhythms, types and academy. Not the search nor "Guardados", which have their own way out. */
export function clearFilters(state: AppState) {
  state.types = [];
  state.styles = [];
  state.dates = [];
  state.accountFilter = null;
}

function monthPrefix(month: Date): string {
  return toIsoDate(month).slice(0, 7); // "YYYY-MM"
}

/** Whether the event is on a day of the month ("YYYY-MM"): an event over several days may start the month before; a
 * series counts only its sessions' days. */
function inMonth(event: DanceEvent, prefix: string): boolean {
  return daysOf(event).some((day) => day.startsWith(prefix));
}

/** The events on one day, by when they start that day (one that began on an earlier day first), else as given. */
function byStartOn(events: DanceEvent[], day: string): DanceEvent[] {
  return events
    .map((event, index) => ({ event, index, key: startOn(event, day) }))
    .sort((a, b) => a.key.localeCompare(b.key) || a.index - b.index)
    .map(({ event }) => event);
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

/** The events on screen, in display order: the upcoming list, or the selected calendar day (a shared link looks
 * for its event here: main.ts, openSharedEvent). */
export function visibleEvents(events: DanceEvent[], state: AppState): DanceEvent[] {
  const shown = eventsInView(events, state).filter((event) => matchesFilters(event, state));
  if (state.view === "upcoming") return listOrder(shown, todayIso(), state.dates);
  return byStartOn(
    shown.filter((event) => daysOf(event).includes(state.selectedDay)),
    state.selectedDay,
  );
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

export interface Period {
  key: string; // stable, for the section's id and the date filter: "hoy", "fin-de-semana", "2026-11"…
  label: string; // heading and filter chip: "Este fin de semana"
  shortLabel: string; // jump bar: "Finde"
}

export interface AgendaGroup extends Period {
  events: DanceEvent[];
}

/** "Mañana" in the date filter. Not a period of the list (tomorrow is in "Esta semana", the weekend or next
 * week): an extra option, shown when something is on tomorrow; chosen, tomorrow gets a group of its own. */
export const TOMORROW = "manana";

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
 * An event over several days that has already started is listed under "Hoy" while it goes on (shownDay); a workshop
 * series under its next session's day, moving to the following one once a session passes.
 * With a date filter, each event is listed on its first day within the chosen periods (listedDay), and
 * "Mañana", when chosen, is a group of its own.
 * Input must be sorted by date.
 */
/** Months after the current one that get a group each; later events are grouped by year. */
const MONTH_HORIZON = 6;

/** Months from the current one to `date`'s ("2026-10-07" → "2027-01-10": 3). */
function monthsAhead(today: string, date: string): number {
  const months = (iso: string) => Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7));
  return months(date) - months(today);
}

/** Names the period of each date, as the list groups them. Dates must come in order: a year's group is
 * "Más adelante en <año>" once months of that year are listed. `tomorrow`: tomorrow is "Mañana". */
function periodNamer(today: string, { tomorrow = false } = {}): (date: string) => Period {
  const thisWeekEnd = endOfWeek(today);
  const weekendStart = addDays(thisWeekEnd, -2); // Friday
  const nextWeekEnd = addDays(thisWeekEnd, 7);
  const currentMonth = today.slice(0, 7);
  const nextDay = addDays(today, 1);
  const named = new Set<string>();

  return (date) => {
    const [key, label, shortLabel] = periodOf(date);
    named.add(key);
    return { key, label, shortLabel };
  };

  function periodOf(date: string): [string, string, string] {
    if (monthsAhead(today, date) > MONTH_HORIZON) {
      const year = date.slice(0, 4);
      // Months of that year already listed (e.g. January to April): this group is the rest of it.
      const afterItsMonths = [...named].some((key) => key.startsWith(`${year}-`));
      return afterItsMonths
        ? [`anio-${year}`, `Más adelante en ${year}`, `Resto de ${year}`]
        : [`anio-${year}`, `En ${year}`, year];
    }
    if (date === today) return ["hoy", "Hoy", "Hoy"];
    if (tomorrow && date === nextDay) return [TOMORROW, "Mañana", "Mañana"];
    if (date < weekendStart) return ["esta-semana", "Esta semana", "Esta semana"];
    if (date <= thisWeekEnd) return ["fin-de-semana", "Este fin de semana", "Finde"];
    if (date <= nextWeekEnd) return ["proxima-semana", "Próxima semana", "Próx. semana"];
    const month = formatMonthName(date);
    if (date.startsWith(currentMonth)) return ["resto-del-mes", `Más adelante en ${month}`, `Resto de ${month}`];
    const otherYear = !date.startsWith(today.slice(0, 4));
    return [date.slice(0, 7), capitalize(formatMonthName(date, otherYear)), capitalize(otherYear ? `${month} ${date.slice(0, 4)}` : month)];
  }
}

/**
 * The days a near period covers from today, for the "Cuándo" menu's hint ("10–11 oct"): "hoy", "manana", "esta-semana",
 * "fin-de-semana", "proxima-semana" and "resto-del-mes". Null for a month or a year: its name says it.
 */
export function periodDays(key: string, today = todayIso()): [string, string] | null {
  const tomorrow = addDays(today, 1);
  const thisWeekEnd = endOfWeek(today);
  const weekendStart = addDays(thisWeekEnd, -2); // Friday
  const nextWeekEnd = addDays(thisWeekEnd, 7);
  const later = (a: string, b: string) => (a > b ? a : b);
  const monthEnd = (() => {
    const [year, month] = today.split("-").map(Number) as [number, number];
    return toIsoDate(new Date(year, month, 0)); // day 0 of the next month: the last of this one
  })();
  switch (key) {
    case "hoy":
      return [today, today];
    case TOMORROW:
      return [tomorrow, tomorrow];
    case "esta-semana":
      return [tomorrow, addDays(weekendStart, -1)];
    case "fin-de-semana":
      return [later(weekendStart, tomorrow), thisWeekEnd];
    case "proxima-semana":
      return [addDays(thisWeekEnd, 1), nextWeekEnd];
    case "resto-del-mes":
      return [later(addDays(nextWeekEnd, 1), tomorrow), monthEnd];
    default:
      return null;
  }
}

/** The days the event is on from today: an event over several days counts in every period it runs through, a series in
 * every period with a session to come. */
function daysFrom(event: DanceEvent, today: string): string[] {
  return daysOf(event).filter((day) => day >= today);
}

/** The first day (from today) the event is on within the chosen periods, or null if it's on during none. */
function dayInPeriods(event: DanceEvent, dates: string[], today: string): string | null {
  const keyOf = periodNamer(today);
  const tomorrow = addDays(today, 1);
  const inChosen = (day: string) => (dates.includes(TOMORROW) && day === tomorrow) || dates.includes(keyOf(day).key);
  return daysFrom(event, today).find(inChosen) ?? null;
}

/** Whether the event is on during any of the chosen periods (none chosen: every event). */
export function matchesDates(event: DanceEvent, dates: string[], today = todayIso()): boolean {
  return !dates.length || dayInPeriods(event, dates, today) !== null;
}

/** The day the list shows the event under: shownDay, or with a date filter its first day in the chosen periods
 * (a festival from Sunday to Tuesday, with only "Próxima semana" chosen, is listed on Monday). */
export function listedDay(event: DanceEvent, dates: string[] = [], today = todayIso()): string {
  const day = dates.length ? dayInPeriods(event, dates, today) : null;
  return day ?? shownDay(event, today);
}

/**
 * The upcoming list's order: by the day each event is listed on, then its start time that day. Events come sorted by
 * date and time (events.json), which this keeps for every event listed on its own date; it moves a series to its next
 * session, among that day's events.
 */
export function listOrder(events: DanceEvent[], today = todayIso(), dates: string[] = []): DanceEvent[] {
  return events
    .map((event, index) => {
      const day = listedDay(event, dates, today);
      return { event, index, key: `${day} ${startOn(event, day)}` };
    })
    .sort((a, b) => a.key.localeCompare(b.key) || a.index - b.index)
    .map(({ event }) => event);
}

export function groupByPeriod(events: DanceEvent[], today = todayIso(), dates: string[] = []): AgendaGroup[] {
  const periodOf = periodNamer(today, { tomorrow: dates.includes(TOMORROW) });
  const groups = new Map<string, AgendaGroup>();
  for (const event of listOrder(events, today, dates)) {
    const period = periodOf(listedDay(event, dates, today));
    const group = groups.get(period.key) ?? { ...period, events: [] };
    group.events.push(event);
    groups.set(period.key, group);
  }
  return [...groups.values()];
}

export interface DateOption extends Period {
  count: number; // events on during it, with the other filters
}

/**
 * The date filter's options, in order: every period with an upcoming event on (from today), with "Mañana"
 * after "Hoy" when something is on tomorrow. `upcoming`: the upcoming events before any filter (which periods
 * exist); `counted`: those passing the other filters (each option's count). An option nothing would add stays,
 * with 0: the filters dim it in place, so the chips never move.
 */
export function dateOptions(upcoming: DanceEvent[], counted: DanceEvent[], today = todayIso()): DateOption[] {
  const days = [...new Set(upcoming.flatMap((event) => daysFrom(event, today)))].sort();
  const periodOf = periodNamer(today);
  const periods = new Map<string, Period>();
  for (const day of days) {
    const period = periodOf(day);
    if (!periods.has(period.key)) periods.set(period.key, period);
  }
  const options = [...periods.values()];
  if (days.includes(addDays(today, 1))) {
    options.splice(periods.has("hoy") ? 1 : 0, 0, { key: TOMORROW, label: "Mañana", shortLabel: "Mañana" });
  }
  return options.map((period) => ({ ...period, count: counted.filter((event) => matchesDates(event, [period.key], today)).length }));
}

/** Events grouped by date, each day's by start time (events.json is already sorted, so mostly its order). An event
 * over several days is in each of its days; a series in each of its sessions' days. */
export function groupByDay(events: DanceEvent[]): Map<string, DanceEvent[]> {
  const groups = new Map<string, DanceEvent[]>();
  for (const event of events) {
    for (const day of daysOf(event)) groups.set(day, [...(groups.get(day) ?? []), event]);
  }
  for (const [day, dayEvents] of groups) groups.set(day, byStartOn(dayEvents, day));
  return groups;
}
