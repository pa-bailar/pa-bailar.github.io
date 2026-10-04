// "Watch here": tapping a flyer shows its post inside the site, in a sheet (components/PostViewer.astro),
// with Instagram's own player (lib/instagramEmbed.ts): a video plays here, and a carousel swipes through all
// its slides. Opening the Instagram app instead would leave the site, and the app's back button doesn't
// come back here.
//   - "Abrir en Instagram ↗" stays in the sheet's bar, for whoever wants the app.
//   - Our copy of the flyer shows at once, and Instagram's player replaces it when it's ready. If it can't
//     load (blocked, offline, too slow), the flyer stays, with a note.
//   - Closing it (×, backdrop, drag down, back, Escape) removes the player, so a video stops.
//   - A story (lib/mediaLabel.ts) has no post to play: its flyer shows alone, with where it came from, and the bar's
//     link is "Ver perfil en Instagram ↗".

import type { DanceEvent, EventMedia } from "../types";
import { byId, escapeHtml } from "../lib/dom";
import { renderInstagramPost } from "../lib/instagramEmbed";
import { flyerUrl } from "../lib/links";
import { isStory, storySource } from "../lib/mediaLabel";
import { initPanelSheet, openPanelSheet } from "../lib/sheet";
import { holdClips } from "./clips";

let request = 0; // the latest opening: a slow player from an earlier post never lands in a later one

const sheet = () => byId<HTMLDialogElement>("post-viewer");

/** `replacing`: the sheet of posts it was chosen from, which it takes the place of (lib/sheet.ts). */
export function openPostViewer(event: DanceEvent, media: EventMedia, { replacing }: { replacing?: HTMLDialogElement } = {}) {
  const flyer = flyerUrl(media);
  const size = media.width && media.height ? ` width="${media.width}" height="${media.height}"` : "";
  const story = isStory(media);
  byId("post-viewer-title").textContent = `@${event.account}`;
  const open = byId<HTMLAnchorElement>("post-viewer-open");
  open.href = media.permalink;
  open.textContent = story ? "Ver perfil en Instagram ↗" : "Abrir en Instagram ↗";
  open.dataset.track = story ? "instagram-perfil-desde-visor" : "instagram-desde-visor";
  const body = byId("post-viewer-body");
  body.classList.remove("is-ready");
  const current = ++request;
  if (story) {
    body.innerHTML = `
      <div class="post-viewer__placeholder">
        ${flyer ? `<img src="${escapeHtml(flyer)}"${size} alt="Flyer de ${escapeHtml(event.title)}" />` : ""}
        <p class="post-viewer__status">${escapeHtml(storySource(event, media))}</p>
      </div>`;
    openPanelSheet(sheet(), { replacing });
    sheet().scrollTop = 0;
    return;
  }
  body.innerHTML = `
    <div class="post-viewer__placeholder">
      ${flyer ? `<img src="${escapeHtml(flyer)}"${size} alt="" />` : ""}
      <p class="post-viewer__status" role="status">Cargando la publicación…</p>
    </div>
    <div class="post-viewer__embed"></div>`;
  openPanelSheet(sheet(), { replacing });
  sheet().scrollTop = 0;
  holdClips("post-viewer", true); // with sound here, the feed's silent clip waits

  void renderInstagramPost(body.querySelector<HTMLElement>(".post-viewer__embed")!, media.permalink).then((shown) => {
    if (current !== request || !sheet().open) return;
    if (shown) body.classList.add("is-ready");
    else body.querySelector(".post-viewer__status")!.textContent = "Esta publicación solo se puede ver en Instagram.";
  });
}

export function initPostViewer() {
  const element = sheet();
  initPanelSheet(element);
  element.addEventListener("close", () => {
    request++;
    byId("post-viewer-body").innerHTML = ""; // removes the player: a playing video stops
    holdClips("post-viewer", false);
  });
}
