// "Cuándo" in the phone bar (filters.ts draws the chip and the menu's items): a short menu that hangs from its chip,
// like Google Maps' filter chips with a ▾. One date at a time: a tap applies it and closes the menu (main.ts), with
// no "Listo". Several dates are still chosen in the "Filtros" sheet.
//   - Closes with Escape, a tap outside it (that tap does nothing else), Tab, the chip again, or back: it has a
//     history entry of its own, as an overlay (screenHistory.ts), like the sheets.
//   - Keyboard: the menu pattern of the ARIA practices (menuitemradio): ↓ on the chip opens it, ↑ ↓ Home End move,
//     Enter or Space choose; the focus goes back to the chip when it closes.
//   - Placed under its chip inside the pinned bar (so it moves with it), never past the screen's edges; it
//     scrolls when the screen is short.

import { byId } from "../lib/dom";
import { overlayState } from "../screenHistory";

interface MenuHistoryState {
  menu?: string;
}

const MENU = "when";
const GAP = 4; // px between the chip and the menu
const EDGE = 8; // px kept from the screen's sides
const BOTTOM = 12; // px kept from the screen's bottom
const MIN_HEIGHT = 176; // px: about four options, even on a short screen

const menu = () => byId("when-menu");
const opener = () => document.getElementById("when-open");
const items = () => [...menu().querySelectorAll<HTMLElement>("[data-when]")];

let swallowClick = false; // the tap outside that closed the menu: it does nothing else

export function isWhenMenuOpen(): boolean {
  return !menu().hidden;
}

interface Box {
  left: number;
  top: number;
  bottom: number;
  width: number;
}

/**
 * Where the menu goes, in the bar's coordinates: under its chip, its left edge with the chip's, but never past the
 * screen's sides; as tall as the screen leaves below the chip (it scrolls inside), at least about four options.
 */
export function menuPlacement(chip: Box, bar: Box, menuWidth: number, screenHeight: number) {
  const left = Math.max(Math.min(chip.left - bar.left, bar.width - menuWidth - EDGE), EDGE);
  return {
    left,
    top: chip.bottom - bar.top + GAP,
    maxHeight: Math.max(screenHeight - chip.bottom - GAP - BOTTOM, MIN_HEIGHT),
  };
}

/** The option a key moves the focus to (ARIA menu pattern: ↓ ↑ wrap around, Home, End), or null for other keys. */
export function nextOption(key: string, index: number, count: number): number | null {
  if (!count) return null;
  const wrap = (to: number) => (to + count) % count;
  switch (key) {
    case "ArrowDown":
      return wrap(index + 1);
    case "ArrowUp":
      return wrap(index < 0 ? -1 : index - 1);
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}

/** Under its chip, inside the bar, within the screen. */
function place() {
  const chip = opener()?.closest<HTMLElement>(".when-chip");
  if (!chip) return;
  const element = menu();
  const where = menuPlacement(
    chip.getBoundingClientRect(),
    byId("jump-bar").getBoundingClientRect(),
    element.offsetWidth,
    window.innerHeight,
  );
  element.style.left = `${where.left}px`;
  element.style.top = `${where.top}px`;
  element.style.maxHeight = `${where.maxHeight}px`;
}

function focusItem(item: HTMLElement | undefined) {
  if (!item) return;
  item.focus({ preventScroll: true });
  const element = menu();
  // Within the menu only (scrollIntoView could move the page too).
  if (item.offsetTop < element.scrollTop) element.scrollTop = item.offsetTop;
  else if (item.offsetTop + item.offsetHeight > element.scrollTop + element.clientHeight) {
    element.scrollTop = item.offsetTop + item.offsetHeight - element.clientHeight;
  }
}

/** Opens under the chip, the focus on the date chosen (or "Cualquier fecha"); `last`: on the last option (↑). */
export function openWhenMenu({ last = false } = {}) {
  const button = opener();
  if (isWhenMenuOpen() || !button) return;
  menu().hidden = false;
  button.setAttribute("aria-expanded", "true");
  place();
  history.pushState(overlayState({ menu: MENU } satisfies MenuHistoryState), "");
  const options = items();
  focusItem(last ? options.at(-1) : (options.find((item) => item.getAttribute("aria-checked") === "true") ?? options[0]));
}

/** Just hides it (its history entry is dealt with by the caller). */
function hide({ focusChip = false } = {}) {
  if (!isWhenMenuOpen()) return;
  const hadFocus = menu().contains(document.activeElement);
  menu().hidden = true;
  opener()?.setAttribute("aria-expanded", "false");
  if (focusChip || hadFocus) opener()?.focus({ preventScroll: true });
}

/** Closes it and leaves its history entry, as back would. `focusChip`: the focus goes back to "Cuándo". */
export function closeWhenMenu({ focusChip = false } = {}) {
  if (!isWhenMenuOpen()) return;
  hide({ focusChip });
  if ((history.state as MenuHistoryState | null)?.menu === MENU) history.back();
}

/** After a redraw (the chip is drawn again): still marked open and in place, or closed if the chip is gone. */
export function syncWhenMenu() {
  if (!isWhenMenuOpen()) return;
  const button = opener();
  if (!button || button.offsetParent === null) {
    closeWhenMenu();
    return;
  }
  button.setAttribute("aria-expanded", "true");
  place();
}

function onKeydown(event: KeyboardEvent) {
  const options = items();
  const next = nextOption(event.key, options.indexOf(document.activeElement as HTMLElement), options.length);
  if (next !== null) {
    event.preventDefault();
    focusItem(options[next]);
    return;
  }
  switch (event.key) {
    case "Escape":
      event.preventDefault();
      event.stopPropagation();
      return closeWhenMenu({ focusChip: true });
    case "Tab":
      return closeWhenMenu(); // the focus moves on as usual
  }
}

export function initWhenMenu() {
  const element = menu();
  element.addEventListener("keydown", onKeydown);
  // ↓ or ↑ on the chip opens the menu (Enter and Space click it).
  byId("jump-chips").addEventListener("keydown", (event) => {
    if (!(event.target as HTMLElement).closest("[data-when-open]")) return;
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    openWhenMenu({ last: event.key === "ArrowUp" });
  });
  // A tap outside closes it, and that tap does nothing else (it could open an event or a sheet behind it).
  document.addEventListener(
    "pointerdown",
    (event) => {
      swallowClick = false;
      const target = event.target as Node;
      if (!isWhenMenuOpen() || element.contains(target) || opener()?.contains(target)) return;
      swallowClick = true;
      closeWhenMenu();
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
  element.addEventListener("focusout", (event) => {
    const next = event.relatedTarget as Node | null;
    if (next && !element.contains(next) && !opener()?.contains(next)) closeWhenMenu();
  });
  // It follows its chip: the page or the row scrolling, the screen turning.
  const follow = () => {
    if (isWhenMenuOpen()) place();
  };
  window.addEventListener("scroll", follow, { passive: true });
  window.addEventListener("resize", follow);
  byId("jump-chips").addEventListener("scroll", follow, { passive: true });
  // Back: the entry under the menu's is now current.
  window.addEventListener("popstate", (event) => {
    if ((event.state as MenuHistoryState | null)?.menu !== MENU) hide();
  });
}
