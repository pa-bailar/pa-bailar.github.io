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
//   - An account's @ (on a card, in the details) opens its profile here too, Instagram's profile embed: its photo,
//     counts and latest posts, without leaving the site (the owner's call of 4 October 2026: Instagram's app took
//     over the back button). Until then the card's @ filtered the list to the account; that filter is gone.

import type { DanceEvent, EventMedia } from "../types";
import { byId, escapeHtml } from "../lib/dom";
import { renderInstagramPost } from "../lib/instagramEmbed";
import { flyerUrl, profileEmbedUrl, profileUrl } from "../lib/links";
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
  body.classList.remove("is-ready", "post-viewer__body--profile");
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

/** An account's profile in the sheet. */
export function openProfileViewer(account: string) {
  byId("post-viewer-title").textContent = `@${account}`;
  const open = byId<HTMLAnchorElement>("post-viewer-open");
  open.href = profileUrl(account);
  open.textContent = "Abrir en Instagram ↗";
  open.dataset.track = "instagram-perfil-desde-visor";
  const body = byId("post-viewer-body");
  body.classList.remove("is-ready");
  const current = ++request;
  const name = escapeHtml(account);
  body.innerHTML = `
    <div class="post-viewer__placeholder">
      <p class="post-viewer__status" role="status">Cargando el perfil…</p>
    </div>
    <div class="post-viewer__embed post-viewer__embed--profile">
      <iframe src="${escapeHtml(profileEmbedUrl(account))}" title="Perfil de @${name} en Instagram"></iframe>
    </div>`;
  body.classList.add("post-viewer__body--profile");
  // The frame's "load" comes before Instagram draws the profile (its script fills it a moment later): the sheet's
  // "Cargando el perfil…" stays over it a little longer, so there's no blank white box.
  const frame = body.querySelector("iframe")!;
  frame.addEventListener("load", () => window.setTimeout(() => current === request && body.classList.add("is-ready"), 1500), {
    once: true,
  });
  // An embed that never arrives (blocked, offline): the bar's link still works.
  window.setTimeout(() => {
    if (current !== request || body.classList.contains("is-ready")) return;
    body.querySelector(".post-viewer__status")!.textContent = "El perfil no cargó aquí: ábrelo en Instagram.";
  }, 10_000);
  openPanelSheet(sheet());
  sheet().scrollTop = 0;
}

export function initPostViewer() {
  const element = sheet();
  initPanelSheet(element);
  // A tap on an account's @ opens its profile here; a new tab or window (a modifier key) still gets Instagram.
  document.addEventListener("click", (domEvent) => {
    const link = (domEvent.target as HTMLElement).closest<HTMLAnchorElement>("a[data-profile]");
    if (!link || domEvent.defaultPrevented || domEvent.button !== 0) return;
    if (domEvent.metaKey || domEvent.ctrlKey || domEvent.shiftKey || domEvent.altKey) return;
    domEvent.preventDefault();
    openProfileViewer(link.dataset.profile!);
  });
  element.addEventListener("close", () => {
    request++;
    byId("post-viewer-body").innerHTML = ""; // removes the player: a playing video stops
    holdClips("post-viewer", false);
  });
}
