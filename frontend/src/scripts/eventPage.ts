// Entry point of an event's own page (pages/evento/[id].astro): theme toggle and the post thumbnails.
// The detail itself is already in the HTML, rendered at build time.

import type { DanceEvent } from "./types";
import { initClickTracking } from "./lib/analytics";
import { byId } from "./lib/dom";
import { initThemeToggle } from "./theme";
import { eventDetailHtml, handlePostClick } from "./views/eventDetail";

export function initEventPage() {
  initThemeToggle();
  initClickTracking();
  const event: DanceEvent = JSON.parse(byId("event-data").textContent || "null");
  const container = byId("event-detail");
  const render = (selected: number, showAllPosts: boolean) => {
    container.innerHTML = eventDetailHtml(event, selected, { headingLevel: 1, showAllPosts });
  };
  container.addEventListener("click", (domEvent) => handlePostClick(container, domEvent.target as HTMLElement, render));
}
