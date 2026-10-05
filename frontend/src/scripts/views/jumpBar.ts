// Phones only (CSS hides it where the toolbar is sticky): one slim row pinned to the top of the screen, like the
// filter bars of Google Maps or Airbnb: a row of chips that scrolls sideways (filters.ts draws them, main.ts handles
// their taps). Under it, while filtering, "12 eventos · Finde, Salsa · × Limpiar".
//   - "🕒 ▾" opens the "Cuándo" menu (whenMenu.ts); Filtros in the bar at the bottom (bottomNav.ts) the "Filtros"
//     sheet, set up here.
// It never hides, so the filters are at hand anywhere in the list (it used to hide while scrolling down, like
// Instagram's header). It also keeps the visitor's place when a filter changes (captureListPosition /
// restoreListPosition).

import { byId, prefersReducedMotion } from "../lib/dom";
import { initPanelSheet, openPanelSheet } from "../lib/sheet";
import { initWhenMenu } from "./whenMenu";

const READING_BAND = 0.35; // share of the screen, under the bar, where the period being read is
const MARGIN = 8; // px left between the bar and what's put right under it
const SCROLL_DURATION = 320; // ms: a scroll on purpose (bringing a card into view), like the drawer's rise

export function renderJumpBar() {
  byId("jump-bar").hidden = false;
}

/** Height of what's stuck to the top of the screen (the bar and its line on phones, the toolbar on wide screens). */
export function stickyOffset(): number {
  const bar = byId("jump-bar");
  if (!bar.hidden && getComputedStyle(bar).display !== "none") return bar.offsetHeight;
  const toolbar = document.querySelector<HTMLElement>(".toolbar");
  return toolbar && getComputedStyle(toolbar).position === "sticky" ? toolbar.offsetHeight : 0;
}

const sections = () => [...document.querySelectorAll<HTMLElement>("#view-upcoming .agenda-group")];

/** The period being read: the lowest one crossing a band just under the bar (the one arriving). */
function periodOnScreen(): string | null {
  const top = stickyOffset();
  const bottom = window.innerHeight * READING_BAND;
  const crossing = sections().filter((section) => {
    const box = section.getBoundingClientRect();
    return box.top < Math.max(bottom, top + MARGIN) && box.bottom > top;
  });
  return crossing.at(-1)?.dataset.period ?? null;
}

export interface ListAnchor {
  key: string; // the period that was on screen
  order: string[]; // the periods then, in order: to find the nearest one if it's gone
}

/**
 * Before the list is redrawn for a filter change: the period being read, if the visitor is inside the
 * list (above it, the page is left where it is).
 */
export function captureListPosition(): ListAnchor | null {
  const list = byId("view-upcoming");
  if (list.hidden || list.getBoundingClientRect().top > stickyOffset()) return null;
  const key = periodOnScreen();
  return key ? { key, order: sections().flatMap((section) => section.dataset.period ?? []) } : null;
}

/** The running scroll on purpose, if any: a new one, or the visitor's own wheel or touch, stops it. */
let stopScrolling: (() => void) | null = null;
const VISITOR_SCROLLS = ["wheel", "touchstart"] as const;

/** Scroll the page to `top`, on purpose. */
export function scrollPageTo(top: number, { smooth = false } = {}) {
  stopScrolling?.();
  const target = Math.max(top, 0);
  if (!smooth || prefersReducedMotion()) {
    window.scrollTo({ top: target, behavior: "auto" });
    return;
  }
  // Not the browser's smooth scrolling: its speed can't be set, and this one keeps pace with the drawer.
  const from = window.scrollY;
  const start = performance.now();
  let frame = 0;
  const stop = () => {
    cancelAnimationFrame(frame);
    VISITOR_SCROLLS.forEach((type) => window.removeEventListener(type, stop, true));
    if (stopScrolling === stop) stopScrolling = null;
  };
  const step = (now: number) => {
    const progress = Math.min((now - start) / SCROLL_DURATION, 1);
    const eased = 1 - (1 - progress) ** 3;
    window.scrollTo({ top: from + (target - from) * eased, behavior: "auto" });
    if (progress < 1) frame = requestAnimationFrame(step);
    else stop();
  };
  stopScrolling = stop;
  VISITOR_SCROLLS.forEach((type) => window.addEventListener(type, stop, { capture: true, passive: true }));
  frame = requestAnimationFrame(step);
}

/**
 * After the redraw: put that period's heading back right under the bar. If the filter removed it, the
 * next period (or else the previous one); with no results, the top of the list.
 */
export function restoreListPosition(anchor: ListAnchor) {
  const present = new Set(sections().map((section) => section.dataset.period));
  const index = anchor.order.indexOf(anchor.key);
  const candidates = [anchor.key, ...anchor.order.slice(index + 1), ...anchor.order.slice(0, index).reverse()];
  const key = candidates.find((candidate) => present.has(candidate));
  const target = key ? document.querySelector<HTMLElement>(`#view-upcoming [data-period="${CSS.escape(key)}"]`) : byId("view-upcoming");
  if (!target) return;
  scrollPageTo(target.getBoundingClientRect().top + window.scrollY - stickyOffset() - MARGIN);
}

/** Back to the exact scroll position a view was left at. */
export function returnToScroll(scrollY: number) {
  scrollPageTo(scrollY);
}

/** Filtros (data-open-filters): the sheet slides up; the list stays where it was behind it. */
export function openFilterSheet() {
  openPanelSheet(byId<HTMLDialogElement>("filter-sheet"));
}

export function initJumpBar() {
  initWhenMenu();
  // The chips inside are handled by main.ts; "Ver 12 eventos" closes it like ×. Its groups scroll between the
  // head and that button, so a drag down starts from the head or the groups' top.
  const sheet = byId<HTMLDialogElement>("filter-sheet");
  initPanelSheet(sheet, undefined, { scroller: byId("filter-sheet-body") });
  // Closed with the focus nowhere (a choice drew its chip again): it goes back to Filtros, in the bar at the bottom.
  sheet.addEventListener("close", () => {
    const focus = document.activeElement;
    if (focus && focus !== document.body && !sheet.contains(focus)) return;
    document.getElementById("bottom-filters")?.focus({ preventScroll: true });
  });
}
