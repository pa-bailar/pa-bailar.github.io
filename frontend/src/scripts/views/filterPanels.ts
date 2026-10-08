// Wide screens: the toolbar's dropdown pills and their panels (ViewToolbar.astro; filters.ts draws them). The pattern
// of Meetup's, Google Flights' and Airbnb's filter bars, and the phone bar's "Cuándo" menu (whenMenu.ts), whose
// placement and keys it shares:
//   - **Cuándo** opens the same menu as on phones (menuitemradio): a tap applies one date and closes it (main.ts).
//   - **Ritmo** and **Tipo** open a panel (a non-modal dialog) with their chips and counts, the rhythms under their
//     families; choices apply at once and the panel stays open for more.
//   - One panel at a time: another pill opens its own in its place. Closes with Escape (wherever the focus is), the
//     pill again, Tab out of it, a click outside, back (it has a history entry of its own, as an overlay, like the
//     "Cuándo" menu), or the screen getting too small for the toolbar. The focus goes back to the pill.
//   - A click outside: outside the toolbar and the details' side panel it does nothing else (it could open an event
//     behind it); in them (a tab, "Guardados", the search, a removable chip, the side panel's ×, Instagram or Guardar)
//     it does its job once the panel's history entry is gone, so a button that writes its own entry writes it on the
//     screen's, not on the panel's (lib/outsideClick.ts).
//   - Keyboard: ↓ or ↑ on a pill opens it; in a panel the arrows (and Home, End) move between its options; Tab leaves
//     it (closing it: Tab goes on from its pill, Shift+Tab lands on its pill). A click on the panel's own background
//     keeps the focus in it (tabindex="-1"), so its keys still work.
//   - Placed under its pill (absolute, so nothing moves when it opens), never past the screen's sides nor under the
//     details' side panel; it scrolls when the screen is short.

import { isPlainClick } from "../lib/dom";
import type { PillKey } from "../lib/filterModel";
import { pressedClick } from "../lib/outsideClick";
import { historyState, overlayState } from "../screenHistory";
import { WIDE_QUERY } from "./bottomNav";
import { menuPlacement, nextOption } from "./whenMenu";

const KEYS: readonly PillKey[] = ["when", "types", "styles"];
const PREFIX = "panel-"; // the history entry's `menu`: "panel-styles"
const HOLD_LIMIT_MS = 1000; // a held click goes on by then, even if the panel's back never landed

/** The panel's element id, for the pill's `aria-controls`. */
export function panelId(key: PillKey): string {
  return `pill-panel-${key}`;
}

/** The key that moves the focus in a panel of chips (→ like ↓, ← like ↑), as the menu's keys. */
export function arrowKey(key: string): string {
  return key === "ArrowRight" ? "ArrowDown" : key === "ArrowLeft" ? "ArrowUp" : key;
}

let openKey: PillKey | null = null;
const swallowed = pressedClick(); // a click outside the toolbar and the side panel that closed a panel: nothing else
const deferred = pressedClick(); // a click in them that closed a panel: it waits for the panel's entry to go
let leaving = false; // the panel's back is on its way (its popstate hasn't landed)
let held: { target: EventTarget; init: MouseEventInit } | null = null; // the click waiting for it
let holdTimer = 0;

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

/**
 * Closes the panel open, leaving its history entry as back would. `focusPill`: the focus goes back to its pill.
 * Whether it went back (its popstate is on its way).
 */
export function closePanel({ focusPill = false } = {}): boolean {
  if (!openKey) return false;
  hide({ focusPill });
  if (!historyState().menu?.startsWith(PREFIX)) return false;
  leaving = true;
  history.back();
  return true;
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

/** The click held while the panel's back was on its way, now on the screen's entry. */
function releaseHeld() {
  window.clearTimeout(holdTimer);
  const click = held;
  held = null;
  if (click) click.target.dispatchEvent(new MouseEvent("click", click.init));
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
  if (event.key !== "Tab") return;
  // Not modal: Tab leaves it, closed. Forward it goes on from its pill (the focus is put there first, then moves on);
  // back it lands on the pill.
  if (event.shiftKey) event.preventDefault();
  closePanel({ focusPill: true });
}

export function initFilterPanels() {
  const toolbar = document.querySelector<HTMLElement>(".toolbar");
  if (!toolbar) return;
  for (const key of KEYS) panel(key)?.addEventListener("keydown", onKeydown);
  // Escape closes it wherever the focus is (also on the page, after a click on nothing), and only it: not the side
  // panel too.
  document.addEventListener(
    "keydown",
    (event) => {
      if (!openKey || event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      closePanel({ focusPill: true });
    },
    true,
  );
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
  // A click outside closes it. Outside the toolbar and the side panel that click does nothing else (it could open an
  // event behind it); in them (a tab, the search, a removable chip, the side panel's buttons) it does what it does,
  // once the panel's entry is gone. Another pill opens its own panel.
  const side = () => document.getElementById("event-drawer");
  document.addEventListener(
    "pointerdown",
    (event) => {
      const target = event.target as HTMLElement;
      if (!openKey || panel(openKey)?.contains(target) || target.closest?.("[data-pill]")) return;
      const inside = toolbar.contains(target) || Boolean(side()?.contains(target));
      const wentBack = closePanel();
      if (!inside) swallowed.arm(target);
      else if (wentBack) deferred.arm(target);
    },
    true,
  );
  const release = (event: PointerEvent) => {
    swallowed.release(event.pointerType);
    deferred.release(event.pointerType);
  };
  document.addEventListener("pointerup", release, true);
  document.addEventListener("pointercancel", release, true);
  document.addEventListener(
    "click",
    (event) => {
      if (swallowed.take(event.target)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      // Its job would land on the panel's entry, about to go: it waits for the popstate. A click asking for a new
      // tab touches no history: it goes now.
      if (!deferred.take(event.target) || !leaving || !isPlainClick(event) || !event.target) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const init = { bubbles: true, cancelable: true, composed: true, button: 0, detail: event.detail, view: window };
      held = { target: event.target, init };
      holdTimer = window.setTimeout(() => {
        leaving = false;
        releaseHeld();
      }, HOLD_LIMIT_MS);
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
  // Too small for the toolbar (a window resized, a tablet turned): the pills are gone, so is their panel, and its
  // history entry with it (an invisible panel would swallow taps and back).
  window.matchMedia(WIDE_QUERY).addEventListener("change", (change) => {
    if (!change.matches) syncPanels();
  });
  // Back: the entry under the panel's is now current. Forward onto a panel's entry once it's closed: a dead step,
  // back over it (as the "Cuándo" menu does).
  window.addEventListener("popstate", (event) => {
    const menu = historyState(event.state).menu;
    if (!menu?.startsWith(PREFIX)) {
      hide();
      if (leaving) {
        leaving = false;
        // After every other popstate listener (the screens' puts its screen back): then the held click does its job.
        window.setTimeout(releaseHeld, 0);
      }
    } else if (!openKey) history.back();
  });
}
