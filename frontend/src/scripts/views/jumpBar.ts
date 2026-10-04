// Phones only (CSS hides it where the toolbar is sticky): one slim row stuck to the top of the screen,
// like the filter bars of Google Maps or Airbnb, and the only way to the filters there (the toolbar's
// chip rows are hidden on phones, toolbar.css):
//   [⚙ 2]  [Finde ▾]  [Salsa ▾]
//   - ⚙ opens the filter sheet; the number is how many filters are active.
//   - The date dropdown filters by period ("Hoy", "Mañana", "Este fin de semana", a month…). With none
//     chosen it names the period on screen (scroll-spy); with some, what's chosen ("Hoy + finde").
//   - The rhythm dropdown filters by rhythm; its menu lists them with their counts, most frequent first.
//   Both menus are checklists: several choices at once (an event matches any of them), and the menu stays
//   open while choosing ("Listo", a tap outside or Escape close it).
// Two compact dropdowns instead of a row of chips: nothing scrolls sideways or gets cut off.
// Like Instagram's header, the bar hides while scrolling down and comes back on any scroll up.

import { type AgendaGroup, sectionId } from "../state";
import { byId, escapeHtml } from "../lib/dom";
import { capitalize, eventCountLabel } from "../lib/format";
import { type FilterOptions, datesButtonLabel, stylesButtonLabel } from "./filters";
import { ICONS } from "../lib/icons";
import { initPanelSheet, openPanelSheet } from "../lib/sheet";

const SCROLL_THRESHOLD = 8; // px of movement before reacting, so small jitters don't toggle the bar
const BAND_TOP = 64; // px: just below the bar (--jump-bar-height + a little)
const ALWAYS_SHOWN_ABOVE = 200; // px from the top of the page where the bar never hides

let observer: IntersectionObserver | null = null;
let jumping = false; // a jump scrolls on purpose: don't hide the bar or move the highlight meanwhile
let groups: AgendaGroup[] = [];
let currentKey: string | null = null; // the period on screen (scroll-spy)
let datesChosen = false; // the date button names the chosen periods, not the one on screen
const MENU_MARGIN = 8; // px menus keep from the screen edges

export interface JumpBarContent {
  groups: AgendaGroup[]; // periods of the upcoming list (none in the calendar)
  activeFilters: number;
  options: FilterOptions; // rhythms and dates, with their counts
  styles: string[]; // rhythms chosen
  dates: string[]; // periods chosen
  showPeriods: boolean; // the upcoming list (the calendar has no periods)
  searching: boolean; // a search is on: the bar is the search field
}

/** The period on screen: its name on the date button while no date is chosen. */
function setActive(key: string) {
  const group = groups.find((item) => item.key === key);
  if (!group) return;
  currentKey = key;
  if (!datesChosen) byId("jump-period-label").textContent = group.shortLabel;
}

function atPageBottom(): boolean {
  return window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
}

/**
 * The edges of the page, where no section crosses the band: above the list the first period is
 * current; at the very bottom, the last period on screen (it can't scroll up to the band).
 */
function highlightAtEdges() {
  const firstGroup = groups[0];
  if (jumping || !firstGroup) return;
  const first = document.getElementById(sectionId(firstGroup.key));
  if (first && first.getBoundingClientRect().top > BAND_TOP) {
    setActive(firstGroup.key);
    return;
  }
  if (!atPageBottom()) return;
  const onScreen = groups.filter((group) => {
    const section = document.getElementById(sectionId(group.key));
    return section && section.getBoundingClientRect().top < window.innerHeight;
  });
  const last = onScreen.at(-1);
  if (last) setActive(last.key);
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

/** One option of a bar menu, a checkbox: its box, the label, and its number of events on the right. */
function menuItemHtml(data: string, label: string, count: number, checked: boolean): string {
  return `
    <button class="bar-menu__item" type="button" role="checkbox" aria-checked="${checked}" ${data}
      aria-label="${escapeHtml(`${label}, ${eventCountLabel(count)}`)}">
      <span class="bar-menu__check" aria-hidden="true"></span><span class="bar-menu__label">${escapeHtml(label)}</span><span class="bar-menu__count">${count}</span>
    </button>`;
}

/** "Listo" at the bottom of a menu: choosing several keeps it open, this closes it. */
function doneHtml(menuId: string): string {
  return `<div class="bar-menu__footer"><button class="btn bar-menu__done" type="button" popovertarget="${menuId}" popovertargetaction="hide">Listo</button></div>`;
}

/** "Salsa y Bachata", "Hoy, Mañana y Este fin de semana": what's chosen, for screen readers. */
function spokenList(labels: string[]): string {
  return labels.length > 1 ? `${labels.slice(0, -1).join(", ")} y ${labels.at(-1)}` : (labels[0] ?? "");
}

export function renderJumpBar(content: JumpBarContent) {
  groups = content.groups;
  byId("jump-bar").hidden = false;
  if (content.searching) byId("jump-bar").classList.add("is-searching");

  const filters = byId("jump-filters");
  const count = content.activeFilters;
  filters.innerHTML = `${ICONS.sliders}${count ? `<span class="jump-bar__badge">${count}</span>` : ""}`;
  filters.setAttribute("aria-label", count ? `Filtros, ${count} activos` : "Filtros");

  // Always there in the upcoming list (disabled when there's nothing to choose), so the bar never changes
  // shape; the calendar has no periods.
  const { options, dates, styles } = content;
  datesChosen = dates.length > 0;
  const period = byId<HTMLButtonElement>("jump-period");
  period.hidden = !content.showPeriods;
  period.disabled = !options.dates.length;
  period.classList.toggle("is-active", datesChosen);
  const periodLabel = byId("jump-period-label");
  if (datesChosen || !groups.length) periodLabel.textContent = datesButtonLabel(options.dates, dates);
  // "Hoy + próx. semana" cut short says less than "2 fechas".
  if (periodLabel.scrollWidth > periodLabel.clientWidth) periodLabel.textContent = datesButtonLabel(options.dates, dates, true);
  const chosenDates = options.dates.filter((option) => dates.includes(option.key)).map((option) => option.label);
  period.setAttribute("aria-label", datesChosen ? `Fechas: ${spokenList(chosenDates)}` : "Filtrar por fecha");
  byId("jump-period-menu").innerHTML =
    [
      menuItemHtml('data-date="all"', "Todas las fechas", options.dateTotal, !datesChosen),
      ...options.dates.map((option) =>
        menuItemHtml(`data-date="${escapeHtml(option.key)}"`, option.label, option.count, dates.includes(option.key)),
      ),
    ].join("") + doneHtml("jump-period-menu");

  const style = byId("jump-style");
  byId("jump-style-label").textContent = stylesButtonLabel(styles);
  style.classList.toggle("is-active", styles.length > 0);
  style.setAttribute("aria-label", styles.length ? `Ritmos: ${spokenList(styles.map(capitalize))}` : "Filtrar por ritmo");
  byId("jump-style-menu").innerHTML =
    [
      menuItemHtml('data-style="all"', "Todos los ritmos", options.styleTotal, !styles.length),
      ...options.styles.map((option) =>
        menuItemHtml(`data-style="${escapeHtml(option.style)}"`, capitalize(option.style), option.count, styles.includes(option.style)),
      ),
    ].join("") + doneHtml("jump-style-menu");

  if (groups[0]) setActive(groups[0].key);
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

/** Back to the exact scroll position a view was left at; `anchor`: the list's period there. */
export function returnToScroll(scrollY: number, anchor: ListAnchor | null = null) {
  jumping = true; // a scroll on purpose: don't hide the bar for it
  byId("jump-bar").classList.remove("is-hidden");
  window.scrollTo({ top: scrollY, behavior: "auto" });
  if (anchor) setActive(anchor.key);
  requestAnimationFrame(() => requestAnimationFrame(() => (jumping = false)));
}

/** ⚙: the filter sheet slides up from the bottom; the list stays where it was behind it. "Ver N eventos"
 * closes it like ×; the chips inside are handled by main.ts. */
function initFilterSheet() {
  initPanelSheet(byId<HTMLDialogElement>("filter-sheet"));
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

/** 🔍 turns the bar into the search field; × (data-close-search, main.ts) clears it and turns it back. */
export function closeBarSearch() {
  byId("jump-bar").classList.remove("is-searching");
}

export function initJumpBar() {
  byId("jump-search-open").addEventListener("click", () => {
    byId("jump-bar").classList.add("is-searching");
    byId("jump-search").focus();
  });
  byId("jump-filters").addEventListener("click", () => openPanelSheet(byId<HTMLDialogElement>("filter-sheet")));
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
      const left = Math.max(button.left, MENU_MARGIN);
      const right = Math.max(window.innerWidth - button.right, MENU_MARGIN);
      menu.style.left = onRight ? "auto" : `${left}px`;
      menu.style.right = onRight ? `${right}px` : "auto";
      // Never past the far edge either: what's left from the aligned edge (long names wrap).
      menu.style.maxWidth = `${window.innerWidth - (onRight ? right : left) - MENU_MARGIN}px`;
    });
  }
  // A rotated phone or resized window would leave an open menu in the wrong place: close it.
  window.addEventListener("resize", () =>
    menus.forEach(([menuId]) => byId(menuId).matches(":popover-open") && byId(menuId).hidePopover()),
  );
  // Choosing a date or a rhythm: main.ts applies it (data-date, data-style); the menu stays open, for more.
  initHideOnScroll();
  initFilterSheet();
}
