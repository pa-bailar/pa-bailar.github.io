// Videos' short silent clips in the detail (eventDetail.ts, `<video data-clip>`): like a feed, the one on screen
// plays by itself, muted and looping, so a video looks like a video without a tap; tapping still opens the
// post with sound (postViewer.ts). Only the clip in view plays (the viewer holds every event as a slide), and
// none autoplays when the visitor asks for less: reduced motion, or the browser's data saver. Then the
// frame stays still with its "Ver con sonido" label, as before.

const VISIBLE = 0.6; // share of the clip on screen to play it

const holdBack = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
  Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);

let observer: IntersectionObserver | null = null;

function onSight(entries: IntersectionObserverEntry[]) {
  for (const entry of entries) {
    const clip = entry.target as HTMLVideoElement;
    if (entry.isIntersecting && entry.intersectionRatio >= VISIBLE && !holdBack()) {
      clip.preload = "auto";
      void clip.play().catch(() => {}); // a browser that refuses autoplay keeps the still frame
    } else {
      clip.pause();
    }
  }
}

/** Watch the clips under `root` (after the detail is rendered or re-rendered): play the one in view. */
export function watchClips(root: ParentNode = document) {
  observer ??= new IntersectionObserver(onSight, { threshold: [0, VISIBLE, 1] });
  root.querySelectorAll<HTMLVideoElement>("video[data-clip]").forEach((clip) => observer!.observe(clip));
}

/** Stop every clip (the viewer closed). */
export function pauseClips(root: ParentNode = document) {
  root.querySelectorAll<HTMLVideoElement>("video[data-clip]").forEach((clip) => clip.pause());
}
