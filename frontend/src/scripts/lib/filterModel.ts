// The filters' model: every option of the current view (dates, rhythms, types; and whether the bars are hidden), how each
// is chosen, counted against the other filters, and what the bar, its line, the "Filtros" sheet and the toolbar say
// about them. Pure, so it's tested
// (tests/filters.test.ts); views/filters.ts draws it. An option that would show nothing with the other filters is
// dimmed in place, never hidden, so the chips don't move while choosing; a chosen one can always be removed.

import type { AppState, DanceEvent, EventType } from "../types";
import { OTHER_STYLE, TYPE_ORDER, eventCountLabel, formatMonthName, spanLabel, styleLabel, typeLabel } from "./format";
import { todayIso, toIsoDate } from "./dates";
import { type FamilyGroup, groupByFamily } from "./styleFamilies";
import {
  type FilterGroup,
  STYLES_WITH_VARIANTS,
  activeFilterCount,
  dateOptions,
  eventsInView,
  matchesFilters,
  periodDays,
  styleMatches,
  withoutFilters,
} from "../state";

/** The main rhythms: always in the sheet and the Ritmo panel, first in their families, dimmed when there's none. The
 * bar's chips until 8 Oct 2026, when the bar took the types (the owner: the rhythms stay in the Filtros menu). */
export const MAIN_STYLES = ["salsa", "bachata", "urbano", "tango"];

/**
 * The main types (the first in the owner's order): the bar's chips, dimmed, where the view has no event at all (a month
 * without events in the calendar), which left the phone's bar an empty band pinned at the top (the bug-squash pass of 8
 * Oct 2026).
 */
export const MAIN_TYPES: EventType[] = ["social", "party", "workshop"];

export interface FilterOption {
  group: FilterGroup;
  value: string;
  label: string; // its full name: "Este fin de semana", "Otros ritmos", "Taller"
  short: string; // the bar's: "Finde", "Próx. semana" (the same for rhythms and types)
  count: number; // events it would show with the other filters on
  chosen: boolean;
  dimmed: boolean; // nothing to show with the other filters, and not chosen: dimmed in place
}

/** "Ocultar eventos de bares" as a choice in use: its chip's `data-filter` and `data-value` (main.ts toggles it). */
export const HIDE_BARS_FILTER = { group: "bars", value: "ocultar" } as const;

/** A choice in use, as a removable chip and in the line under the bar. */
export interface AppliedFilter {
  group: FilterGroup | typeof HIDE_BARS_FILTER.group;
  value: string;
  label: string; // "Finde", "Salsa", "Social", "Sin bares"
  name: string; // for screen readers: "Este fin de semana"
}

/** Hiding the bars, among the choices in use: last, as "Sin bares". */
export const HIDDEN_BARS: AppliedFilter = {
  ...HIDE_BARS_FILTER,
  label: "Sin bares",
  name: "Sin eventos de bares",
};

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

/** Wide screens: the toolbar's dropdown pills, each opening its panel (views/filterPanels.ts). */
export type PillKey = "when" | "styles" | "types";

export interface FilterPill {
  key: PillKey;
  label: string; // "Ritmo", "Ritmo · 2"; "Cuándo", "Finde", "Hoy +1"
  name: string; // for screen readers, starting with what it shows: "Ritmo, 2 elegidos", "Finde, Cuándo: Este fin de semana"
  count: number; // choices in use in it
}

export interface FilterModel {
  dates: FilterOption[]; // every period with something on (none in the calendar), in order
  styles: FilterOption[]; // the main four first, then most frequent first, "Otros ritmos" last
  styleGroups: FamilyGroup<FilterOption>[]; // the same rhythms under their families (the sheet, the Ritmo panel)
  types: FilterOption[]; // the view's types (and any chosen), in TYPE_ORDER: the bar's chips, the sheet's, the panel's
  when: WhenModel | null; // the bar's "Cuándo" (null in the calendar)
  pills: FilterPill[]; // wide screens: Cuándo (the list, with dates), Tipo, Ritmo
  hideBars: boolean; // "Ocultar eventos de bares" is on (the sheet's switch, the toolbar's chip)
  applied: AppliedFilter[]; // every choice: dates, rhythms, types, and "Sin bares" while the bars are hidden
  active: number; // Filtros' badge (the bar at the bottom): every choice (hiding the bars counts one)
  shown: number; // events the view shows with every filter on (the list, or the calendar's month)
  searched: number; // events the view shows with the search alone, no filter (with none, every event in view)
}

const option = (
  group: FilterGroup,
  value: string,
  label: string,
  short: string,
  count: number,
  chosen: boolean,
): FilterOption => ({ group, value, label, short, count, chosen, dimmed: !chosen && count === 0 });

/** Styles present, plus "Salsa" or "Bachata" whenever one of its variants is present. */
function presentStyles(events: DanceEvent[]): Set<string> {
  const present = new Set(events.flatMap((event) => event.styles));
  for (const parent of STYLES_WITH_VARIANTS) {
    if ([...present].some((style) => style.startsWith(`${parent} `))) present.add(parent);
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
  const without = (group: FilterGroup) => inView.filter((event) => matchesFilters(event, state, group, today));

  // Rhythms in a stable order, so they never jump while filtering: the main four first, then the others by how many
  // events in view have them (not counting the filters), "Otros ritmos" last.
  const withoutStyles = without("styles");
  const styleValues = [
    ...new Set([...MAIN_STYLES, ...rankedStyles(inView).map((item) => item.style), ...state.styles]),
  ].sort((a, b) => Number(a === OTHER_STYLE) - Number(b === OTHER_STYLE));
  const styles = styleValues.map((style) => {
    const count = withoutStyles.filter((event) => event.styles.some((item) => styleMatches(item, style))).length;
    return option("styles", style, styleLabel(style), styleLabel(style), count, state.styles.includes(style));
  });

  // Types in the owner's order, the view's own (before the filters, so none comes or goes while choosing) and any
  // chosen; dimmed in place when the other filters leave none. A view with none at all: the main ones, dimmed.
  const withoutTypes = without("types");
  const typeCount = (type: EventType, list: DanceEvent[]) => list.filter((event) => event.event_type === type).length;
  const present = new Set([...inView.map((event) => event.event_type), ...state.types]);
  if (!present.size) MAIN_TYPES.forEach((type) => present.add(type));
  const types = TYPE_ORDER.filter((type) => present.has(type)).map((type) =>
    option("types", type, typeLabel(type), typeLabel(type), typeCount(type, withoutTypes), state.types.includes(type)),
  );

  const dates =
    state.view === "upcoming"
      ? dateOptions(inView, without("dates"), today, state.query).map((period) =>
          option("dates", period.key, period.label, period.shortLabel, period.count, state.dates.includes(period.key)),
        )
      : [];

  const asApplied = (item: FilterOption): AppliedFilter => ({ group: item.group, value: item.value, label: item.short, name: item.label });
  const applied = [
    ...[...dates, ...styles, ...types].filter((item) => item.chosen).map(asApplied),
    ...(state.hideBars ? [HIDDEN_BARS] : []),
  ];

  const when = state.view === "upcoming" ? whenModel(dates, without("dates").length, today) : null;
  const searchAlone = withoutFilters(state);
  return {
    dates,
    styles,
    styleGroups: groupByFamily(styles),
    types,
    when,
    pills: filterPills(when && dates.length ? when : null, styles, types),
    hideBars: state.hideBars,
    applied,
    active: activeFilterCount(state),
    shown: inView.filter((event) => matchesFilters(event, state, undefined, today)).length,
    searched: inView.filter((event) => matchesFilters(event, searchAlone, undefined, today)).length,
  };
}

const chosenLabel = (count: number) => `${count} ${count === 1 ? "elegido" : "elegidos"}`;

/**
 * The toolbar's pills (wide screens): "Cuándo" (only in the list, with dates to choose) says the date chosen as the
 * phone bar's does; Tipo, then Ritmo (the types first, as in the phone's bar: the owner, 8 Oct 2026), say how many are
 * chosen ("Ritmo · 2", named "Ritmo, 2 elegidos").
 */
export function filterPills(when: WhenModel | null, styles: FilterOption[], types: FilterOption[]): FilterPill[] {
  const counted = (key: PillKey, word: string, options: FilterOption[]): FilterPill => {
    const count = options.filter((item) => item.chosen).length;
    return {
      key,
      label: count ? `${word} · ${count}` : word,
      name: count ? `${word}, ${chosenLabel(count)}` : word,
      count,
    };
  };
  const dates = when ? when.options.filter((item) => item.value && item.chosen).length : 0;
  return [
    ...(when ? [{ key: "when" as const, label: when.chosen ? when.label : "Cuándo", name: whenButtonName(when), count: dates }] : []),
    counted("types", "Tipo", types),
    counted("styles", "Ritmo", styles),
  ];
}

/**
 * The name of the button that opens "Cuándo" (the phone bar's chip, the toolbar's pill), starting with the words it
 * shows (WCAG 2.5.3, label in name: a voice command says what it sees): "Cuándo: Cualquier fecha" with nothing chosen,
 * "Finde, Cuándo: Este fin de semana" with a date.
 */
export function whenButtonName(when: Pick<WhenModel, "label" | "name" | "chosen">): string {
  return when.chosen ? `${when.label}, Cuándo: ${when.name}` : `Cuándo: ${when.name}`;
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

/**
 * The sheet's button: "Ver 12 eventos", "Ver 1 evento", or, disabled, what to change: "Sin eventos: cambia la
 * búsqueda" when the search alone finds nothing (no filter would help: the bug hunt of 7 Oct 2026, the sheet blamed
 * the filters), else "Sin eventos: cambia los filtros".
 */
export function resultsButtonLabel({ shown, searched }: Pick<FilterModel, "shown" | "searched">): string {
  if (shown) return `Ver ${eventCountLabel(shown)}`;
  return searched ? "Sin eventos: cambia los filtros" : "Sin eventos: cambia la búsqueda";
}

/**
 * Whether the search, not the filters, is why a view shows nothing: a search is on, and either no filter is or the
 * search alone finds nothing there either (`searched`: what it finds alone, the model's `searched` or a calendar day's).
 * What an empty list and an empty day of the calendar say (views/filters.ts emptyResultsHtml, views/calendarView.ts
 * emptyDayHtml).
 */
export function searchIsWhy(state: AppState, searched: number): boolean {
  return state.query.trim() !== "" && !(activeFilterCount(state) > 0 && searched > 0);
}

/** Whether a date was chosen that the list no longer has (the day changed while the page was open). */
export function staleDates(model: FilterModel, state: AppState): string[] {
  return state.view === "upcoming" ? state.dates.filter((key) => !model.dates.some((item) => item.value === key)) : [];
}
