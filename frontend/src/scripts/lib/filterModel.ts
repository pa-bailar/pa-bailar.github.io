// The filters' model: every option of the current view (dates, rhythms, types), how each is chosen, counted against the
// other filters, and what the bar, its line, the "Filtros" sheet and the toolbar say about them. Pure, so it's tested
// (tests/filters.test.ts); views/filters.ts draws it. An option that would show nothing with the other filters is
// dimmed in place, never hidden, so the chips don't move while choosing; a chosen one can always be removed.

import type { AppState, DanceEvent, EventType } from "../types";
import { OTHER_STYLE, eventCountLabel, formatMonthName, spanLabel, styleLabel, typeLabel } from "./format";
import { todayIso, toIsoDate } from "./dates";
import {
  type FilterGroup,
  STYLE_FAMILIES,
  activeFilterCount,
  dateOptions,
  eventsInView,
  matchesFilters,
  periodDays,
  styleMatches,
} from "../state";

/** The rhythm chips in the bar: always these four, in this order (the owner's choice), dimmed when there's none. */
export const QUICK_STYLES = ["salsa", "bachata", "urbano", "tango"];

export interface FilterOption {
  group: FilterGroup;
  value: string;
  label: string; // its full name: "Este fin de semana", "Otros ritmos", "Taller"
  short: string; // the bar's: "Finde", "Próx. semana" (the same for rhythms and types)
  count: number; // events it would show with the other filters on
  chosen: boolean;
  dimmed: boolean; // nothing to show with the other filters, and not chosen: dimmed in place
}

/** A choice in use, as a removable chip and in the line under the bar. */
export interface AppliedFilter {
  group: FilterGroup;
  value: string;
  label: string; // "Finde", "Salsa", "Social"
  name: string; // for screen readers: "Este fin de semana"
}

/** An option of the bar's "Cuándo" menu: one date at a time. */
export interface WhenOption {
  value: string; // "" is "Cualquier fecha"
  label: string; // "Este fin de semana"
  hint: string; // the days it covers: "9–11 oct" (none for a month or a year)
  count: number; // events it would show with the other filters on
  chosen: boolean;
  dimmed: boolean;
}

/** The bar's "Cuándo": its chip and its menu (list only; the calendar has its own days). */
export interface WhenModel {
  label: string; // the chip's: "" (nothing chosen: "🕒 ▾"), "Finde", "Finde +1" (several, from the sheet)
  name: string; // for screen readers: "Cualquier fecha", "Este fin de semana", "Este fin de semana y Noviembre"
  chosen: boolean;
  options: WhenOption[]; // "Cualquier fecha", then every period with something on
}

export interface FilterModel {
  dates: FilterOption[]; // every period with something on (none in the calendar), in order
  styles: FilterOption[]; // most frequent first, "Otros ritmos" last
  types: FilterOption[]; // most frequent first
  when: WhenModel | null; // the bar's "Cuándo" (null in the calendar)
  quickStyles: FilterOption[]; // the bar's rhythm chips
  applied: AppliedFilter[]; // every choice: dates, rhythms, types
  extra: AppliedFilter[]; // those without a chip of their own in the bar
  active: number; // ⚙'s badge: every choice
  shown: number; // events the view shows with every filter on (the list, or the calendar's month)
}

const option = (
  group: FilterGroup,
  value: string,
  label: string,
  short: string,
  count: number,
  chosen: boolean,
): FilterOption => ({ group, value, label, short, count, chosen, dimmed: !chosen && count === 0 });

/** Styles present, plus the family ("Salsa", "Bachata") whenever one of its variants is present. */
function presentStyles(events: DanceEvent[]): Set<string> {
  const present = new Set(events.flatMap((event) => event.styles));
  for (const family of STYLE_FAMILIES) {
    if ([...present].some((style) => style.startsWith(`${family} `))) present.add(family);
  }
  return present;
}

export interface StyleCount {
  style: string;
  count: number;
}

/** Rhythms with how many of `events` have them ("salsa" counts its variants), most frequent first. */
export function rankedStyles(events: DanceEvent[]): StyleCount[] {
  return [...presentStyles(events)]
    .map((style) => ({ style, count: events.filter((event) => event.styles.some((item) => styleMatches(item, style))).length }))
    .sort((a, b) => b.count - a.count || a.style.localeCompare(b.style, "es"));
}

/** Every option of the current view and how each is chosen, counted against the other filters. */
export function filterModel(events: DanceEvent[], state: AppState, today = todayIso()): FilterModel {
  const inView = eventsInView(events, state);
  const without = (group: FilterGroup) => inView.filter((event) => matchesFilters(event, state, group));

  // Rhythms in a stable order, so they never jump while filtering: the bar's four first, then the others by how
  // many events in view have them (not counting the filters), "Otros ritmos" last.
  const withoutStyles = without("styles");
  const styleValues = [
    ...new Set([...QUICK_STYLES, ...rankedStyles(inView).map((item) => item.style), ...state.styles]),
  ].sort((a, b) => Number(a === OTHER_STYLE) - Number(b === OTHER_STYLE));
  const styles = styleValues.map((style) => {
    const count = withoutStyles.filter((event) => event.styles.some((item) => styleMatches(item, style))).length;
    return option("styles", style, styleLabel(style), styleLabel(style), count, state.styles.includes(style));
  });

  const withoutTypes = without("types");
  const typeCount = (type: EventType, list: DanceEvent[]) => list.filter((event) => event.event_type === type).length;
  const types = [...new Set([...inView.map((event) => event.event_type), ...state.types])]
    .sort((a, b) => typeCount(b, inView) - typeCount(a, inView) || typeLabel(a).localeCompare(typeLabel(b), "es"))
    .map((type) => option("types", type, typeLabel(type), typeLabel(type), typeCount(type, withoutTypes), state.types.includes(type)));

  const dates =
    state.view === "upcoming"
      ? dateOptions(inView, without("dates"), today).map((period) =>
          option("dates", period.key, period.label, period.shortLabel, period.count, state.dates.includes(period.key)),
        )
      : [];

  const quickStyles = QUICK_STYLES.flatMap((style) => styles.filter((item) => item.value === style));

  const asApplied = (item: FilterOption): AppliedFilter => ({ group: item.group, value: item.value, label: item.short, name: item.label });
  const applied = [...dates, ...styles, ...types].filter((item) => item.chosen).map(asApplied);
  // Every date shows on "Cuándo", every bar rhythm on its chip.
  const hasChip = (item: AppliedFilter) => item.group === "dates" || (item.group === "styles" && QUICK_STYLES.includes(item.value));

  return {
    dates,
    styles,
    types,
    when: state.view === "upcoming" ? whenModel(dates, without("dates").length, today) : null,
    quickStyles,
    applied,
    extra: applied.filter((item) => !hasChip(item)),
    active: activeFilterCount(state),
    shown: inView.filter((event) => matchesFilters(event, state)).length,
  };
}

/** "Cuándo": the chip says what's chosen; the menu lists "Cualquier fecha" and every period, with its days. */
export function whenModel(dates: FilterOption[], anyCount: number, today = todayIso()): WhenModel {
  const chosen = dates.filter((item) => item.chosen);
  const [first] = chosen;
  const hint = (key: string) => {
    const days = periodDays(key, today);
    return days ? spanLabel(...days) : "";
  };
  return {
    label: first ? `${first.short}${chosen.length > 1 ? ` +${chosen.length - 1}` : ""}` : "",
    name: first ? chosen.map((item) => item.label).join(" y ") : "Cualquier fecha",
    chosen: Boolean(first),
    options: [
      { value: "", label: "Cualquier fecha", hint: "", count: anyCount, chosen: !first, dimmed: false },
      ...dates.map((item) => ({
        value: item.value,
        label: item.label.startsWith("Más adelante") ? item.short : item.label, // "Resto de octubre": one line
        hint: hint(item.value),
        count: item.count,
        chosen: item.chosen,
        dimmed: item.dimmed,
      })),
    ],
  };
}

/**
 * The line under the bar: "12 eventos" (in the calendar "5 eventos en octubre") and what's chosen, "Finde, Salsa".
 */
export function summaryLine(model: FilterModel, state: AppState): { count: string; where: string; names: string } {
  return {
    count: eventCountLabel(model.shown),
    where: state.view === "calendar" ? ` en ${formatMonthName(toIsoDate(state.month))}` : "",
    names: model.applied.map((item) => item.label).join(", "),
  };
}

/** The sheet's button: "Ver 12 eventos", "Ver 1 evento", or "Sin eventos: cambia los filtros" (disabled). */
export function resultsButtonLabel(shown: number): string {
  return shown ? `Ver ${eventCountLabel(shown)}` : "Sin eventos: cambia los filtros";
}

/** Whether a date was chosen that the list no longer has (the day changed while the page was open). */
export function staleDates(model: FilterModel, state: AppState): string[] {
  return state.view === "upcoming" ? state.dates.filter((key) => !model.dates.some((item) => item.value === key)) : [];
}
