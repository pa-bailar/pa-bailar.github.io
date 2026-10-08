// "Cuándo" in the phone bar (filters.ts draws the chip, this module the menu's items): a short menu that hangs from
// its chip, like Google Maps' filter chips with a ▾. One date at a time: a tap applies it and closes the menu
// (main.ts), with no "Listo". Several dates are still chosen in the "Filtros" sheet.
//   - Closes with Escape, a tap outside it (that tap does nothing else), Tab, the chip again, or back: it has a
//     history entry of its own, as an overlay (screenHistory.ts), like the sheets.
//   - Keyboard: the menu pattern of the ARIA practices (menuitemradio): ↓ on the chip opens it, ↑ ↓ Home End move,
//     Enter or Space choose; the focus goes back to the chip when it closes.
//   - Placed under its chip inside the pinned bar (so it moves with it), never past the screen's edges nor under the
//     bar at the bottom; it scrolls when the screen is short. Too little room below (a phone in landscape, the bar
//     not pinned yet), and more above: it opens upward instead, as native menus do.

import { byId, escapeHtml } from "../lib/dom";
import type { WhenModel, WhenOption } from "../lib/filterModel";
import { eventCountLabel } from "../lib/format";
import { ICONS } from "../lib/icons";
import { refocus } from "../lib/focus";
import { pressedClick } from "../lib/outsideClick";
import { historyState, overlayState } from "../screenHistory";
import { bottomInset } from "./bottomNav";

const MENU = "when";
const GAP = 4; // px between the chip and the menu
const EDGE = 8; // px kept from the screen's sides
const BOTTOM = 12; // px kept from the screen's bottom
const MIN_HEIGHT = 176; // px: about four options; with less room below than this, above if there's more room there

const menu = () => byId("when-menu");
const opener = () => document.getElementById("when-open");
const items = () => [...menu().querySelectorAll<HTMLElement>("[data-when]")];

const swallowed = pressedClick(); // the tap outside that closed the menu: it does nothing else

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
 * Where the menu goes, in the bar's coordinates: under its chip (`top`), its left edge with the chip's, but never past
 * the screen's sides; as tall as the screen leaves below the chip (`screenHeight`: down to the bar at the bottom), and
 * it scrolls inside. With room for fewer than about four options below and more above, it hangs above the chip
 * instead (`bottom`: from the bar's bottom edge), as tall as the room there.
 */
export function menuPlacement(
  chip: Box,
  bar: Box,
  menuWidth: number,
  screenHeight: number,
): { left: number; top?: number; bottom?: number; maxHeight: number } {
  const left = Math.max(Math.min(chip.left - bar.left, bar.width - menuWidth - EDGE), EDGE);
  const below = screenHeight - chip.bottom - GAP - BOTTOM;
  const above = chip.top - GAP - EDGE;
  if (below >= MIN_HEIGHT || below >= above) return { left, top: chip.bottom - bar.top + GAP, maxHeight: Math.max(below, 0) };
  return { left, bottom: bar.bottom - chip.top + GAP, maxHeight: above };
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
  // The menu is placed from the bar's padding box (its containing block): inside its border (the line at its foot).
  const bar = byId("jump-bar");
  const box = bar.getBoundingClientRect();
  const padding = {
    left: box.left + bar.clientLeft,
    top: box.top + bar.clientTop,
    bottom: box.top + bar.clientTop + bar.clientHeight,
    width: bar.clientWidth,
  };
  const where = menuPlacement(
    chip.getBoundingClientRect(),
    padding,
    element.offsetWidth,
    window.innerHeight - bottomInset(), // the bar at the bottom covers the rest
  );
  element.style.left = `${where.left}px`;
  element.style.top = where.top === undefined ? "auto" : `${where.top}px`;
  element.style.bottom = where.bottom === undefined ? "auto" : `${where.bottom}px`;
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
  history.pushState(overlayState({ menu: MENU }), "");
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
  if (historyState().menu === MENU) history.back();
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
  // A tap outside closes it, and that tap does nothing else (it could open an event or a sheet behind it): its own
  // click only (lib/outsideClick.ts), never a later one.
  document.addEventListener(
    "pointerdown",
    (event) => {
      const target = event.target as Node;
      if (!isWhenMenuOpen() || element.contains(target) || opener()?.contains(target)) return;
      swallowed.arm(target);
      closeWhenMenu();
    },
    true,
  );
  const release = (event: PointerEvent) => swallowed.release(event.pointerType);
  document.addEventListener("pointerup", release, true);
  document.addEventListener("pointercancel", release, true);
  document.addEventListener(
    "click",
    (event) => {
      if (!swallowed.take(event.target)) return;
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
  // Back: the entry under the menu's is now current. Forward onto its entry once it's closed: a dead step, back over it
  // (as the sheets do, lib/sheet.ts).
  window.addEventListener("popstate", (event) => {
    if (historyState(event.state).menu !== MENU) hide();
    else if (!isWhenMenuOpen()) history.back();
  });
}

// ---------- drawing ----------

/**
 * The menu's items (JumpBar.astro's #when-menu, the model's `when`): one date at a time, each with its days
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

/** The menu's content follows the filters, also while it's open (the counts); empty without "Cuándo" (the calendar). */
export function renderWhenMenu(when: WhenModel | null) {
  const element = menu();
  if (!when) {
    element.innerHTML = "";
    return;
  }
  const focused = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>("#when-menu [data-when]")?.dataset.when;
  element.innerHTML = whenMenuHtml(when);
  refocus(focused === undefined ? null : `[data-when="${CSS.escape(focused)}"]`, element); // it hangs from the pinned bar
}
