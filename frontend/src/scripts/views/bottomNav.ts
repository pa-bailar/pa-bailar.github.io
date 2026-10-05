// Phones only (CSS hides it where the toolbar is sticky): the bar at the bottom of the screen, like Instagram's
// (components/BottomNav.astro): Eventos · Calendario · Buscar · Guardados · Filtros.
//   - Eventos and Calendario are links to the views' addresses; main.ts moves between them with viewNavigation.ts
//     (the same rules the tabs and the old floating button had). The view on screen is aria-current="page".
//   - Guardados (data-saved-only) and Filtros (data-open-filters, the "Filtros" sheet) are handled by main.ts;
//     Filtros carries the number of choices in use (filterModel's `active`, "Sin bares" included).
//   - Buscar turns the bar into the search field, docked at the bottom above the keyboard (the visualViewport's
//     numbers, keyboardInset), with × to close it. Typing filters the view on screen (main.ts). It has a history
//     entry of its own, an overlay like the sheets: back closes it, as × does (both clear the search). The
//     keyboard's "Buscar" (Enter) closes the keyboard and the field, keeping the search: Buscar then shows it's on.
// Sheets and the details drawer are modal dialogs, in the browser's top layer: they cover the bar, nothing to hide.

import type { View } from "../types";
import { byId } from "../lib/dom";
import { historyState, overlayState } from "../screenHistory";

/** Filtros' name for screen readers, with its badge's number: "Filtros, 2 activos". */
export function filtersLabel(active: number): string {
  return active ? `Filtros, ${active} ${active === 1 ? "activo" : "activos"}` : "Filtros";
}

/** Buscar's name: with a search on, what it's looking for. */
export function searchLabel(query: string): string {
  const text = query.trim();
  return text ? `Buscar: «${text}»` : "Buscar";
}

/** What the bar shows: the view on screen, and whether Guardados and Buscar are on. */
export interface NavState {
  view: View;
  savedOnly: boolean;
  query: string;
  active: number; // filters in use (the badge)
}

/** The items' states, from the app's state (pure, tested). */
export function navItems({ view, savedOnly, query, active }: NavState) {
  return {
    current: view,
    saved: savedOnly,
    searching: query.trim() !== "",
    badge: active ? String(active) : "",
    filtersLabel: filtersLabel(active),
    searchLabel: searchLabel(query),
  };
}

/**
 * How far the bar must rise to sit right above the on-screen keyboard: the bottom of the layout viewport (where a
 * fixed bar sits) minus the bottom of the visual viewport (what's left above the keyboard). iOS keeps the layout
 * viewport under the keyboard and pans the visual one (`offsetTop`); Chrome on Android shrinks the visual one too.
 * Never below 0: when the toolbars collapse the visual viewport is taller, and iOS sometimes leaves a stale
 * `offsetTop` once the keyboard is gone (then the visual viewport is full height again, and this comes out ≤ 0).
 * No visualViewport (old browsers): 0, and the browser does what it does.
 */
export function keyboardInset(layoutHeight: number, viewport: { height: number; offsetTop: number } | null | undefined): number {
  if (!viewport) return 0;
  const inset = Math.round(layoutHeight - viewport.height - viewport.offsetTop);
  return Math.min(Math.max(inset, 0), Math.max(layoutHeight, 0));
}

/**
 * The search field's history entry (an overlay over the screen, like the sheets'): `open` pushes it; `close` leaves
 * it as back would (if it's the current one); back from it calls `onBack`; forward onto it once the field is closed
 * goes back over it (it showed nothing anymore). The DOM is the caller's (`show`, `hide`), so this is tested on a
 * fake history.
 */
export function searchHistory({ isOpen, onBack }: { isOpen: () => boolean; onBack: () => void }) {
  window.addEventListener("popstate", (domEvent) => {
    const onItsEntry = Boolean(historyState((domEvent as PopStateEvent).state).search);
    if (isOpen() && !onItsEntry) onBack();
    else if (!isOpen() && onItsEntry) history.back();
  });
  return {
    open() {
      history.pushState(overlayState({ search: true }), "");
    },
    close() {
      if (historyState().search) history.back();
    },
  };
}

// ---------- the page ----------

const nav = () => byId("bottom-nav");
const field = () => byId<HTMLInputElement>("bottom-search-input");
let entry: ReturnType<typeof searchHistory> | null = null;

export function isSearchOpen(): boolean {
  return document.getElementById("bottom-nav")?.classList.contains("is-searching") ?? false;
}

/** The bar's height on screen (0 where it isn't shown): what's left of the screen above it, for revealDay and menus. */
export function bottomInset(): number {
  const bar = document.getElementById("bottom-nav");
  if (!bar || bar.hidden || getComputedStyle(bar).display === "none") return 0;
  return bar.offsetHeight;
}

/** Draws the bar's state after each render (main.ts). */
export function renderBottomNav(state: NavState) {
  const bar = nav();
  bar.hidden = false;
  const items = navItems(state);
  bar.querySelectorAll<HTMLElement>("[data-view]").forEach((link) => {
    if (link.dataset.view === items.current) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  const search = byId("bottom-search-open");
  search.classList.toggle("is-on", items.searching);
  search.setAttribute("aria-label", items.searchLabel);
  const filters = byId("bottom-filters");
  filters.setAttribute("aria-label", items.filtersLabel);
  const badge = byId("bottom-filters-count");
  badge.textContent = items.badge;
  badge.hidden = !items.badge;
}

// ---------- the search field and the keyboard ----------

let watching = false;

/** Puts the bar right above the keyboard while the field has the focus (none otherwise). */
function placeAboveKeyboard() {
  const bar = nav();
  const focused = document.activeElement === field();
  const inset = focused ? keyboardInset(document.documentElement.clientHeight, window.visualViewport) : 0;
  bar.style.setProperty("--keyboard-inset", `${inset}px`);
  bar.classList.toggle("is-lifted", inset > 0);
}

function watchKeyboard(on: boolean) {
  const viewport = window.visualViewport;
  if (!viewport || on === watching) return;
  watching = on;
  const method = on ? "addEventListener" : "removeEventListener";
  viewport[method]("resize", placeAboveKeyboard);
  viewport[method]("scroll", placeAboveKeyboard);
  window[method]("resize", placeAboveKeyboard);
}

/** The keyboard takes a moment to rise or fall (iOS: about 250 ms, without always telling): look again. */
function settleKeyboard() {
  placeAboveKeyboard();
  for (const delay of [100, 300, 600]) window.setTimeout(placeAboveKeyboard, delay);
}

/** Buscar: the bar becomes the field, with the focus (and the keyboard). */
export function openSearchField() {
  if (isSearchOpen()) return;
  nav().classList.add("is-searching");
  byId("bottom-search-open").setAttribute("aria-expanded", "true");
  entry?.open();
  const input = field();
  input.focus({ preventScroll: true });
  input.setSelectionRange(input.value.length, input.value.length);
  settleKeyboard();
}

/**
 * The field goes back into the bar, its history entry left. main.ts clears the search when that's what closing means
 * (×, back, Escape); the keyboard's "Buscar" keeps it.
 */
export function closeSearchField() {
  if (!isSearchOpen()) return;
  const hadFocus = nav().contains(document.activeElement);
  nav().classList.remove("is-searching");
  byId("bottom-search-open").setAttribute("aria-expanded", "false");
  watchKeyboard(false);
  field().blur();
  placeAboveKeyboard();
  settleKeyboard(); // iOS: the visual viewport may report the keyboard for a moment after it's gone
  entry?.close();
  if (hadFocus) byId("bottom-search-open").focus({ preventScroll: true });
}

/**
 * `dismiss`: the search ends (× and back clear it, main.ts). Escape does the same on a keyboard; the keyboard's
 * "Buscar" (Enter) closes the field and keeps the search; leaving an empty field (the keyboard closed without typing)
 * closes it.
 */
export function initBottomNav({ dismiss }: { dismiss: () => void }) {
  // Until the owner picks (docs/DESIGN.md): ?barra=iconos shows the bar without its labels, for this visit.
  if (new URLSearchParams(location.search).get("barra") === "iconos") nav().dataset.labels = "off";
  entry = searchHistory({ isOpen: isSearchOpen, onBack: dismiss });
  byId("bottom-search-open").addEventListener("click", openSearchField);
  const form = byId<HTMLFormElement>("bottom-search");
  const input = field();
  form.addEventListener("submit", (submit) => {
    submit.preventDefault();
    if (!input.value.trim()) return dismiss();
    closeSearchField();
  });
  input.addEventListener("keydown", (key) => {
    if (key.key !== "Escape") return;
    key.preventDefault(); // the browser would only empty the field
    dismiss();
  });
  input.addEventListener("focus", () => {
    watchKeyboard(true);
    settleKeyboard();
  });
  input.addEventListener("blur", () => {
    watchKeyboard(false);
    settleKeyboard(); // back down at once, and again once the keyboard has gone (iOS's stale offsetTop)
    // A field left empty closes; after a moment, so a tap on × (which takes the focus first) still lands on it.
    window.setTimeout(() => {
      if (isSearchOpen() && !input.value.trim() && !form.contains(document.activeElement)) dismiss();
    }, 200);
  });
}
