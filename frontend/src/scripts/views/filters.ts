// The filters: what's chosen and what can be chosen, and where they're drawn.
//   - Phones, the bar (JumpBar.astro), pinned to the top: [Social ×] [Sin bares ×] [🕒 ▾] | [Salsa] [Bachata] [Urbano] [Tango],
//     one row that scrolls sideways. "🕒 ▾" ("Cuándo") opens a short menu with one choice of date (whenMenu.ts);
//     once chosen it reads "🕒 Finde" with its own × beside it. A rhythm chip is chosen with one tap (dark, with ×),
//     unchosen with another. A choice made in the "Filtros" sheet (Filtros in the bar at the bottom, BottomNav.astro,
//     with the number of choices in use) that has no chip of its own in the row shows first, as a removable chip
//     ("Social ×", "Sin bares ×").
//   - Under the bar, only while filtering: "12 eventos · Finde, Salsa" and "× Limpiar".
//   - The sheet (FilterSheet.astro): the switch "Ocultar eventos de bares" first (remembered; while on, "Sin bares ×"
//     in the row), every date, rhythm (under its family: Salsa, Bachata, Urbanos, Otros) and type with its count,
//     "Limpiar" and "Ver 12 eventos".
//   - Wide screens (ViewToolbar.astro): one row of dropdown pills, [🕒 Cuándo ▾] (the list only) [Ritmo · 2 ▾] [Tipo ▾],
//     and the toggle chip "Ocultar bares"; each pill opens its panel (filterPanels.ts): Cuándo's menu, the rhythms
//     under their families, the types. Under the row, while filtering: "12 eventos", every choice as a removable chip
//     ("Finde ×", "Salsa ×", "Sin bares ×") and "× Limpiar".
// What each shows, and how options are counted and dimmed, is the model (lib/filterModel.ts, pure and tested); the
// "Cuándo" menu draws itself (whenMenu.ts).

import type { AppState } from "../types";
import { byId, escapeHtml, prefersReducedMotion } from "../lib/dom";
import { eventCountLabel } from "../lib/format";
import { ICONS } from "../lib/icons";
import {
  type AppliedFilter,
  type FilterModel,
  type FilterOption,
  type FilterPill,
  type PillKey,
  type WhenModel,
  HIDE_BARS_FILTER,
  resultsButtonLabel,
  summaryLine,
} from "../lib/filterModel";
import type { FamilyGroup } from "../lib/styleFamilies";
import { activeFilterCount } from "../state";
import { openPanelKey, panelId } from "./filterPanels";
import { renderWhenMenu, whenMenuHtml } from "./whenMenu";
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

/** A choice made elsewhere (the sheet), as a chip that removes it: "Social ×". */
function removableHtml(item: AppliedFilter): string {
  const data = `data-filter="${item.group}" data-value="${escapeHtml(item.value)}"`;
  const name = item.removeName ?? `Quitar ${item.name}`;
  return `<button class="chip filter-chip is-chosen" type="button" ${data} aria-label="${escapeHtml(name)}">${escapeHtml(item.label)}${X}</button>`;
}

const BARS_DATA = `data-filter="${HIDE_BARS_FILTER.group}" data-value="${HIDE_BARS_FILTER.value}"`;

/**
 * The sheet's "Ocultar eventos de bares": a switch (role="switch", aria-checked), its words on the left and the track on
 * the right, the hint under the name. Off by default; main.ts toggles it and remembers it.
 */
export function barsSwitchHtml(on: boolean): string {
  return `<button class="filter-switch" type="button" role="switch" aria-checked="${on}" ${BARS_DATA}
    aria-labelledby="filter-bars-name" aria-describedby="filter-bars-hint">
      <span class="filter-switch__text">
        <span class="filter-switch__name" id="filter-bars-name">Ocultar eventos de bares</span>
        <span class="visually-hidden" id="filter-bars-hint">Noches especiales de bares y discotecas: orquestas, invitados, fiestas.</span>
      </span>
      <span class="filter-switch__track" aria-hidden="true"><span class="filter-switch__thumb"></span></span>
    </button>`;
}

/** Wide screens: the same choice as a toggle chip at the end of the pills' row, "Ocultar bares" (with × while on). */
export function barsChipHtml(on: boolean): string {
  return `<button class="chip filter-chip filter-chip--bars" type="button" ${BARS_DATA} aria-pressed="${on}"
    aria-label="Ocultar eventos de bares">Ocultar bares${on ? X : ""}</button>`;
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
function renderBarChips(model: FilterModel) {
  const row = byId("jump-chips");
  const scrolled = row.scrollLeft;
  const when = model.when && model.dates.length ? model.when : null;
  row.innerHTML = [
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
    return fresh.has(`${chip.dataset.filter}:${chip.dataset.value}`);
  });
  if (chosen) revealChip(row, chosen);
}

/**
 * "Cuándo" in the bar: a button that opens its menu ("🕒 ▾", or "🕒 Finde" once a date is chosen; a clock, so it
 * doesn't look like the calendar in the bar at the bottom) and, beside it
 * (not inside: two targets), × to take the date away. One piece to the eye: the chosen colors, a line between.
 */
function whenChipHtml(when: WhenModel): string {
  const open = `<button class="chip filter-chip when-chip__open" type="button" id="when-open" data-when-open
    aria-haspopup="menu" aria-expanded="false" aria-controls="when-menu" aria-label="Cuándo: ${escapeHtml(when.name)}">${
      ICONS.clock
    }${when.chosen ? `<span>${escapeHtml(when.label)}</span>` : `<span class="when-chip__word">Cuándo</span>${ICONS.chevronDown}`}</button>`;
  const clear = when.chosen
    ? `<button class="chip filter-chip when-chip__clear" type="button" data-when-clear
        aria-label="Quitar ${escapeHtml(when.name)}">${ICONS.close}</button>`
    : "";
  return `<span class="when-chip${when.chosen ? " is-chosen" : ""}">${open}${clear}</span>`;
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
  const body = byId("filter-sheet-body");
  const scrolled = body.scrollTop;
  body.innerHTML = [
    `<div class="filter-sheet__switch">${barsSwitchHtml(model.hideBars)}</div>`,
    dates,
    model.styles.length
      ? `<h3 class="filter-sheet__label">Ritmo <small>elige uno o varios</small></h3>${familiesHtml(model.styleGroups, "sheet")}`
      : "",
    group("Tipo de evento", "", model.types, "Tipo de evento"),
  ].join("");
  body.scrollTop = scrolled;
  byId<HTMLButtonElement>("filter-sheet-clear").disabled = model.active === 0;
  const results = byId<HTMLButtonElement>("filter-sheet-results");
  results.textContent = resultsButtonLabel(model.shown);
  results.disabled = model.shown === 0;
}

/**
 * The rhythms under their families, a small heading over each family's chips (with their counts): the sheet's Ritmo
 * and the toolbar's Ritmo panel. `scope` keeps the headings' ids apart ("sheet", "panel").
 */
export function familiesHtml(groups: FamilyGroup<FilterOption>[], scope: string): string {
  return groups
    .map(({ family, items }) => {
      const id = `${scope}-family-${family.key}`;
      return `<div class="filter-family" role="group" aria-labelledby="${id}">
        <p class="filter-family__name" id="${id}">${escapeHtml(family.label)}</p>
        <div class="filter-family__chips">${items.map((item) => chipHtml(item, { counts: true })).join("")}</div>
      </div>`;
    })
    .join("");
}

const POPUP: Record<PillKey, string> = { when: "menu", styles: "dialog", types: "dialog" };

/**
 * A pill of the toolbar (wide screens): "Ritmo ▾", "Ritmo · 2 ▾" in the selected-chip colors while something in it is
 * chosen; Cuándo with its clock. A button that opens its panel (`aria-haspopup`, `aria-expanded`, `aria-controls`),
 * named with what's chosen ("Ritmo, 2 elegidos").
 */
export function pillHtml(pill: FilterPill, open: boolean): string {
  const chosen = pill.count > 0;
  return `<button class="chip filter-pill${chosen ? " is-chosen" : ""}" type="button" id="pill-${pill.key}" data-pill="${pill.key}"
    aria-haspopup="${POPUP[pill.key]}" aria-expanded="${open}" aria-controls="${panelId(pill.key)}"
    aria-label="${escapeHtml(pill.name)}">${pill.key === "when" ? ICONS.clock : ""}<span>${escapeHtml(pill.label)}</span>${
      ICONS.chevronDown
    }</button>`;
}

/** The pills' row: Cuándo (the list), Ritmo, Tipo, then "Ocultar bares" set a little apart. */
export function pillsRowHtml(model: FilterModel, open: PillKey | null): string {
  return [...model.pills.map((pill) => pillHtml(pill, open === pill.key)), barsChipHtml(model.hideBars)].join("");
}

/** A panel's content: Ritmo (its families) and Tipo (its chips), each option with its count; Cuándo is its menu. */
export function panelHtml(key: PillKey, model: FilterModel): string {
  if (key === "when") return model.when ? whenMenuHtml(model.when) : "";
  const head = (title: string) =>
    `<p class="pill-panel__head" aria-hidden="true">${title} <small>elige uno o varios</small></p>`;
  if (key === "styles") return `${head("Ritmo")}${familiesHtml(model.styleGroups, "panel")}`;
  return `${head("Tipo de evento")}<div class="filter-family__chips">${model.types.map((item) => chipHtml(item, { counts: true })).join("")}</div>`;
}

/**
 * Under the pills, only while filtering: "12 eventos" (in the calendar "5 eventos en octubre"), every choice as a
 * removable chip ("Finde ×", "Salsa ×", "Social ×") and "× Limpiar". Not the bars: their "Ocultar bares" pill already
 * shows it's on, and turns it off (the owner, 5 Oct 2026).
 */
export function statusHtml(model: FilterModel, state: AppState): string {
  if (!model.active) return "";
  const { count, where } = summaryLine(model, state);
  const chips = model.applied.filter((item) => item.group !== HIDE_BARS_FILTER.group);
  return `<p class="filter-status__count"><b>${count}</b>${escapeHtml(where)}</p>
    ${chips.map(removableHtml).join("")}
    <button class="filter-summary__clear filter-status__clear" type="button" data-clear-filters aria-label="Limpiar filtros">${ICONS.close}Limpiar</button>`;
}

/** Wide screens: the pills, their panels' content (also while one is open: the counts follow) and the status row. */
function renderToolbar(model: FilterModel, state: AppState) {
  const open = openPanelKey();
  byId("filter-pills").innerHTML = pillsRowHtml(model, open);
  for (const key of ["when", "styles", "types"] as const) {
    const panel = byId(panelId(key));
    const scrolled = panel.scrollTop;
    panel.innerHTML = panelHtml(key, model);
    panel.scrollTop = scrolled;
  }
  const status = byId("filter-status");
  status.innerHTML = statusHtml(model, state);
  status.hidden = !model.active;
}

/** Draws every place the filters show: the phone bar and its line, the sheet, the toolbar. */
export function renderFilters(model: FilterModel, state: AppState) {
  renderBarChips(model);
  renderWhenMenu(model.when);
  renderSummary(model, state);
  renderSheet(model, state);
  renderToolbar(model, state);
}
