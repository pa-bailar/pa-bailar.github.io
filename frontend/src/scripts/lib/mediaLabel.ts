// What the label over a post's image says, so it's clear there's more than a still picture (tapping opens the
// post with Instagram's player, views/postViewer.ts):
//   - a video with a clip (it already plays, silent): "Ver con sonido"
//   - a video without one (Instagram gave no file, e.g. licensed music): "Ver video"
//   - a carousel: "Ver las 4", its slides
//   - a story: "Historia", where it came from (nothing more to see: the story itself is gone after 24 hours)
//   - a single photo: no label (the flyer is the whole post)

import type { DanceEvent, EventMedia } from "../types";

export interface MediaLabel {
  icon: "play" | "carousel" | "story";
  text: string;
}

/**
 * A screenshot of an Instagram story (docs/DATA.md): its flyer is all there is. Instagram's player can't show it
 * (its link is the account's profile), so it's shown as a plain image, and its link says "Ver perfil".
 */
export const isStory = (media: EventMedia): boolean => media.media_type === "STORY";

export function mediaLabel(media: EventMedia): MediaLabel | null {
  if (isStory(media)) return { icon: "story", text: "Historia" };
  if (media.preview) return { icon: "play", text: "Ver con sonido" };
  if (media.media_type === "VIDEO") return { icon: "play", text: "Ver video" };
  if (media.media_type === "CAROUSEL_ALBUM" && media.slides && media.slides > 1) {
    return { icon: "carousel", text: `Ver las ${media.slides}` };
  }
  return null;
}

/** The event's image is a video: its card says "Video", and the details' Instagram button plays it. */
export const isVideoCover = (media: EventMedia): boolean =>
  !isStory(media) && (Boolean(media.preview) || media.media_type === "VIDEO");

/** The story's account, read from its link (its profile): "academia". Null for a post. */
export function storyAccount(media: EventMedia): string | null {
  if (!isStory(media)) return null;
  return /^https:\/\/www\.instagram\.com\/([A-Za-z0-9._]+)\/$/.exec(media.permalink)?.[1] ?? null;
}

/**
 * Where a story's flyer came from, said with its link (the details, the media viewer): "De una historia de
 * @academia · las historias duran 24 horas", so the profile it leads to (the account, not the story)
 * makes sense. The event's account when the link doesn't name one.
 */
export function storySource(event: Pick<DanceEvent, "account">, media: EventMedia): string {
  return `De una historia de @${storyAccount(media) ?? event.account} · las historias duran 24 horas`;
}
