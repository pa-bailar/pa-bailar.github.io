// Videos' short silent clips in the detail (eventDetail.ts, `<video data-clip>`): like a feed, the one on screen
// plays by itself, muted and looping, so a video looks like a video without a tap; tapping still opens the
// post with sound (postViewer.ts). None autoplays when the visitor asks for less: reduced motion, or the
// browser's data saver. Then the frame stays still with its "Ver con sonido" label, as before.
//
// Phones have little memory for video, and iPhone's Safari closes the page ("A problem repeatedly
// occurred") when it runs out. So clips are kept to the minimum:
//   - only one plays at a time: starting one pauses the others;
//   - they load nothing until they play (`preload="none"`, set in the markup);
//   - a clip leaving the page (its slide emptied, the viewer closed) is released: unwatched, its source
//     removed and reloaded, which frees its decoder and buffers. A detached video that's still watched or
//     still has a source keeps them.

const VISIBLE = 0.6; // share of the clip on screen to play it

const holdBack = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
  Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);

let observer: IntersectionObserver | null = null;
const watched = new Set<HTMLVideoElement>();

function play(clip: HTMLVideoElement) {
  watched.forEach((other) => other !== clip && other.pause()); // one at a time
  clip.preload = "auto";
  void clip.play().catch(() => {}); // a browser that refuses autoplay keeps the still frame
}

function onSight(entries: IntersectionObserverEntry[]) {
  for (const entry of entries) {
    const clip = entry.target as HTMLVideoElement;
    if (!clip.isConnected) release(clip);
    else if (entry.isIntersecting && entry.intersectionRatio >= VISIBLE && !holdBack()) play(clip);
    else clip.pause();
  }
}

/** Watch the clips under `root` (after the detail is rendered or re-rendered): play the one in view. */
export function watchClips(root: ParentNode = document) {
  if (typeof IntersectionObserver === "undefined") return; // very old browsers: the still frame stays
  observer ??= new IntersectionObserver(onSight, { threshold: [0, VISIBLE, 1] });
  root.querySelectorAll<HTMLVideoElement>("video[data-clip]").forEach((clip) => {
    watched.add(clip);
    observer!.observe(clip);
  });
}

/** Stop every clip (the viewer closed). */
export function pauseClips(root: ParentNode = document) {
  root.querySelectorAll<HTMLVideoElement>("video[data-clip]").forEach((clip) => clip.pause());
}

function release(clip: HTMLVideoElement) {
  observer?.unobserve(clip);
  watched.delete(clip);
  clip.pause();
  if (clip.hasAttribute("src")) {
    clip.removeAttribute("src");
    clip.load(); // with no source, the browser drops what it had loaded
  }
}

/** Free the clips under `root` before it's removed or replaced: nothing of them stays in memory. */
export function releaseClips(root: ParentNode = document) {
  root.querySelectorAll<HTMLVideoElement>("video[data-clip]").forEach(release);
}
