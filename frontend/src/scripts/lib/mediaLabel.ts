// What the label over a post's image says, so it's clear there's more than a still picture (tapping opens the
// post with Instagram's player, views/postViewer.ts):
//   - a video with a clip (it already plays, silent): "Ver con sonido"
//   - a video without one (Instagram gave no file, e.g. licensed music): "Ver video"
//   - a carousel: "Ver las 4", its slides
//   - a single photo: no label (the flyer is the whole post)

import type { EventMedia } from "../types";

export interface MediaLabel {
  icon: "play" | "carousel";
  text: string;
}

export function mediaLabel(media: EventMedia): MediaLabel | null {
  if (media.preview) return { icon: "play", text: "Ver con sonido" };
  if (media.media_type === "VIDEO") return { icon: "play", text: "Ver video" };
  if (media.media_type === "CAROUSEL_ALBUM" && media.slides && media.slides > 1) {
    return { icon: "carousel", text: `Ver las ${media.slides}` };
  }
  return null;
}

/** The card shows a play mark when the event's image is a video. */
export const isVideoCover = (media: EventMedia): boolean => Boolean(media.preview) || media.media_type === "VIDEO";
