// Phones only (CSS hides it where the toolbar with the view tabs is sticky): a round-cornered icon
// button floating at the bottom right that switches between the upcoming list and the calendar. On
// phones the tabs scroll away with the page, so without it the calendar is easy to forget. While the tabs are on
// screen it stays away: they do the same, and on a first visit it would cover the first card's date sticker.

import type { View } from "../types";
import { byId } from "../lib/dom";
import { ICONS } from "../lib/icons";

const TARGET: Record<View, { view: View; label: string; icon: string }> = {
  upcoming: { view: "calendar", label: "Ver calendario", icon: ICONS.calendar },
  calendar: { view: "upcoming", label: "Ver próximos eventos", icon: ICONS.list },
};

/** The button offers the view that isn't on screen. */
export function renderViewSwitch(current: View) {
  const target = TARGET[current];
  const button = byId("view-switch");
  button.innerHTML = target.icon;
  button.dataset.switchTo = target.view;
  button.setAttribute("aria-label", target.label);
  button.title = target.label;
}

export function initViewSwitch(show: (view: View) => void) {
  const button = byId("view-switch");
  button.addEventListener("click", () => show(button.dataset.switchTo as View));
  const tabs = document.querySelector(".toolbar .tabs");
  if (!tabs || !("IntersectionObserver" in window)) {
    button.classList.remove("is-away"); // it arrives away (ViewSwitch.astro)
    return;
  }
  // The tabs count as gone once under the jump bar stuck to the top (--jump-bar-height).
  const barHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--jump-bar-height")) || 0;
  new IntersectionObserver(([entry]) => button.classList.toggle("is-away", Boolean(entry?.isIntersecting)), {
    rootMargin: `-${barHeight}px 0px 0px 0px`,
  }).observe(tabs);
}
