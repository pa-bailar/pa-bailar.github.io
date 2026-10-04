// The filters: what's chosen and what can be chosen, and where they're drawn.
//   - Phones, the bar (JumpBar.astro): [⚙ 3] [Noviembre ×] [Hoy] [Mañana] [Finde] [Próx. semana] | [Salsa] [Bachata]
//     [Urbano] [Tango], one row that scrolls sideways. One tap chooses a chip (dark, with ×), another unchooses it.
//     ⚙ opens the "Filtros" sheet with every option; a choice made there that has no chip of its own in the row
//     shows as a removable chip after ⚙ ("Noviembre ×", "Social ×", "@academia ×").
//   - Under the bar, only while filtering: "12 eventos · Finde, Salsa" and "× Limpiar".
//   - The sheet (FilterSheet.astro): every date, rhythm and type with its count, the academy, "Limpiar" and
//     "Ver 12 eventos".
//   - Wide screens: the toolbar's chip rows (dates, types, rhythms) and a status row ("12 eventos · Limpiar
//     filtros", the academy).
// An option that would show nothing with the other filters is dimmed in place, never hidden, so the chips don't
// move while choosing; a chosen one can always be removed. The logic (`filterModel`) is pure and tested.

import type { AppState, DanceEvent, EventType } from "../types";
import { byId, escapeHtml, prefersReducedMotion } from "../lib/dom";
import { OTHER_STYLE, eventCountLabel, formatMonthName, spanLabel, styleLabel, typeLabel } from "../lib/format";
import { todayIso, toIsoDate } from "../lib/dates";
import { ICONS } from "../lib/icons";
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
  group: FilterGroup | "account";
  value: string;
  label: string; // "Finde", "Salsa", "@academia"
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
  label: string; // the chip's: "" (nothing chosen: "📅 ▾"), "Finde", "Finde +1" (several, from the sheet)
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
  applied: AppliedFilter[]; // every choice: dates, rhythms, types, academy
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
  if (state.accountFilter) {
    const name = `@${state.accountFilter}`;
    applied.push({ group: "account", value: state.accountFilter, label: name, name });
  }
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

/**
 * The ways out of an empty result, for what's narrowing it: "Limpiar filtros", "Borrar la búsqueda", "Ver todos,
 * no solo guardados".
 */
export function emptyActionsHtml(state: AppState): string {
  return [
    activeFilterCount(state) ? `<button class="btn" type="button" data-clear-filters>Limpiar filtros</button>` : "",
    state.query.trim() ? `<button class="btn" type="button" data-clear-search>Borrar la búsqueda</button>` : "",
    state.savedOnly ? `<button class="btn" type="button" data-saved-only>Ver todos, no solo guardados</button>` : "",
  ].join("");
}

/** An empty list: what's wrong, a hint, and the ways out. Null when nothing narrows it (there's just nothing). */
export function emptyResultsHtml(state: AppState): string | null {
  const query = state.query.trim();
  const filtering = activeFilterCount(state) > 0;
  const [title, hint] = query
    ? ["No encontramos eventos", `Nada coincide con «${escapeHtml(query)}».`]
    : filtering
      ? ["No hay eventos con estos filtros", "Prueba con otras fechas o ritmos."]
      : state.savedOnly
        ? ["Aún no tienes eventos guardados", "Toca el marcador de un evento para guardarlo aquí."]
        : [null, null];
  if (!title) return null;
  return `
    <div class="empty-state">
      <p class="empty-state__title">${title}</p>
      <p>${hint}</p>
      <div class="empty-state__actions">${emptyActionsHtml(state)}</div>
    </div>`;
}

// ---------- drawing ----------

const X = `<span class="filter-chip__x" aria-hidden="true">${ICONS.close}</span>`;

/**
 * A choice: a toggle button (aria-pressed). `short`: the bar's short name ("Finde", the full one for screen
 * readers); `counts`: the number of events after the name (the sheet). Dimmed: aria-disabled, still focusable.
 */
function chipHtml(item: FilterOption, { short = false, counts = false } = {}): string {
  const label = short ? item.short : item.label;
  const spoken = `${item.label}${counts ? `, ${eventCountLabel(item.count)}` : ""}`;
  const count = counts && !item.chosen ? ` <span class="filter-chip__count" aria-hidden="true">${item.count}</span>` : "";
  return `<button class="chip filter-chip" type="button" data-filter="${item.group}" data-value="${escapeHtml(item.value)}"
    aria-pressed="${item.chosen}"${item.dimmed ? ` aria-disabled="true"` : ""}${spoken !== label ? ` aria-label="${escapeHtml(spoken)}"` : ""}>${escapeHtml(label)}${count}${item.chosen ? X : ""}</button>`;
}

/** A choice made elsewhere (the sheet, a card's academy), as a chip that removes it: "Noviembre ×". */
function removableHtml(item: AppliedFilter): string {
  const data = item.group === "account" ? `data-account=""` : `data-filter="${item.group}" data-value="${escapeHtml(item.value)}"`;
  return `<button class="chip filter-chip is-chosen" type="button" ${data} aria-label="Quitar ${escapeHtml(item.name)}">${escapeHtml(item.label)}${X}</button>`;
}

/** ⚙, first in the bar's row: the sheet, with how many choices are in use on its corner. */
function sheetButtonHtml(active: number): string {
  return `<button class="chip filter-chip filter-chip--icon" type="button" data-open-filters aria-haspopup="dialog"
    aria-label="Todos los filtros${active ? `, ${active} ${active === 1 ? "activo" : "activos"}` : ""}">${ICONS.sliders}${
      active ? `<span class="jump-bar__badge" aria-hidden="true">${active}</span>` : ""
    }</button>`;
}

const FADE = 32; // px: the row fades out at its right edge (jump-bar.css, --space-6)
const choiceKey = (item: AppliedFilter) => `${item.group}:${item.value}`;
let barChoices = new Set<string>(); // the choices the row showed last time

/** Scrolls the row just enough for `chip` to be seen whole (the fade at the right edge doesn't count). */
function revealChip(row: HTMLElement, chip: HTMLElement) {
  const box = chip.getBoundingClientRect();
  const view = row.getBoundingClientRect();
  if (!view.width) return; // wide screens: the row isn't shown
  const delta = box.left < view.left ? box.left - view.left - FADE / 4 : Math.max(box.right - (view.right - FADE), 0);
  if (delta) row.scrollTo({ left: row.scrollLeft + delta, behavior: prefersReducedMotion() ? "auto" : "smooth" });
}

/**
 * The phone bar's row of chips. It keeps where it was scrolled to, unless a new choice would be out of sight
 * (chosen in the sheet, or a chip further along): then the row scrolls to the first one.
 */
function renderBarChips(model: FilterModel, state: AppState) {
  const row = byId("jump-chips");
  const scrolled = row.scrollLeft;
  const when = model.when && model.dates.length ? model.when : null;
  row.innerHTML = [
    sheetButtonHtml(model.active),
    ...model.extra.map(removableHtml),
    when ? whenChipHtml(when) : "",
    when ? `<span class="jump-bar__divider" aria-hidden="true"></span>` : "",
    ...model.quickStyles.map((item) => chipHtml(item, { short: true })),
  ].join("");
  row.scrollLeft = scrolled;
  const fresh = new Set(model.applied.map(choiceKey).filter((key) => !barChoices.has(key)));
  barChoices = new Set(model.applied.map(choiceKey));
  if (!fresh.size) return;
  const chosen = [...row.querySelectorAll<HTMLElement>('[aria-pressed="true"], .is-chosen')].find((chip) => {
    if (chip.classList.contains("when-chip")) return [...fresh].some((key) => key.startsWith("dates:"));
    const key = chip.dataset.account !== undefined ? `account:${state.accountFilter}` : `${chip.dataset.filter}:${chip.dataset.value}`;
    return fresh.has(key);
  });
  if (chosen) revealChip(row, chosen);
}

/**
 * "Cuándo" in the bar: a button that opens its menu ("📅 ▾", or "📅 Finde" once a date is chosen) and, beside it
 * (not inside: two targets), × to take the date away. One piece to the eye: the chosen colors, a line between.
 */
function whenChipHtml(when: WhenModel): string {
  const open = `<button class="chip filter-chip when-chip__open" type="button" id="when-open" data-when-open
    aria-haspopup="menu" aria-expanded="false" aria-controls="when-menu" aria-label="Cuándo: ${escapeHtml(when.name)}">${
      ICONS.calendar
    }${when.chosen ? `<span>${escapeHtml(when.label)}</span>` : `<span class="when-chip__word">Cuándo</span>${ICONS.chevronDown}`}</button>`;
  const clear = when.chosen
    ? `<button class="chip filter-chip when-chip__clear" type="button" data-when-clear
        aria-label="Quitar ${escapeHtml(when.name)}">${ICONS.close}</button>`
    : "";
  return `<span class="when-chip${when.chosen ? " is-chosen" : ""}">${open}${clear}</span>`;
}

/**
 * The "Cuándo" menu (JumpBar.astro's #when-menu, opened by whenMenu.ts): one date at a time, each with its days
 * and how many events. A tap applies it and closes the menu; one with nothing to show is dimmed.
 */
export function whenMenuHtml(when: WhenModel): string {
  const item = (option: WhenOption) => {
    const spoken = `${option.label}${option.hint ? ` (${option.hint})` : ""}, ${eventCountLabel(option.count)}`;
    return `<button class="when-menu__item" type="button" role="menuitemradio" tabindex="-1" data-when="${escapeHtml(option.value)}"
      aria-checked="${option.chosen}"${option.dimmed ? ` aria-disabled="true"` : ""} aria-label="${escapeHtml(spoken)}">
      <span class="when-menu__tick" aria-hidden="true">${option.chosen ? ICONS.check : ""}</span>
      <span class="when-menu__label">${escapeHtml(option.label)}${option.hint ? ` <small>${escapeHtml(option.hint)}</small>` : ""}</span>
      <span class="when-menu__count" aria-hidden="true">${option.count}</span></button>`;
  };
  const [any, ...periods] = when.options;
  return [
    `<p class="when-menu__head" aria-hidden="true">Cuándo</p>`,
    any ? item(any) : "",
    `<div class="when-menu__separator" role="separator"></div>`,
    ...periods.map(item),
  ].join("");
}

/** The menu's content follows the filters, also while it's open (the counts). */
function renderWhenMenu(model: FilterModel) {
  const menu = byId("when-menu");
  if (!model.when) {
    menu.innerHTML = "";
    return;
  }
  const focused = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>("#when-menu [data-when]")?.dataset.when;
  menu.innerHTML = whenMenuHtml(model.when);
  if (focused !== undefined) menu.querySelector<HTMLElement>(`[data-when="${CSS.escape(focused)}"]`)?.focus();
}

/** Under the bar, only while filtering: "12 eventos · Finde, Salsa" and "× Limpiar". */
function renderSummary(model: FilterModel, state: AppState) {
  const line = byId("jump-summary");
  line.hidden = model.active === 0;
  if (line.hidden) return;
  const { count, where, names } = summaryLine(model, state);
  line.innerHTML = `
    <p class="filter-summary__text"><b>${count}</b>${escapeHtml(where)} · ${escapeHtml(names)}</p>
    <button class="filter-summary__clear" type="button" data-clear-filters aria-label="Limpiar filtros">${ICONS.close}Limpiar</button>`;
}

/** The "Filtros" sheet: its groups, "Limpiar" (only with something to clear) and "Ver 12 eventos". */
function renderSheet(model: FilterModel, state: AppState) {
  const group = (title: string, hint: string, items: FilterOption[], label: string) =>
    items.length
      ? `<h3 class="filter-sheet__label">${title}${hint ? ` <small>${hint}</small>` : ""}</h3>
         <div class="filter-sheet__chips" role="group" aria-label="${label}">${items.map((item) => chipHtml(item, { counts: true })).join("")}</div>`
      : "";
  const dates =
    state.view === "upcoming"
      ? group("Fecha", "elige una o varias", model.dates, "Fecha")
      : `<h3 class="filter-sheet__label">Fecha</h3><p class="filter-sheet__note">En el calendario eliges el día en el mes.</p>`;
  const account = model.applied.find((item) => item.group === "account");
  const body = byId("filter-sheet-body");
  const scrolled = body.scrollTop;
  body.innerHTML = [
    dates,
    group("Ritmo", "elige uno o varios", model.styles, "Ritmo"),
    group("Tipo de evento", "", model.types, "Tipo de evento"),
    account
      ? `<h3 class="filter-sheet__label">Academia</h3><div class="filter-sheet__chips">${removableHtml(account)}</div>`
      : "",
  ].join("");
  body.scrollTop = scrolled;
  byId<HTMLButtonElement>("filter-sheet-clear").disabled = model.active === 0;
  const results = byId<HTMLButtonElement>("filter-sheet-results");
  results.textContent = resultsButtonLabel(model.shown);
  results.disabled = model.shown === 0;
}

/** Wide screens: the toolbar's rows (short date names, the full one for screen readers) and the status row. */
function renderToolbar(model: FilterModel, state: AppState) {
  const fill = (row: string, html: string, hidden = false) => {
    const container = byId(row);
    container.innerHTML = html;
    container.hidden = hidden;
  };
  fill("date-filters", model.dates.map((item) => chipHtml(item, { short: true })).join(""), state.view !== "upcoming");
  fill("type-filters", model.types.map((item) => chipHtml(item)).join(""));
  fill("style-filters", model.styles.map((item) => chipHtml(item)).join(""));
  const account = state.accountFilter
    ? `<span>Solo eventos de <b>@${escapeHtml(state.accountFilter)}</b></span>
       <button class="chip" type="button" data-account="">Ver todas las academias</button>`
    : "";
  const { count, where } = summaryLine(model, state);
  const clear = model.active
    ? `<span class="filter-status__count"><b>${count}</b>${escapeHtml(where)}</span>
       <button class="chip filter-chip filter-status__clear" type="button" data-clear-filters>${ICONS.close}Limpiar filtros</button>`
    : "";
  fill("filter-status", `${account}${clear}`, !account && !clear);
}

/** Draws every place the filters show: the phone bar and its line, the sheet, the toolbar. */
export function renderFilters(model: FilterModel, state: AppState) {
  renderBarChips(model, state);
  renderWhenMenu(model);
  renderSummary(model, state);
  renderSheet(model, state);
  renderToolbar(model, state);
}
