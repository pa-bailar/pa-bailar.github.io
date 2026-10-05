// What the clicks in an event's details open (eventDetail.ts draws them): the post in the media viewer, the event's
// posts in their sheet, a video in place on the event's page. Apart from the HTML, so the pages that draw the details
// at build time (pages/evento/[id].astro) don't load the browser's sheets and players.

import type { DanceEvent } from "../types";
import { byId, isPlainClick } from "../lib/dom";
import { isVideoCover } from "../lib/mediaLabel";
import { playInline } from "./inlinePlayer";
import { openPostViewer } from "./postViewer";
import { openPostsSheet } from "./postsSheet";

/** An event's posts in their sheet; the one chosen opens in the media viewer, in the sheet's place. */
export function openEventPosts(event: DanceEvent, selected = 0) {
  openPostsSheet(event, selected, (index) => {
    const media = event.media[index];
    if (media) openPostViewer(event, media, { replacing: byId<HTMLDialogElement>("posts-sheet") });
  });
}

/**
 * A media link of the details (`[data-media-link]`): the post (its video, its images) in the media viewer, or the
 * event's posts. False for any other click, and for a new-tab click on the main button (it follows its link).
 */
export function handleMediaLinkClick(domEvent: MouseEvent, event: DanceEvent): boolean {
  const link = (domEvent.target as HTMLElement).closest<HTMLElement>("[data-media-link]");
  if (!link) return false;
  if (link instanceof HTMLAnchorElement && !isPlainClick(domEvent)) return false;
  domEvent.preventDefault();
  const selected = Number(link.dataset.post ?? 0);
  if (link.dataset.mediaLink === "publicaciones") openEventPosts(event, selected);
  else openPostViewer(event, event.media[selected] ?? event.media[0]);
  return true;
}

/**
 * Clicks on an event's page that open something, false for any other:
 *   - the flyer: watch the post here (a video in place, inlinePlayer.ts; else the media viewer, postViewer.ts).
 *     A new-tab click follows the link to Instagram. A story's flyer is a plain image, not a link: nothing happens;
 *   - the posts badge: every post in a sheet; choosing one shows it on the page (its image, its Instagram
 *     button and caption);
 *   - the media links, as in the drawer.
 */
export function handleDetailClick(
  container: HTMLElement,
  domEvent: MouseEvent,
  event: DanceEvent,
  render: (selected: number) => void,
): boolean {
  const target = domEvent.target as HTMLElement;
  const flyer = target.closest<HTMLElement>("[data-view-post]");
  if (flyer) {
    const media = event.media[Number(flyer.dataset.viewPost)];
    if (!media || !isPlainClick(domEvent)) return false;
    domEvent.preventDefault();
    const frame = flyer.closest<HTMLElement>(".event-detail__frame");
    if (isVideoCover(media) && frame) playInline(frame, media.permalink);
    else openPostViewer(event, media);
    return true;
  }
  const badge = target.closest<HTMLElement>("[data-open-posts]");
  if (!badge) return handleMediaLinkClick(domEvent, event);
  openPostsSheet(event, Number(badge.dataset.selected ?? 0), (index) => {
    render(index);
    container.querySelector<HTMLElement>("[data-open-posts]")?.focus({ preventScroll: true });
  });
  return true;
}
