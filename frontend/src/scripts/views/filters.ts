// Filter chips for dates, event type and dance style, and the notice of the academy filter (set from a card).
// Rendered into every [data-filter-row] container: the toolbar, and on phones the filter sheet too.
// Rhythms and dates take several choices (an event matches any of them); the type takes one. Only options
// that would show something with the other filters are offered (plus the chosen ones, to unchoose them),
// so a chip never leads to an empty list just because that style only appears in past events.
// The dates (periods of the list, and "Mañana") are the upcoming list's: hidden in the calendar.

import type { AppState, DanceEvent, EventType } from "../types";
import { escapeHtml } from "../lib/dom";
import { capitalize, typeLabel } from "../lib/format";
import { todayIso } from "../lib/dates";
import { type DateOption, STYLE_FAMILIES, dateOptions, eventsInView, matchesFilters, styleMatches } from "../state";

/** `check`: a choice among several (rhythms, dates), marked ✓ when chosen. `name`: the full name for screen
 * readers, when the chip shows a short one ("Finde"). */
function chipHtml(
  attribute: "type" | "style" | "date",
  value: string,
  label: string,
  active: boolean,
  { check = false, name = "" } = {},
): string {
  const ariaLabel = name ? ` aria-label="${escapeHtml(name)}"` : "";
  return `<button class="chip${check ? " chip--check" : ""}" type="button" data-${attribute}="${escapeHtml(value)}" aria-pressed="${active}"${ariaLabel}>${escapeHtml(label)}</button>`;
}

function withSelected<T extends string>(options: T[], selected: T | "all"): T[] {
  return selected === "all" || options.includes(selected) ? options : [...options, selected];
}

/** Styles present, plus the family chip ("Salsa", "Bachata") whenever one of its variants is present. */
function styleOptions(events: DanceEvent[]): string[] {
  const present = new Set(events.flatMap((event) => event.styles));
  for (const family of STYLE_FAMILIES) {
    if ([...present].some((style) => style.startsWith(`${family} `))) present.add(family);
  }
  return [...present].sort((a, b) => a.localeCompare(b, "es"));
}

export interface StyleCount {
  style: string;
  count: number;
}

/**
 * Rhythm options with how many events have them, most frequent first ("salsa" counts its variants).
 * `inView`: the events before any filter (which rhythms exist); `counted`: those passing the other filters
 * (the counts). Rhythms nothing would add are left out, unless chosen.
 */
export function rankedStyles(inView: DanceEvent[], counted = inView, chosen: string[] = []): StyleCount[] {
  return [...new Set([...styleOptions(inView), ...chosen])]
    .map((style) => ({
      style,
      count: counted.filter((event) => event.styles.some((item) => styleMatches(item, style))).length,
    }))
    .filter((option) => option.count > 0 || chosen.includes(option.style))
    .sort((a, b) => b.count - a.count || a.style.localeCompare(b.style, "es"));
}

export interface FilterOptions {
  styles: StyleCount[]; // most frequent first
  styleTotal: number; // events with every rhythm ("Todos los ritmos")
  dates: DateOption[]; // in order; none in the calendar
  dateTotal: number; // events on any date ("Todas las fechas")
}

/** The rhythm and date options of the current view, each counted with the other filters on. */
export function filterOptions(events: DanceEvent[], state: AppState, today = todayIso()): FilterOptions {
  const inView = eventsInView(events, state);
  const withoutStyles = inView.filter((event) => matchesFilters(event, state, "styles"));
  const withoutDates = inView.filter((event) => matchesFilters(event, state, "dates"));
  return {
    styles: rankedStyles(inView, withoutStyles, state.styles),
    styleTotal: withoutStyles.length,
    dates: state.view === "upcoming" ? dateOptions(inView, withoutDates, state.dates, today) : [],
    dateTotal: withoutDates.length,
  };
}

/** The rhythm dropdown's label: "Ritmo", the rhythm ("Salsa"), or how many ("2 ritmos"). */
export function stylesButtonLabel(styles: string[]): string {
  if (styles.length > 1) return `${styles.length} ritmos`;
  return styles[0] ? capitalize(styles[0]) : "Ritmo";
}

/** The date dropdown's label for the chosen periods, in their order: "Finde", "Hoy + finde", "3 fechas".
 * `compact`: two are "2 fechas" too (when both names don't fit the button). */
export function datesButtonLabel(options: DateOption[], dates: string[], compact = false): string {
  const chosen = options.filter((option) => dates.includes(option.key)).map((option) => option.shortLabel);
  const [first, second] = chosen;
  if (!first) return "Fechas";
  if (!second) return first;
  if (chosen.length === 2 && !compact) return `${first} + ${/^\d/.test(second) ? second : second.toLowerCase()}`;
  return `${chosen.length} fechas`;
}

export function renderFilters(events: DanceEvent[], state: AppState, options: FilterOptions) {
  const visible = eventsInView(events, state);
  const types = withSelected([...new Set(visible.map((event) => event.event_type))], state.typeFilter);
  const styles = options.styles.map((option) => option.style).sort((a, b) => a.localeCompare(b, "es"));

  fill(
    "date",
    [
      chipHtml("date", "all", "Todas las fechas", !state.dates.length),
      // The bar's short names ("Finde", "Próx. semana"), so the row fits one line in the toolbar.
      ...options.dates.map((option) =>
        chipHtml("date", option.key, option.shortLabel, state.dates.includes(option.key), {
          check: true,
          name: option.shortLabel === option.label ? "" : option.label,
        }),
      ),
    ].join(""),
    state.view !== "upcoming",
  );

  fill("type", [
    chipHtml("type", "all", "Todo", state.typeFilter === "all"),
    ...types.map((type: EventType) => chipHtml("type", type, typeLabel(type), state.typeFilter === type)),
  ].join(""));

  fill("style", [
    chipHtml("style", "all", "Todos los ritmos", !state.styles.length),
    ...styles.map((style) => chipHtml("style", style, capitalize(style), state.styles.includes(style), { check: true })),
  ].join(""));

  const account = state.accountFilter
    ? `<span>Solo eventos de <b>@${escapeHtml(state.accountFilter)}</b></span>
       <button class="chip" data-account="">Ver todas las academias</button>`
    : "";
  fill("account", account, !state.accountFilter);
}

/** Fills every container of a row; a hidden row hides its heading too (the sheet's "Fechas"). */
function fill(row: "date" | "type" | "style" | "account", html: string, hidden = false) {
  document.querySelectorAll<HTMLElement>(`[data-filter-row="${row}"]`).forEach((container) => {
    container.innerHTML = html;
    container.hidden = hidden;
  });
  document.querySelectorAll<HTMLElement>(`[data-filter-label="${row}"]`).forEach((label) => (label.hidden = hidden));
}
