// Wide screens: the toolbar's dropdown pills and their panels (ViewToolbar.astro; filters.ts draws them). The pattern
// of Meetup's, Google Flights' and Airbnb's filter bars, and the phone bar's "Cuándo" menu (whenMenu.ts), whose
// placement and keys it shares:
//   - **Cuándo** opens the same menu as on phones (menuitemradio): a tap applies one date and closes it (main.ts).
//   - **Ritmo** and **Tipo** open a panel (a non-modal dialog) with their chips and counts, the rhythms under their
//     families; choices apply at once and the panel stays open for more.
//   - One panel at a time: another pill opens its own in its place. Closes with Escape, the pill again, a click
//     outside (one outside the toolbar does nothing else: it could open an event behind it), or back: it has a history
//     entry of its own, as an overlay, like the "Cuándo" menu. The focus goes back to the pill.
//   - Keyboard: ↓ or ↑ on a pill opens it; in a panel the arrows (and Home, End) move between its options; Tab stays
//     inside a Ritmo or Tipo panel (it's a dialog), and leaves Cuándo's menu (closing it), as on phones.
//   - Placed under its pill (absolute, so nothing moves when it opens), never past the screen's sides nor under the
//     details' side panel; it scrolls when the screen is short.

import type { PillKey } from "../lib/filterModel";
import { historyState, overlayState } from "../screenHistory";
import { menuPlacement, nextOption } from "./whenMenu";

const KEYS: readonly PillKey[] = ["when", "styles", "types"];
const PREFIX = "panel-"; // the history entry's `menu`: "panel-styles"

/** The panel's element id, for the pill's `aria-controls`. */
export function panelId(key: PillKey): string {
  return `pill-panel-${key}`;
}

/** The key that moves the focus in a panel of chips (→ like ↓, ← like ↑), as the menu's keys. */
export function arrowKey(key: string): string {
  return key === "ArrowRight" ? "ArrowDown" : key === "ArrowLeft" ? "ArrowUp" : key;
}

let openKey: PillKey | null = null;
let swallowClick = false; // the click outside the toolbar that closed a panel: it does nothing else

/** The pill whose panel is open (filters.ts draws it with aria-expanded="true"). */
export function openPanelKey(): PillKey | null {
  return openKey;
}

const panel = (key: PillKey) => document.getElementById(panelId(key));
const pill = (key: PillKey) => document.getElementById(`pill-${key}`);
const isPillKey = (value: string | undefined): value is PillKey => KEYS.includes(value as PillKey);

/** What moves the focus inside a panel: Cuándo's items, or the chips. */
const options = (key: PillKey) =>
  [...(panel(key)?.querySelectorAll<HTMLElement>(key === "when" ? "[data-when]" : "[data-filter]") ?? [])];

/** Where the screen's free room ends on the right: the details' side panel, while it's open. */
function visibleRight(): number {
  const side = document.querySelector<HTMLElement>(".drawer[open]");
  const left = side && getComputedStyle(side).position === "fixed" ? side.getBoundingClientRect().left : Infinity;
  return Math.min(document.documentElement.clientWidth, left);
}

/** Under its pill, inside the toolbar, left of the side panel, within the screen. */
function place() {
  if (!openKey) return;
  const element = panel(openKey);
  const button = pill(openKey);
  const toolbar = element?.offsetParent as HTMLElement | null;
  if (!element || !button || !toolbar) return;
  const box = toolbar.getBoundingClientRect();
  const left = box.left + toolbar.clientLeft;
  const top = box.top + toolbar.clientTop;
  const where = menuPlacement(
    button.getBoundingClientRect(),
    { left, top, bottom: top + toolbar.clientHeight, width: Math.min(toolbar.clientWidth, visibleRight() - left) },
    element.offsetWidth,
    window.innerHeight,
  );
  element.style.left = `${where.left}px`;
  element.style.top = where.top === undefined ? "auto" : `${where.top}px`;
  element.style.bottom = where.bottom === undefined ? "auto" : `${where.bottom}px`;
  element.style.maxHeight = `${where.maxHeight}px`;
}

function focusOption(element: HTMLElement | undefined) {
  if (!element) return;
  element.focus({ preventScroll: true });
  const box = element.parentElement?.closest<HTMLElement>(".pill-panel");
  if (!box) return;
  // Within the panel only (scrollIntoView could move the page too).
  const top = element.offsetTop;
  if (top < box.scrollTop) box.scrollTop = top;
  else if (top + element.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTop = top + element.offsetHeight - box.clientHeight;
}

/** The first option to focus: the one chosen (Cuándo's checked date, a chosen chip), else the first. */
function firstFocus(key: PillKey, last: boolean): HTMLElement | undefined {
  const all = options(key);
  if (last) return all.at(-1);
  return all.find((item) => item.getAttribute(key === "when" ? "aria-checked" : "aria-pressed") === "true") ?? all[0];
}

function show(key: PillKey) {
  const element = panel(key);
  if (!element) return;
  openKey = key;
  element.hidden = false;
  pill(key)?.setAttribute("aria-expanded", "true");
  place();
}

/** Just hides it (its history entry is dealt with by the caller). */
function hide({ focusPill = false } = {}) {
  if (!openKey) return;
  const key = openKey;
  const element = panel(key);
  const hadFocus = Boolean(element?.contains(document.activeElement));
  openKey = null;
  if (element) element.hidden = true;
  const button = pill(key);
  button?.setAttribute("aria-expanded", "false");
  if (focusPill || hadFocus) button?.focus({ preventScroll: true });
}

/**
 * Opens a pill's panel under it, the focus on what's chosen in it (or its first option; `last`: its last, for ↑).
 * Another panel open gives it its place, on the same history entry.
 */
export function openPanel(key: PillKey, { last = false } = {}) {
  if (openKey === key) return;
  if (openKey) {
    hide();
    history.replaceState(overlayState({ menu: `${PREFIX}${key}` }), "");
  } else {
    history.pushState(overlayState({ menu: `${PREFIX}${key}` }), "");
  }
  show(key);
  focusOption(firstFocus(key, last));
}

/** Closes the panel open, leaving its history entry as back would. `focusPill`: the focus goes back to its pill. */
export function closePanel({ focusPill = false } = {}) {
  if (!openKey) return;
  hide({ focusPill });
  if (historyState().menu?.startsWith(PREFIX)) history.back();
}

/** A pill's click: opens its panel, or closes it if it's the one open. */
export function togglePanel(key: string) {
  if (!isPillKey(key)) return;
  if (openKey === key) closePanel({ focusPill: true });
  else openPanel(key);
}

/** After a redraw (the pills are drawn again): still in place, or closed if its pill is gone (Cuándo in the calendar). */
export function syncPanels() {
  if (!openKey) return;
  const button = pill(openKey);
  if (!button || button.getClientRects().length === 0) {
    closePanel();
    return;
  }
  place();
}

function onKeydown(event: KeyboardEvent) {
  if (!openKey) return;
  const key = openKey;
  const all = options(key);
  const index = all.indexOf(document.activeElement as HTMLElement);
  const next = nextOption(key === "when" ? event.key : arrowKey(event.key), index, all.length);
  if (next !== null) {
    event.preventDefault();
    focusOption(all[next]);
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation(); // not the side panel's Escape too
    closePanel({ focusPill: true });
    return;
  }
  if (event.key !== "Tab") return;
  if (key === "when") {
    closePanel(); // the focus moves on as usual, as in the phone's menu
    return;
  }
  // A dialog: Tab goes around its options.
  if (!all.length) return;
  event.preventDefault();
  focusOption(all[event.shiftKey ? (index <= 0 ? all.length - 1 : index - 1) : (index + 1) % all.length]);
}

export function initFilterPanels() {
  const toolbar = document.querySelector<HTMLElement>(".toolbar");
  if (!toolbar) return;
  for (const key of KEYS) panel(key)?.addEventListener("keydown", onKeydown);
  // ↓ or ↑ on a pill opens it (Enter and Space click it).
  toolbar.addEventListener("keydown", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLElement>("[data-pill]");
    if (!button || (event.key !== "ArrowDown" && event.key !== "ArrowUp")) return;
    const key = button.dataset.pill;
    if (!isPillKey(key)) return;
    event.preventDefault();
    if (openKey === key) focusOption(firstFocus(key, event.key === "ArrowUp"));
    else openPanel(key, { last: event.key === "ArrowUp" });
  });
  // A click outside closes it. Outside the toolbar that click does nothing else (it could open an event behind it);
  // in the toolbar (a tab, the search, a removable chip) it does what it does. Another pill opens its own panel.
  document.addEventListener(
    "pointerdown",
    (event) => {
      swallowClick = false;
      const target = event.target as HTMLElement;
      if (!openKey || panel(openKey)?.contains(target) || target.closest?.("[data-pill]")) return;
      swallowClick = !toolbar.contains(target);
      closePanel();
    },
    true,
  );
  document.addEventListener(
    "click",
    (event) => {
      if (!swallowClick) return;
      swallowClick = false;
      event.preventDefault();
      event.stopPropagation();
    },
    true,
  );
  // The focus left it (a screen reader's own navigation, a click elsewhere without a pointer).
  toolbar.addEventListener("focusout", (event) => {
    if (!openKey) return;
    const next = event.relatedTarget as HTMLElement | null;
    if (next && !panel(openKey)?.contains(next) && !next.closest("[data-pill]")) closePanel();
  });
  const follow = () => {
    if (openKey) place();
  };
  window.addEventListener("scroll", follow, { passive: true });
  window.addEventListener("resize", follow);
  // Back: the entry under the panel's is now current. Forward onto a panel's entry once it's closed: a dead step,
  // back over it (as the "Cuándo" menu does).
  window.addEventListener("popstate", (event) => {
    const menu = historyState(event.state).menu;
    if (!menu?.startsWith(PREFIX)) hide();
    else if (!openKey) history.back();
  });
}
