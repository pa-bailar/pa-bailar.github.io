// Phones only (CSS hides it where the toolbar is sticky): the bar at the bottom of the screen, like Instagram's
// (components/BottomNav.astro): Eventos · Calendario · Buscar · Guardados · Filtros.
//   - Eventos, Calendario and Guardados are links to the views' addresses; main.ts moves between them with
//     viewNavigation.ts (the same rules as the tabs). The view on screen is aria-current="page". Guardados carries the
//     number of saved events to come (saveButton.ts).
//   - Filtros (data-open-filters, the "Filtros" sheet, main.ts) carries the number of choices in use (filterModel's
//     `active`, "Sin bares" included). Off in Guardados (aria-disabled), which has no filters.
//   - Buscar turns the bar into the search field, docked at the bottom above the keyboard (the visualViewport's
//     numbers, keyboardInset), with × to close it. Typing filters the view on screen (main.ts). It has a history
//     entry of its own, an overlay like the sheets: back closes it, as × does (both clear the search). The
//     keyboard's "Buscar" (Enter) closes the keyboard and the field, keeping the search: Buscar then shows it's on.
//     A field left empty closes, unless what took the focus is over it (the details, the "Cuándo" menu): then it
//     closes when that one does, if still empty. The bar's place going away (a wider screen) closes it too.
// Sheets and the details drawer are modal dialogs, in the browser's top layer: they cover the bar, nothing to hide.

import type { View } from "../types";
import { byId } from "../lib/dom";
import { historyState, overlayState } from "../screenHistory";

/** Filtros' name for screen readers, with its badge's number: "Filtros, 2 activos"; off, why. */
export function filtersLabel(active: number, off = false): string {
  if (off) return "Filtros: no se usan en Guardados";
  return active ? `Filtros, ${active} ${active === 1 ? "activo" : "activos"}` : "Filtros";
}

/** Buscar's name: with a search on, what it's looking for. */
export function searchLabel(query: string): string {
  const text = query.trim();
  return text ? `Buscar: «${text}»` : "Buscar";
}

/** What the bar shows: the view on screen, and whether Buscar is on. */
export interface NavState {
  view: View;
  query: string;
  active: number; // filters in use (the badge)
}

/** The items' states, from the app's state (pure, tested). */
export function navItems({ view, query, active }: NavState) {
  const filtersOff = view === "saved";
  return {
    current: view,
    searching: query.trim() !== "",
    badge: active ? String(active) : "",
    filtersOff,
    filtersLabel: filtersLabel(active, filtersOff),
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

/** Where the bar isn't shown (bottom-nav.css): the toolbar and the header have its actions. */
export const WIDE_QUERY = "(min-width: 720px) and (min-height: 600px)";

/**
 * Whether the open field closes for being left empty: no words in it, the focus elsewhere, and nothing over it (the
 * details or the "Cuándo" menu opened from it: it waits for that one to close).
 */
export function leftEmpty({ query, focused, covered }: { query: string; focused: boolean; covered: boolean }): boolean {
  return !query.trim() && !focused && !covered;
}

/** A keyboard at least this tall was on screen (px): smaller changes are toolbars collapsing, not a keyboard. */
const KEYBOARD_MIN = 120;

/**
 * Whether the on-screen keyboard just went away while the field kept the focus: Android's back button (and its
 * keyboard's own "hide" key) closes the keyboard without a `blur` or a history step (the page isn't told about that
 * first back), so the search reacts to the keyboard leaving instead, as native apps do (owner, 5 Oct 2026).
 */
export function keyboardJustHid(before: number, after: number): boolean {
  return before >= KEYBOARD_MIN && after < KEYBOARD_MIN / 3;
}

let openings = 0;

/**
 * The search field's history entry (an overlay over the screen, like the sheets'), marked with this opening's id:
 * `open` pushes it; `close` leaves it as back would, only if it's the current entry (not with the details or a menu
 * over it); back from it calls `onBack`; back onto it from an overlay over it calls `onReturn`. Forward onto a closed
 * field's entry (this one's, or one left from before) goes back over it: it shows nothing anymore. `covered`: another
 * overlay's entry is over the field's. The DOM is the caller's, so this is tested on a fake history.
 */
export function searchHistory({ isOpen, onBack, onReturn = () => {} }: { isOpen: () => boolean; onBack: () => void; onReturn?: () => void }) {
  let id = "";
  window.addEventListener("popstate", (domEvent) => {
    const { search, overlay } = historyState((domEvent as PopStateEvent).state);
    if (isOpen() && id && search === id) onReturn();
    else if (search) history.back();
    else if (isOpen() && !overlay) onBack(); // an overlay is over the field (forward onto the details): it stays
  });
  return {
    open() {
      id = `${Date.now().toString(36)}.${(openings++).toString(36)}.${Math.random().toString(36).slice(2, 6)}`;
      history.pushState(overlayState({ search: id }), "");
    },
    close() {
      if (id && historyState().search === id) history.back();
      id = "";
    },
    covered(): boolean {
      const { search, overlay } = historyState();
      return Boolean(overlay) && search !== id;
    },
  };
}

// ---------- the page ----------

const nav = () => byId("bottom-nav");
const field = () => byId<HTMLInputElement>("bottom-search-input");
let entry: ReturnType<typeof searchHistory> | null = null;

export function isSearchOpen(): boolean {
  return nav().classList.contains("is-searching");
}

/** The bar's height on screen (0 where it isn't shown): what's left of the screen above it, for revealDay and menus. */
export function bottomInset(): number {
  const bar = nav();
  if (bar.hidden || getComputedStyle(bar).display === "none") return 0;
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
  if (items.filtersOff) filters.setAttribute("aria-disabled", "true");
  else filters.removeAttribute("aria-disabled");
  const badge = byId("bottom-filters-count");
  badge.textContent = items.badge;
  badge.hidden = !items.badge;
}

// ---------- the search field and the keyboard ----------

let watching = false;
let lastInset = 0;
let onKeyboardHidden: () => void = () => {};

/**
 * Puts the bar right above the keyboard while the field has the focus (none otherwise). The inset is the page's, so a
 * notice rises with the bar (notice.css): an iPhone keeps the keyboard up when a bookmark is tapped in the results
 * (the tapped button doesn't take the focus), and "Guardado" sat behind it (the bug hunt of 7 Oct 2026).
 */
function placeAboveKeyboard() {
  const bar = nav();
  const focused = document.activeElement === field();
  const inset = focused ? keyboardInset(document.documentElement.clientHeight, window.visualViewport) : 0;
  document.documentElement.style.setProperty("--keyboard-inset", `${inset}px`);
  bar.classList.toggle("is-lifted", inset > 0);
  const hid = focused && keyboardJustHid(lastInset, inset);
  lastInset = inset;
  if (hid) onKeyboardHidden();
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
  settleKeyboard(); // iOS: the visual viewport may report the keyboard for a moment after it's gone
  entry?.close();
  if (hadFocus) byId("bottom-search-open").focus({ preventScroll: true });
}

/**
 * `dismiss`: the search ends (× and back clear it, main.ts). Escape does the same on a keyboard; the keyboard's
 * "Buscar" (Enter) closes the field and keeps the search; leaving an empty field (the keyboard closed without typing)
 * closes it. The keyboard going away with the field still focused (Android's back) does the same: empty, the search
 * ends; with words, it's kept, as with "Buscar".
 */
export function initBottomNav({ dismiss }: { dismiss: () => void }) {
  const input = field();
  const form = byId<HTMLFormElement>("bottom-search");
  /**
   * The field closes if it was left empty (`leftEmpty`). Covered: another overlay's entry is over the field's, or the
   * focus is in one (a dialog, the menu); `returning` (back from that overlay, its entry gone): the details may still
   * be sliding away with the focus in them, and that doesn't count.
   */
  const closeIfLeftEmpty = ({ returning = false } = {}) => {
    const inOverlay = !returning && Boolean(document.activeElement?.closest("dialog[open], [role='menu']"));
    const covered = Boolean(entry?.covered()) || inOverlay;
    if (isSearchOpen() && leftEmpty({ query: input.value, focused: form.contains(document.activeElement), covered })) dismiss();
  };
  entry = searchHistory({ isOpen: isSearchOpen, onBack: dismiss, onReturn: () => closeIfLeftEmpty({ returning: true }) });
  onKeyboardHidden = () => {
    if (!isSearchOpen()) return;
    if (field().value.trim()) closeSearchField();
    else dismiss();
  };
  byId("bottom-search-open").addEventListener("click", openSearchField);
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
    // A field left empty closes; after a moment, so a tap on × (which takes the focus first) still lands on it, and
    // a tap that opens something over it (a card's details, "Cuándo") has opened it: the field waits for it to close.
    window.setTimeout(() => closeIfLeftEmpty(), 200);
  });
  // The other search field (the toolbar's) emptied while this one is open but not in use.
  document.addEventListener("input", (domEvent) => {
    if ((domEvent.target as Element).matches?.("[data-search]") && domEvent.target !== input) closeIfLeftEmpty();
  });
  // A wider screen (a turned tablet, a resized window): the bar goes, and the field with it; the search stays.
  window.matchMedia(WIDE_QUERY).addEventListener("change", (change) => {
    if (change.matches) closeSearchField();
  });
}
