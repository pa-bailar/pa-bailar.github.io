// Phones only (CSS hides it where the toolbar is sticky): one slim row stuck to the top of the screen, like the
// filter bars of Google Maps or Airbnb: [🔍] [🔖 3] and a row of chips that scrolls sideways (filters.ts draws
// them, main.ts handles their taps). Under it, while filtering, "12 eventos · Finde, Salsa · × Limpiar".
//   - 🔍 turns the row into the search field; × clears the search and turns it back.
//   - ⚙ opens the "Filtros" sheet.
// Like Instagram's header, the bar hides while scrolling down and comes back on any scroll up.
// It also keeps the visitor's place when a filter changes (captureListPosition / restoreListPosition).

import { byId, prefersReducedMotion } from "../lib/dom";
import { initPanelSheet, openPanelSheet } from "../lib/sheet";

const SCROLL_THRESHOLD = 8; // px of movement before reacting, so small jitters don't toggle the bar
const ALWAYS_SHOWN_ABOVE = 200; // px from the top of the page where the bar never hides
const READING_BAND = 0.35; // share of the screen, under the bar, where the period being read is
const MARGIN = 8; // px left between the bar and what's put right under it
const SCROLL_DURATION = 320; // ms: a scroll on purpose (bringing a card into view), like the drawer's rise

let jumping = false; // a scroll on purpose: don't hide the bar for it

export function renderJumpBar({ searching }: { searching: boolean }) {
  const bar = byId("jump-bar");
  bar.hidden = false;
  if (searching) bar.classList.add("is-searching");
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
  return key ? { key, order: sections().map((section) => section.dataset.period!) } : null;
}

/** Scroll the page to `top`, on purpose: the bar stays in view meanwhile. */
export function scrollPageTo(top: number, { smooth = false } = {}) {
  jumping = true;
  byId("jump-bar").classList.remove("is-hidden");
  const target = Math.max(top, 0);
  const done = () => requestAnimationFrame(() => requestAnimationFrame(() => (jumping = false)));
  if (!smooth || prefersReducedMotion()) {
    window.scrollTo({ top: target, behavior: "auto" });
    done();
    return;
  }
  // Not the browser's smooth scrolling: its speed can't be set, and this one keeps pace with the drawer.
  const from = window.scrollY;
  const start = performance.now();
  const step = (now: number) => {
    const progress = Math.min((now - start) / SCROLL_DURATION, 1);
    const eased = 1 - (1 - progress) ** 3;
    window.scrollTo({ top: from + (target - from) * eased, behavior: "auto" });
    if (progress < 1) requestAnimationFrame(step);
    else done();
  };
  requestAnimationFrame(step);
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

/** Hide while scrolling down, show on any scroll up (and near the top, and while it holds the keyboard's focus). */
function initHideOnScroll() {
  const bar = byId("jump-bar");
  let lastY = window.scrollY;
  let ticking = false;
  const update = () => {
    ticking = false;
    const y = window.scrollY;
    const delta = y - lastY;
    if (Math.abs(delta) < SCROLL_THRESHOLD) return;
    // A chip tapped keeps the focus, but only a keyboard's focus (or typing a search) keeps the bar in view.
    const holding = bar.querySelector(":focus-visible") || bar.querySelector("input:focus");
    const hide = delta > 0 && y > ALWAYS_SHOWN_ABOVE && !jumping && !holding;
    bar.classList.toggle("is-hidden", hide);
    lastY = y;
  };
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) requestAnimationFrame(update);
      ticking = true;
    },
    { passive: true },
  );
  bar.addEventListener("focusin", () => {
    if (bar.querySelector(":focus-visible, input:focus")) bar.classList.remove("is-hidden");
  });
}

/** 🔍 turns the bar into the search field; × (data-close-search, main.ts) clears it and turns it back. */
export function closeBarSearch() {
  byId("jump-bar").classList.remove("is-searching");
}

/** ⚙ (data-open-filters): the sheet slides up; the list stays where it was behind it. */
export function openFilterSheet() {
  openPanelSheet(byId<HTMLDialogElement>("filter-sheet"));
}

export function initJumpBar() {
  byId("jump-search-open").addEventListener("click", () => {
    byId("jump-bar").classList.add("is-searching");
    byId("jump-search").focus();
  });
  initHideOnScroll();
  // The chips inside are handled by main.ts; "Ver 12 eventos" closes it like ×. Its groups scroll between the
  // head and that button, so a drag down starts from the head or the groups' top.
  initPanelSheet(byId<HTMLDialogElement>("filter-sheet"), undefined, { scroller: byId("filter-sheet-body") });
}
