// A video plays where its image was: on an event's own page (eventDetail.ts, handleDetailClick), tapping a video's
// flyer (a reel, or a carousel shown with its clip) turns the image itself into Instagram's player
// (lib/instagramEmbed.ts), full length and with sound, in the same place, instead of a sheet on top. The details
// stay below it.
//   - Our caption is already in the detail ("Texto de la publicación"), so the player comes without
//     Instagram's: shorter.
//   - While it loads, the image stays with "Cargando el video…"; if it can't load (blocked, offline, slow),
//     the image comes back with "Ábrelo en Instagram" (the link under it).
//   - It stops when it isn't seen anymore (scrolled out of sight): the player is removed and the image comes back,
//     so no sound plays from a video off screen.
// Photos and carousels open in the media viewer instead (postViewer.ts).

import { renderInstagramPost } from "../lib/instagramEmbed";
import { releaseClips, watchClips } from "./clips";

const GONE = 0.25; // share still on screen under which a player is removed

let observer: IntersectionObserver | null = null;

/** Put a frame back as it was: its image (or clip) and label. */
function restore(frame: HTMLElement) {
  const saved = frame.dataset.inlineSaved;
  if (saved === undefined) return;
  frame.innerHTML = saved;
  delete frame.dataset.inlineSaved;
  frame.classList.remove("is-playing", "is-loading");
  observer?.unobserve(frame);
  watchClips(frame); // its clip plays again
}

function onSight(entries: IntersectionObserverEntry[]) {
  for (const entry of entries) if (entry.intersectionRatio < GONE) restore(entry.target as HTMLElement);
}

/** Play the post at `permalink` in place of the image in `frame` (the page's `.event-detail__frame`). */
export function playInline(frame: HTMLElement, permalink: string) {
  if (frame.dataset.inlineSaved !== undefined) return; // already playing
  const media = frame.querySelector<HTMLElement>(".event-detail__media");
  if (!media) return;
  frame.dataset.inlineSaved = frame.innerHTML;
  frame.classList.add("is-loading");
  media.querySelector(".event-detail__play")?.replaceChildren("Cargando el video…");
  frame.querySelector<HTMLVideoElement>("video")?.pause();

  const holder = document.createElement("div");
  holder.className = "inline-player"; // laid out but invisible while loading (Instagram sizes it): CSS
  frame.append(holder);
  observer ??= new IntersectionObserver(onSight, { threshold: [0, GONE, 1] });
  observer.observe(frame);

  void renderInstagramPost(holder, permalink, { captioned: false }).then((shown) => {
    if (frame.dataset.inlineSaved === undefined) return; // removed meanwhile (scrolled away)
    frame.classList.remove("is-loading");
    if (shown) {
      releaseClips(media); // its clip's decoder and buffers go with it
      media.remove(); // the player takes the image's place
      frame.classList.add("is-playing");
    } else {
      holder.remove();
      media.querySelector(".event-detail__play")?.replaceChildren("No se pudo cargar: míralo en Instagram");
    }
  });
}
