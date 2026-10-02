// Entry point of an event's own page (pages/evento/[id].astro): theme toggle, the posts sheet and the post
// viewer.
// The detail itself is already in the HTML, rendered at build time.

import type { DanceEvent } from "./types";
import { initClickTracking } from "./lib/analytics";
import { byId } from "./lib/dom";
import { initThemeToggle } from "./theme";
import { eventDetailHtml, handleDetailClick } from "./views/eventDetail";
import { initPostViewer } from "./views/postViewer";
import { initPostsSheet } from "./views/postsSheet";
import { initSaveButtons } from "./views/saveButton";
import { initSharing } from "./views/sharing";
import { initInstallPrompt, registerServiceWorker } from "./views/installPrompt";

export function initEventPage() {
  initThemeToggle();
  initClickTracking();
  initPostsSheet();
  initPostViewer();
  initSaveButtons();
  initSharing((id) => (id === event.id ? event : undefined));
  initInstallPrompt();
  registerServiceWorker();
  const event: DanceEvent = JSON.parse(byId("event-data").textContent || "null");
  const container = byId("event-detail");
  const render = (selected: number) => {
    container.innerHTML = eventDetailHtml(event, selected, { headingLevel: 1 });
  };
  container.addEventListener("click", (domEvent) => handleDetailClick(container, domEvent, event, render));
}
