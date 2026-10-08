// Entry point of an event's own page (pages/evento/[id].astro): theme toggle, the posts sheet and the media
// viewer, the clips.
// The detail itself is already in the HTML, rendered at build time (hours ago, maybe yesterday): what depends on
// today is set again here.

import type { DanceEvent } from "./types";
import { initClickTracking } from "./lib/analytics";
import { isSeries, isUpcoming } from "./lib/dates";
import { byId } from "./lib/dom";
import { cardWhenLabel } from "./lib/format";
import { initThemeToggle } from "./theme";
import { eventDetailHtml } from "./views/eventDetail";
import { handleDetailClick } from "./views/eventDetailActions";
import { watchClips } from "./views/clips";
import { initPostViewer } from "./views/postViewer";
import { initPostsSheet } from "./views/postsSheet";
import { initSaveButtons } from "./views/saveButton";
import { initSharing } from "./views/sharing";
import { initInstallPrompt, registerServiceWorker } from "./views/installPrompt";
import { initNotice } from "./views/notice";

export function initEventPage() {
  initThemeToggle();
  initClickTracking();
  initPostsSheet();
  initPostViewer();
  initSaveButtons();
  initSharing((id) => (id === event.id ? event : undefined));
  initNotice(); // "Enlace copiado" where there's no share menu
  initInstallPrompt();
  registerServiceWorker();
  const event: DanceEvent = JSON.parse(byId("event-data").textContent || "null");
  const container = byId("event-detail");
  const render = (selected: number) => {
    container.innerHTML = eventDetailHtml(event, selected);
    watchClips(container);
  };
  // "Hoy", "Mañana" and "Este evento ya pasó" as of now, not of the build. A workshop series is drawn again whole: its
  // date sticker and its sessions (the next one, those past) depend on the day too.
  if (isSeries(event)) render(0);
  else {
    const when = container.querySelector(".event-detail__when");
    if (when) when.textContent = cardWhenLabel(event);
    watchClips(container);
  }
  byId("event-past").hidden = isUpcoming(event); // a night past midnight: not before its end time
  container.addEventListener("click", (domEvent) => handleDetailClick(container, domEvent, event, render));
}
