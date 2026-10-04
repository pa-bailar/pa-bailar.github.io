// First visit only: the first card's "Detalles" pulses gently once, so it's clear that an event opens (instead of
// a hint bubble covering the list). It plays when that card's action row is fully on screen, then never again in
// this browser (lib/onceFlag.ts). Opening any event's details counts as having learned it, so no pulse after
// that. Nothing moves with reduced motion.

import { prefersReducedMotion } from "../lib/dom";
import { onceFlag } from "../lib/onceFlag";

const flag = onceFlag("details-hint-seen");
const PULSE = "is-pulsing";

let observer: IntersectionObserver | null = null;
let watching: Element | null = null;

/** The visitor opened details: they know. */
export function markDetailsHintSeen() {
  flag.mark();
  stop();
}

function stop() {
  observer?.disconnect();
  observer = null;
  watching = null;
}

function pulse(button: HTMLElement) {
  markDetailsHintSeen();
  button.classList.add(PULSE);
  button.addEventListener("animationend", () => button.classList.remove(PULSE), { once: true });
}

/**
 * After every render: watch the first card's "Detalles" in the view on screen (filters and views replace the
 * cards, so the one to watch can change). It pulses once it's fully in view.
 */
export function armDetailsHint() {
  if (typeof IntersectionObserver === "undefined" || flag.seen() || prefersReducedMotion()) return stop();
  const button = [...document.querySelectorAll<HTMLElement>("main .event-card__details")].find(
    (item) => item.offsetParent !== null, // in the view on screen, not a hidden one
  );
  if (!button || button === watching) return;
  stop();
  watching = button;
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.99)) pulse(button);
    },
    { threshold: [0.99], rootMargin: "0px 0px -10% 0px" }, // well inside the screen, not at its very edge
  );
  observer.observe(button);
}
