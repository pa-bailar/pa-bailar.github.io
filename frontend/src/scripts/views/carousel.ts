// An event announced by several posts shows them as a carousel in its card, like Instagram's (the owner, 5 October
// 2026: the card showed one flyer, and "▦ 6" opened a grid whose posts opened Instagram's embed). eventCard.ts draws
// it; this keeps it in step:
//   - Phones swipe it: a row that scrolls sideways and snaps to each slide (the browser's own scrolling, no
//     gestures of ours). Mice get ‹ › on the card's hover (and the keyboard, on focus); trackpads swipe too.
//   - "1/6" at the image's top right, and the dots in the action row under it (at most DOTS_SHOWN, the ones at the
//     edges of the window smaller while there are more), follow the slide on screen.
//   - A tap on it opens the details (main.ts, `data-event` on the strip), with the slide on screen selected: their
//     Instagram button opens that post.
//   - A video's clip plays while its slide is the one on screen (clips.ts: off-screen slides aren't in view).

import { cardLink } from "../lib/cards";
import { isPlainClick, prefersReducedMotion } from "../lib/dom";

/** Dots shown at once: a long carousel (an event with 20 posts) slides its window along. */
export const DOTS_SHOWN = 5;

export type DotState = "active" | "normal" | "small" | "hidden";

/**
 * Each dot's look for slide `index` of `count`, like Instagram's: a window of DOTS_SHOWN around the active one, its
 * edge dots small when there are more beyond them, the rest hidden.
 */
export function dotStates(count: number, index: number, shown = DOTS_SHOWN): DotState[] {
  const start = Math.min(Math.max(index - Math.floor(shown / 2), 0), Math.max(count - shown, 0));
  const end = Math.min(start + shown, count) - 1;
  return Array.from({ length: count }, (_, i) => {
    if (i === index) return "active";
    if (i < start || i > end) return "hidden";
    if ((i === start && start > 0) || (i === end && end < count - 1)) return "small";
    return "normal";
  });
}

/** The slide on screen: the one whose start is nearest the strip's scroll position. */
export function slideIndex(scrollLeft: number, width: number, count: number): number {
  if (width <= 0) return 0;
  return Math.min(Math.max(Math.round(scrollLeft / width), 0), count - 1);
}

/** "1/6", the dots and the arrows of the card holding `strip`, for the slide on screen. */
function sync(strip: HTMLElement) {
  const count = Number(strip.dataset.count) || 1;
  const index = slideIndex(strip.scrollLeft, strip.clientWidth, count);
  if (strip.dataset.index === String(index)) return;
  strip.dataset.index = String(index);
  const card = strip.closest<HTMLElement>("[data-event-card]");
  if (!card) return;
  const counter = card.querySelector<HTMLElement>("[data-carousel-count]");
  if (counter) counter.textContent = `${index + 1}/${count}`;
  const states = dotStates(count, index);
  card.querySelectorAll<HTMLElement>("[data-carousel-dots] i").forEach((dot, i) => {
    dot.className = states[i] === "normal" ? "" : `is-${states[i]}`;
  });
  card.querySelectorAll<HTMLButtonElement>("[data-carousel-step]").forEach((button) => {
    const step = Number(button.dataset.carouselStep);
    button.hidden = step < 0 ? index === 0 : index === count - 1;
  });
}

let pending = new Set<HTMLElement>();
let frame = 0;

/** Scroll events come fast: the strips that moved are synced once per frame. */
function onScroll(domEvent: Event) {
  const strip = domEvent.target;
  if (!(strip instanceof HTMLElement) || !strip.matches("[data-carousel]")) return;
  pending.add(strip);
  frame ||= requestAnimationFrame(() => {
    frame = 0;
    const strips = pending;
    pending = new Set();
    strips.forEach(sync);
  });
}

/**
 * A Ctrl, ⌘ or middle click on a card's image opens the event's page in a new tab, as it did when the image was part of
 * the card's link (it now sits above it).
 */
function openInNewTab(domEvent: MouseEvent) {
  const strip = (domEvent.target as Element | null)?.closest("[data-card-image]");
  if (!strip || isPlainClick(domEvent)) return;
  const link = cardLink(strip);
  if (!link) return;
  domEvent.preventDefault();
  window.open(link.href, "_blank", "noopener");
}

/** ‹ ›: the slide before or after (gliding, unless the visitor asks for less motion). */
function onClick(domEvent: MouseEvent) {
  openInNewTab(domEvent);
  const button = (domEvent.target as Element | null)?.closest<HTMLElement>("[data-carousel-step]");
  if (!button) return;
  const strip = button.closest("[data-event-card]")?.querySelector<HTMLElement>("[data-carousel]");
  if (!strip) return;
  domEvent.preventDefault();
  const behavior = prefersReducedMotion() ? "auto" : "smooth";
  strip.scrollBy({ left: Number(button.dataset.carouselStep) * strip.clientWidth, behavior });
}

/** The slide on screen in the card holding `element` (0 without a carousel): the details select it. */
export function carouselSlide(element: Element): number {
  const strip = element.closest("[data-event-card]")?.querySelector<HTMLElement>("[data-carousel]");
  return strip ? Number(strip.dataset.index) || 0 : 0;
}

/** Once, at start: scroll events don't bubble, so one listener catches them all on the way down. */
export function initCarousels() {
  document.addEventListener("scroll", onScroll, { capture: true, passive: true });
  document.addEventListener("click", onClick);
  document.addEventListener("auxclick", (domEvent) => domEvent.button === 1 && openInNewTab(domEvent)); // the middle button
}
