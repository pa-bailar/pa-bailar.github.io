// Phones only (CSS hides it where the toolbar with the view tabs is sticky): a button floating at the
// bottom of the screen that switches between the upcoming list and the calendar, like the "Map" / "List"
// button of Airbnb or Google Maps. On phones the tabs scroll away with the page, so without it the
// calendar is easy to forget once you start scrolling.

import type { View } from "../types";
import { byId } from "../lib/dom";
import { ICONS } from "../lib/icons";

const TARGET: Record<View, { view: View; label: string; icon: string }> = {
  upcoming: { view: "calendar", label: "Calendario", icon: ICONS.calendar },
  calendar: { view: "upcoming", label: "Próximos", icon: ICONS.list },
};

/** The button offers the view that isn't on screen. */
export function renderViewSwitch(current: View) {
  const target = TARGET[current];
  const button = byId("view-switch");
  button.innerHTML = `${target.icon}<span>${target.label}</span>`;
  button.dataset.switchTo = target.view;
  button.setAttribute("aria-label", `Ver ${target.label.toLowerCase()}`);
}

/** `show` renders the other view; then, if the page was scrolled past the tabs, it goes back up to them. */
export function initViewSwitch(show: (view: View) => void) {
  const button = byId("view-switch");
  button.addEventListener("click", () => {
    show(button.dataset.switchTo as View);
    const toolbar = document.querySelector<HTMLElement>(".toolbar");
    if (toolbar && toolbar.getBoundingClientRect().top < 0) {
      window.scrollTo({ top: toolbar.getBoundingClientRect().top + window.scrollY, behavior: "auto" });
    }
  });
}
