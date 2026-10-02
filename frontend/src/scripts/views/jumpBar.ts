// Phones only (CSS hides it where the toolbar is sticky): one slim row stuck to the top of the screen,
// like the filter bars of Google Maps or Airbnb, and the only way to the filters there (the toolbar's
// chip rows are hidden on phones, toolbar.css):
//   [⚙ 2]  [Finde ▾]  [Salsa ▾]
//   - ⚙ opens the filter sheet; the number is how many filters are active.
//   - The period dropdown names the period on screen (scroll-spy); its menu jumps to another one.
//   - The rhythm dropdown filters by rhythm; its menu lists them with their counts, most frequent first.
// Two compact dropdowns instead of a row of chips: nothing scrolls sideways or gets cut off.
// Like Instagram's header, the bar hides while scrolling down and comes back on any scroll up.

import { type AgendaGroup, sectionId } from "../state";
import { byId, prefersReducedMotion, escapeHtml } from "../lib/dom";
import { capitalize } from "../lib/format";
import type { StyleCount } from "./filters";
import { ICONS } from "../lib/icons";
import { dismissSheet, initSheet } from "../lib/sheet";

const SCROLL_THRESHOLD = 8; // px of movement before reacting, so small jitters don't toggle the bar
const BAND_TOP = 64; // px: just below the bar (--jump-bar-height + a little)
const ALWAYS_SHOWN_ABOVE = 200; // px from the top of the page where the bar never hides

let observer: IntersectionObserver | null = null;
let jumping = false; // a jump scrolls on purpose: don't hide the bar or move the highlight meanwhile
let groups: AgendaGroup[] = [];
let currentKey: string | null = null; // the period on screen (scroll-spy)
const MENU_MARGIN = 8; // px menus keep from the screen edges


export interface JumpBarContent {
  groups: AgendaGroup[]; // periods of the upcoming list (none in the calendar)
  activeFilters: number;
  styles: StyleCount[]; // rhythm options, most frequent first
  styleFilter: string;
  eventCount: number; // events in view before the rhythm filter, for "Todos los ritmos"
  showPeriods: boolean; // the upcoming list (the calendar has no periods)
}

/** The period on screen: its name on the period button, and marked in the menu. */
function setActive(key: string) {
  const group = groups.find((item) => item.key === key);
  if (!group) return;
  currentKey = key;
  byId("jump-period-label").textContent = group.shortLabel;
  byId("jump-period-menu")
    .querySelectorAll<HTMLElement>("[data-jump]")
    .forEach((item) => item.toggleAttribute("aria-current", item.dataset.jump === key));
}

function atPageBottom(): boolean {
  return window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
}

/**
 * The edges of the page, where no section crosses the band: above the list the first period is
 * current; at the very bottom, the last period on screen (it can't scroll up to the band).
 */
function highlightAtEdges() {
  if (jumping || !groups.length) return;
  const first = document.getElementById(sectionId(groups[0].key));
  if (first && first.getBoundingClientRect().top > BAND_TOP) {
    setActive(groups[0].key);
    return;
  }
  if (!atPageBottom()) return;
  const onScreen = groups.filter((group) => {
    const section = document.getElementById(sectionId(group.key));
    return section && section.getBoundingClientRect().top < window.innerHeight;
  });
  if (onScreen.length) setActive(onScreen[onScreen.length - 1].key);
}

/** Scroll-spy: the period whose section is at the top of the screen is the current one. */
function watchSections() {
  observer?.disconnect();
  const visible = new Set<string>();
  const order = groups.map((group) => group.key);
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const key = (entry.target as HTMLElement).dataset.period!;
        if (entry.isIntersecting) visible.add(key);
        else visible.delete(key);
      }
      // When two periods share the band, the one arriving (lower on the page) is the one being read.
      const current = order.findLast((key) => visible.has(key));
      if (current && !jumping && !atPageBottom()) setActive(current);
    },
    // A band just below the bar: the section crossing it is the one being read.
    { rootMargin: `-${BAND_TOP}px 0px -65% 0px` },
  );
  groups.forEach((group) => observer!.observe(byId(sectionId(group.key))));
}

/** One option of a bar menu: label on the left, its number of events on the right. `state` marks the
 * selected rhythm (aria-pressed) or the period on screen (aria-current). */
function menuItemHtml(data: string, label: string, count: number, state = ""): string {
  return `
    <button class="bar-menu__item" type="button" ${state} ${data}>
      <span>${escapeHtml(label)}</span><span class="bar-menu__count">${count}</span>
    </button>`;
}

export function renderJumpBar(content: JumpBarContent) {
  groups = content.groups;
  byId("jump-bar").hidden = false;

  const filters = byId("jump-filters");
  const count = content.activeFilters;
  filters.innerHTML = `${ICONS.sliders}${count ? `<span class="jump-bar__badge">${count}</span>` : ""}`;
  filters.setAttribute("aria-label", count ? `Filtros, ${count} activos` : "Filtros");

  // Always there in the upcoming list (disabled when nothing matches), so the bar never changes shape;
  // the calendar has no periods.
  const period = byId<HTMLButtonElement>("jump-period");
  period.hidden = !content.showPeriods;
  period.disabled = groups.length === 0;
  if (!groups.length) byId("jump-period-label").textContent = "Fechas";
  byId("jump-period-menu").innerHTML = groups
    .map((group) => menuItemHtml(`data-jump="${escapeHtml(group.key)}"`, group.label, group.events.length))
    .join("");

  const style = content.styleFilter;
  byId("jump-style-label").textContent = style === "all" ? "Ritmo" : capitalize(style);
  byId("jump-style").classList.toggle("is-active", style !== "all");
  byId("jump-style-menu").innerHTML = [
    menuItemHtml('data-style="all"', "Todos los ritmos", content.eventCount, `aria-pressed="${style === "all"}"`),
    ...content.styles.map((option) =>
      menuItemHtml(
        `data-style="${escapeHtml(option.style)}"`,
        capitalize(option.style),
        option.count,
        `aria-pressed="${option.style === style}"`,
      ),
    ),
  ].join("");

  if (groups.length) setActive(groups[0].key);
  watchSections();
}

/** Height of what's stuck to the top of the screen (the bar on phones, the toolbar on wide screens). */
function stickyOffset(): number {
  const bar = byId("jump-bar");
  if (!bar.hidden && getComputedStyle(bar).display !== "none") return bar.offsetHeight;
  const toolbar = document.querySelector<HTMLElement>(".toolbar");
  return toolbar && getComputedStyle(toolbar).position === "sticky" ? toolbar.offsetHeight : 0;
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
  if (list.hidden || !currentKey || list.getBoundingClientRect().top > stickyOffset()) return null;
  return { key: currentKey, order: groups.map((group) => group.key) };
}

/**
 * After the redraw: put that period's heading back right under the bar. If the filter removed it, the
 * next period (or else the previous one); with no results, the top of the list.
 */
export function restoreListPosition(anchor: ListAnchor) {
  const present = new Set(groups.map((group) => group.key));
  const index = anchor.order.indexOf(anchor.key);
  const candidates = [anchor.key, ...anchor.order.slice(index + 1), ...anchor.order.slice(0, index).reverse()];
  const key = candidates.find((candidate) => present.has(candidate));
  const target = key ? document.getElementById(sectionId(key)) : byId("view-upcoming");
  if (!target) return;
  jumping = true; // a scroll on purpose: don't hide the bar for it
  byId("jump-bar").classList.remove("is-hidden");
  const top = target.getBoundingClientRect().top + window.scrollY - stickyOffset() - MENU_MARGIN;
  window.scrollTo({ top: Math.max(top, 0), behavior: "auto" });
  if (key) setActive(key);
  requestAnimationFrame(() => requestAnimationFrame(() => (jumping = false)));
}

function jumpTo(key: string) {
  const section = document.getElementById(sectionId(key));
  if (!section) return;
  jumping = true;
  section.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  section.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true }); // screen readers follow the jump
  setActive(key);
  const done = () => (jumping = false);
  if ("onscrollend" in window) window.addEventListener("scrollend", done, { once: true });
  else setTimeout(done, 800);
}

/** ⚙: the filter sheet slides up from the bottom; the list stays where it was behind it. */
function initFilterSheet() {
  const sheet = byId<HTMLDialogElement>("filter-sheet");
  sheet.addEventListener("click", (domEvent) => {
    const target = domEvent.target as HTMLElement;
    // "Ver N eventos", × or a tap on the backdrop (the dialog element itself) closes it.
    if (target === sheet || target.closest("[data-close-sheet]")) dismissSheet(sheet);
  });
  // Drag it down to dismiss, from the top or whenever its content is scrolled to the top.
  initSheet(sheet, (target) => Boolean(target.closest(".filter-sheet__head")) || sheet.scrollTop <= 0);
}

/** Hide while scrolling down, show on any scroll up (and near the top, and when it holds focus). */
function initHideOnScroll() {
  const bar = byId("jump-bar");
  const menus = [byId("jump-period-menu"), byId("jump-style-menu")];
  let lastY = window.scrollY;
  let ticking = false;
  const update = () => {
    ticking = false;
    const y = window.scrollY;
    const delta = y - lastY;
    if (Math.abs(delta) < SCROLL_THRESHOLD) return;
    highlightAtEdges();
    if (!jumping) menus.filter((menu) => menu.matches(":popover-open")).forEach((menu) => menu.hidePopover());
    const hide = delta > 0 && y > ALWAYS_SHOWN_ABOVE && !jumping && !bar.contains(document.activeElement);
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
  bar.addEventListener("focusin", () => bar.classList.remove("is-hidden"));
}

export function initJumpBar() {
  byId("jump-filters").addEventListener("click", () => byId<HTMLDialogElement>("filter-sheet").showModal());
  // Each menu opens right under its button and always inside the screen: aligned to the button's left
  // edge (or right edge, for a button on the right half), never wider or taller than the space left.
  // Placed before it opens (nothing to measure yet), so CSS caps the size and the menu scrolls if needed.
  const menus = [
    ["jump-period-menu", "jump-period"],
    ["jump-style-menu", "jump-style"],
  ] as const;
  for (const [menuId, buttonId] of menus) {
    const menu = byId(menuId);
    menu.addEventListener("beforetoggle", (toggle) => {
      if ((toggle as ToggleEvent).newState !== "open") return;
      const button = byId(buttonId).getBoundingClientRect();
      const top = button.bottom + 4;
      const onRight = button.left + button.width / 2 > window.innerWidth / 2;
      menu.style.top = `${top}px`;
      menu.style.maxHeight = `${Math.max(window.innerHeight - top - MENU_MARGIN, 120)}px`;
      menu.style.left = onRight ? "auto" : `${Math.max(button.left, MENU_MARGIN)}px`;
      menu.style.right = onRight ? `${Math.max(window.innerWidth - button.right, MENU_MARGIN)}px` : "auto";
    });
  }
  // A rotated phone or resized window would leave an open menu in the wrong place: close it.
  window.addEventListener("resize", () =>
    menus.forEach(([menuId]) => byId(menuId).matches(":popover-open") && byId(menuId).hidePopover()),
  );
  byId("jump-period-menu").addEventListener("click", (domEvent) => {
    const item = (domEvent.target as HTMLElement).closest<HTMLElement>("[data-jump]");
    if (!item) return;
    byId("jump-period-menu").hidePopover();
    jumpTo(item.dataset.jump!);
  });
  // Choosing a rhythm: main.ts applies it (data-style); the menu just closes.
  byId("jump-style-menu").addEventListener("click", (domEvent) => {
    if ((domEvent.target as HTMLElement).closest("[data-style]")) byId("jump-style-menu").hidePopover();
  });
  initHideOnScroll();
  initFilterSheet();
}
