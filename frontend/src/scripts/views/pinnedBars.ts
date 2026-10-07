// The bars pinned to the top of the screen: the wide screens' toolbar (toolbar.css) and the phones' jump bar
// (jumpBar.ts). How tall they are (stickyOffset; --pinned-height, which scroll-padding keeps focused and jumped-to
// things clear of, base.css), the room they leave on screen (room, inSight: what the keyboard and the side panel
// measure against), and whether each is pinned yet (data-pinned: the dark theme's bars are clear until then).

import { byId } from "../lib/dom";

/** Height of what's stuck to the top of the screen (the bar and its line on phones, the toolbar on wide screens). */
export function stickyOffset(): number {
  const bar = byId("jump-bar");
  if (!bar.hidden && getComputedStyle(bar).display !== "none") return bar.offsetHeight;
  const toolbar = document.querySelector<HTMLElement>(".toolbar");
  return toolbar && getComputedStyle(toolbar).position === "sticky" ? toolbar.offsetHeight : 0;
}

/** The room the pinned bars leave on screen: scroll-padding (base.css) is what they cover, top and bottom. */
export function room(): { top: number; bottom: number } {
  const style = getComputedStyle(document.documentElement);
  const pad = (value: string) => parseFloat(value) || 0;
  return { top: pad(style.scrollPaddingTop), bottom: innerHeight - pad(style.scrollPaddingBottom) };
}

/** Whether any of `element` shows in that room: a card in focus there is where the visitor is. */
export function inSight(element: Element): boolean {
  const { top, bottom } = room();
  const box = element.getBoundingClientRect();
  return box.height > 0 && box.bottom > top && box.top < bottom;
}

/**
 * Wide screens: --pinned-height is the sticky toolbar's real height, which changes with the filters' status row and
 * in Guardados. Its CSS value is the phones' bar: on wide screens, 68 px against a toolbar over 100 px tall, the arrows
 * put a calendar card's top under it (found by the site-checks toolkit, 6 Oct 2026). Phones keep the CSS value (the
 * toolbar isn't shown there).
 */
function trackPinnedHeight() {
  const toolbar = document.querySelector<HTMLElement>(".toolbar");
  if (!toolbar || typeof ResizeObserver === "undefined") return;
  const root = document.documentElement.style;
  new ResizeObserver(() => {
    if (getComputedStyle(toolbar).position === "sticky" && toolbar.offsetHeight > 0) {
      root.setProperty("--pinned-height", `${toolbar.offsetHeight}px`);
    } else {
      root.removeProperty("--pinned-height");
    }
  }).observe(toolbar);
}

/**
 * Marks `bar` (sticky at the top) data-pinned="false" while it's still in its place under the header, "true" once
 * pinned: the dark theme's lighting shows through it there (base.css). A line right above it says which: on screen,
 * not pinned.
 */
function trackPinned(bar: HTMLElement | null) {
  if (!bar || typeof IntersectionObserver === "undefined") return;
  const sentinel = document.createElement("div");
  sentinel.className = "pin-sentinel";
  sentinel.setAttribute("aria-hidden", "true");
  bar.before(sentinel);
  new IntersectionObserver(([entry]) => {
    bar.dataset.pinned = String(!entry?.isIntersecting);
  }).observe(sentinel);
}

export function initPinnedBars() {
  trackPinnedHeight();
  trackPinned(document.querySelector<HTMLElement>(".toolbar"));
  trackPinned(byId("jump-bar"));
}
