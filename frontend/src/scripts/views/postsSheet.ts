// The posts announcing an event, in a sheet (components/PostsSheet.astro), opened from a card's "▦ 16", the
// details' "Ver las 16 publicaciones" or the badge on an event page's flyer: like Airbnb's "show all photos", the
// gallery takes no room in the details themselves.
//   - Flyers (photos, carousels and stories) and Videos tabs, when the event has both.
//   - Square thumbnails (160 px files made at build time), marked like Instagram's grid: ▶ for a video,
//     stacked squares for a carousel, a ring for a story. They wrap; nothing scrolls sideways.
//   - Choosing one opens it in the media viewer, in the sheet's place (postViewer.ts); on an event's page it shows
//     there instead (image, "Ver en Instagram" link and caption) and the sheet closes.

import type { DanceEvent, EventMedia } from "../types";
import { byId, escapeHtml } from "../lib/dom";
import { mediaTypeLabel } from "../lib/format";
import { ICONS } from "../lib/icons";
import { thumbUrl } from "../lib/links";
import { dismissSheet, initPanelSheet, openPanelSheet } from "../lib/sheet";

type PostKind = "flyers" | "videos";

const POST_KINDS: { kind: PostKind; label: string }[] = [
  { kind: "flyers", label: "Flyers" },
  { kind: "videos", label: "Videos" },
];

const POST_BADGES: Partial<Record<EventMedia["media_type"], string>> = {
  VIDEO: ICONS.play,
  CAROUSEL_ALBUM: ICONS.carousel,
  STORY: ICONS.story,
};

const isPostKind = (value: string | undefined): value is PostKind => POST_KINDS.some(({ kind }) => kind === value);

function postKind(media: EventMedia): PostKind {
  return media.media_type === "VIDEO" ? "videos" : "flyers";
}

let current: { event: DanceEvent; selected: number; kind: PostKind; onSelect: (index: number) => void } | null = null;

const sheet = () => byId<HTMLDialogElement>("posts-sheet");

/** `position` and `count`: the post's place within its kind, for its name ("Video 3 de 7"). */
function thumbHtml(media: EventMedia, index: number, position: number, count: number, selected: boolean): string {
  const thumb = thumbUrl(media);
  const badge = POST_BADGES[media.media_type];
  return `
    <button class="post-thumb" type="button" data-post-index="${index}" aria-pressed="${selected}"
      aria-label="${mediaTypeLabel(media.media_type)} ${position + 1} de ${count}">
      ${thumb ? `<img src="${escapeHtml(thumb)}" alt="" width="160" height="160" />` : ""}
      ${badge ? `<span class="post-thumb__badge" aria-hidden="true">${badge}</span>` : ""}
    </button>`;
}

function render() {
  if (!current) return;
  const { event, selected, kind } = current;
  const groups = POST_KINDS.map((group) => ({
    ...group,
    indexes: event.media.flatMap((media, index) => (postKind(media) === group.kind ? [index] : [])),
  })).filter((group) => group.indexes.length > 0);
  const shown = groups.find((group) => group.kind === kind) ?? groups[0];
  if (!shown) return;
  const tabs =
    groups.length > 1
      ? `<div class="post-tabs" role="group" aria-label="Tipo de publicación">${groups
          .map(
            (group) => `
              <button class="post-tabs__tab" type="button" data-post-kind="${group.kind}" aria-pressed="${group.kind === shown.kind}">
                ${group.label} <span class="post-tabs__count">${group.indexes.length}</span>
              </button>`,
          )
          .join("")}</div>`
      : "";
  const thumbs = shown.indexes
    .map((index, position) => thumbHtml(event.media[index]!, index, position, shown.indexes.length, index === selected))
    .join("");
  byId("posts-sheet-body").innerHTML = `
    ${tabs}
    <div class="posts-sheet__grid" role="group" aria-label="${shown.label}">${thumbs}</div>`;
}

/** Open the sheet on `event`'s posts, on the tab of the post shown (`selected`). */
export function openPostsSheet(event: DanceEvent, selected: number, onSelect: (index: number) => void) {
  const media = event.media[selected] ?? event.media[0];
  current = { event, selected, kind: postKind(media), onSelect };
  render();
  byId("posts-sheet-title").textContent = `${event.media.length} publicaciones`;
  openPanelSheet(sheet());
  sheet().scrollTop = 0;
  sheet().querySelector<HTMLElement>('[data-post-index][aria-pressed="true"]')?.focus({ preventScroll: true });
}

export function initPostsSheet() {
  const element = sheet();
  initPanelSheet(element, (target) => {
    const tab = target.closest<HTMLElement>("[data-post-kind]");
    const thumb = target.closest<HTMLElement>("[data-post-index]");
    if (tab && current) {
      const kind = tab.dataset.postKind;
      if (isPostKind(kind)) current.kind = kind;
      render();
      element.querySelector<HTMLElement>(`[data-post-kind="${current.kind}"]`)?.focus();
    } else if (thumb && current) {
      current.onSelect(Number(thumb.dataset.postIndex));
      dismissSheet(element);
    }
  });
}
