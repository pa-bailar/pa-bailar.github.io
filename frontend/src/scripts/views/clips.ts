// Videos' short silent clips (`<video data-clip>`): on the cards of the list, like a feed, and on an event's page.
// The one on screen plays by itself, muted and looping, so a video looks like a video without a tap. None
// autoplays when the visitor asks for less: reduced motion, or the browser's data saver. Then the frame stays
// still.
//   - The clips have no sound (the backend cuts them with none), so they're always muted and offer no sound
//     button: a tap on a card's clip opens the details like the rest of the card. The full video, with its sound,
//     plays in the details (their Instagram button) through Instagram's player.
//   - Something over the list can hold them (`holdClips`): the details drawer at full height covers them, and
//     the media viewer plays the post with sound. They pause, and the one on screen plays again once nothing
//     holds them.
//
// Phones have little memory for video, and iPhone's Safari closes the page ("A problem repeatedly
// occurred") when it runs out. So clips are kept to the minimum:
//   - only one plays at a time: starting one pauses the others;
//   - they load nothing until they play (`preload="none"`, set in the markup);
//   - a clip that leaves the screen unloads (its source is taken out and kept aside, put back when it's seen
//     again), and one that leaves the page (the list redrawn) is released: unwatched, its source removed,
//     which frees its decoder and buffers.

import { prefersReducedMotion } from "../lib/dom";

const VISIBLE = 0.6; // share of the clip on screen to play it

const holdBack = () =>
  prefersReducedMotion() || Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);

let observer: IntersectionObserver | null = null;
const watched = new Set<HTMLVideoElement>();
const inView = new Set<HTMLVideoElement>(); // clips at least VISIBLE on screen
const holds = new Set<string>(); // what's holding them ("drawer", "post-viewer")

function play(clip: HTMLVideoElement) {
  watched.forEach((other) => other !== clip && other.pause()); // one at a time
  const source = clip.dataset.src;
  if (!clip.getAttribute("src") && source) clip.src = source; // back from unloading
  clip.preload = "auto";
  void clip.play().catch(() => {}); // a browser that refuses autoplay keeps the still frame
}

/** Off screen: nothing loaded (the source is kept aside for when it comes back). */
function unload(clip: HTMLVideoElement) {
  clip.pause();
  const source = clip.getAttribute("src");
  if (!source) return;
  clip.dataset.src = source;
  clip.removeAttribute("src");
  clip.load(); // with no source, the browser drops what it had loaded
}

function onSight(entries: IntersectionObserverEntry[]) {
  for (const entry of entries) {
    const clip = entry.target as HTMLVideoElement;
    if (!clip.isConnected) {
      release(clip);
      continue;
    }
    const seen = entry.isIntersecting && entry.intersectionRatio >= VISIBLE;
    if (seen) inView.add(clip);
    else inView.delete(clip);
    if (!entry.isIntersecting) unload(clip);
    else if (seen && !holds.size && !holdBack()) play(clip);
    else clip.pause();
  }
}

/** Watch the clips under `root` (after it's rendered): play the one in view. Clips no longer in the page go. */
export function watchClips(root: ParentNode = document) {
  if (typeof IntersectionObserver === "undefined") return; // very old browsers: the still frame stays
  watched.forEach((clip) => !clip.isConnected && release(clip));
  observer ??= new IntersectionObserver(onSight, { threshold: [0, VISIBLE, 1] });
  root.querySelectorAll<HTMLVideoElement>("video[data-clip]").forEach((clip) => {
    if (watched.has(clip)) return;
    watched.add(clip);
    observer!.observe(clip);
  });
}

/**
 * Hold every clip (`on`) for `reason`, or let them go: paused while anything holds them; then the one on screen
 * plays again (never when the visitor asks for less motion or data).
 */
export function holdClips(reason: string, on: boolean) {
  if (on) {
    holds.add(reason);
    watched.forEach((clip) => clip.pause());
    return;
  }
  holds.delete(reason);
  if (holds.size) return;
  const clip = [...inView].find((item) => item.isConnected);
  if (clip && !holdBack()) play(clip);
}

function release(clip: HTMLVideoElement) {
  observer?.unobserve(clip);
  watched.delete(clip);
  inView.delete(clip);
  clip.pause();
  delete clip.dataset.src;
  if (clip.hasAttribute("src")) {
    clip.removeAttribute("src");
    clip.load();
  }
}

/** Free the clips under `root` before it's removed or replaced: nothing of them stays in memory. */
export function releaseClips(root: ParentNode = document) {
  root.querySelectorAll<HTMLVideoElement>("video[data-clip]").forEach(release);
}
