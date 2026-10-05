// The filters: what's chosen and what can be chosen, and where they're drawn.
//   - Phones, the bar (JumpBar.astro), pinned to the top: [⚙ 3] [Social ×] [🕒 ▾] | [Salsa] [Bachata] [Urbano] [Tango],
//     one row that scrolls sideways. "🕒 ▾" ("Cuándo") opens a short menu with one choice of date (whenMenu.ts);
//     once chosen it reads "🕒 Finde" with its own × beside it. A rhythm chip is chosen with one tap (dark, with ×),
//     unchosen with another. ⚙ opens the "Filtros" sheet with every option (several dates too); a choice made
//     there that has no chip of its own in the row shows as a removable chip after ⚙ ("Social ×").
//   - Under the bar, only while filtering: "12 eventos · Finde, Salsa" and "× Limpiar".
//   - The sheet (FilterSheet.astro): every date, rhythm and type with its count, "Limpiar" and
//     "Ver 12 eventos".
//   - Wide screens: the toolbar's chip rows (dates, types, rhythms) and a status row ("12 eventos · Limpiar
//     filtros").
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
  type WhenModel,
  resultsButtonLabel,
  summaryLine,
} from "../lib/filterModel";
import { activeFilterCount } from "../state";
import { renderWhenMenu } from "./whenMenu";
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
function renderBarChips(model: FilterModel) {
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
    return fresh.has(`${chip.dataset.filter}:${chip.dataset.value}`);
  });
  if (chosen) revealChip(row, chosen);
}

/**
 * "Cuándo" in the bar: a button that opens its menu ("🕒 ▾", or "🕒 Finde" once a date is chosen; a clock, so it
 * doesn't look like the floating calendar button) and, beside it
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
    dates,
    group("Ritmo", "elige uno o varios", model.styles, "Ritmo"),
    group("Tipo de evento", "", model.types, "Tipo de evento"),
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
  const { count, where } = summaryLine(model, state);
  const clear = model.active
    ? `<span class="filter-status__count"><b>${count}</b>${escapeHtml(where)}</span>
       <button class="chip filter-chip filter-status__clear" type="button" data-clear-filters>${ICONS.close}Limpiar filtros</button>`
    : "";
  fill("filter-status", clear, !clear);
}

/** Draws every place the filters show: the phone bar and its line, the sheet, the toolbar. */
export function renderFilters(model: FilterModel, state: AppState) {
  renderBarChips(model);
  renderWhenMenu(model.when);
  renderSummary(model, state);
  renderSheet(model, state);
  renderToolbar(model, state);
}
