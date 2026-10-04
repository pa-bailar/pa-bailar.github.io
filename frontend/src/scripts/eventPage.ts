// Entry point of an event's own page (pages/evento/[id].astro): theme toggle, the posts sheet and the media
// viewer, the clips.
// The detail itself is already in the HTML, rendered at build time (hours ago, maybe yesterday): what depends on
// today is set again here.

import type { DanceEvent } from "./types";
import { initClickTracking } from "./lib/analytics";
import { lastDay, todayIso } from "./lib/dates";
import { byId } from "./lib/dom";
import { cardWhenLabel } from "./lib/format";
import { initThemeToggle } from "./theme";
import { eventDetailHtml, handleDetailClick } from "./views/eventDetail";
import { watchClips } from "./views/clips";
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
    container.innerHTML = eventDetailHtml(event, selected);
    watchClips(container);
  };
  // "Hoy", "Mañana" and "Este evento ya pasó" as of now, not of the build.
  const when = container.querySelector(".event-detail__when");
  if (when) when.textContent = cardWhenLabel(event);
  byId("event-past").hidden = lastDay(event) >= todayIso();
  watchClips(container);
  container.addEventListener("click", (domEvent) => handleDetailClick(container, domEvent, event, render));
}
