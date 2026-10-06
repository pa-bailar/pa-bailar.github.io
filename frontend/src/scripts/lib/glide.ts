// Things a layout change moved glide to their new place instead of jumping there: FLIP ("first, last, invert, play",
// aerotwist.com/blog/flip-your-animations). Where each one is on screen is taken before the change and after it; each
// then starts at its old place (a transform) and slides to the new one. Only transforms: nothing is laid out again
// while they move. Used by the list making room beside the side panel (eventDrawer.ts).
import { prefersReducedMotion } from "./dom";

/** The glides still running: a new change stops them where they are, and the next glide starts from there. */
let running: Animation[] = [];

/**
 * Takes where `elements` are on screen now. The function it returns, called once the layout changed, makes each one
 * that moved glide from there to its new place in `duration` ms. Nothing glides with "reduce motion" on, nor where
 * the browser can't animate (it then just jumps, as without this).
 */
export function glideFrom(
  elements: Iterable<HTMLElement>,
  { duration, easing }: { duration: number; easing: string },
): () => void {
  if (prefersReducedMotion() || typeof Element.prototype.animate !== "function") return () => {};
  const before = [...elements].map((element) => ({ element, was: element.getBoundingClientRect() }));
  return () => {
    for (const animation of running) animation.cancel();
    running = [];
    for (const { element, was } of before) {
      const now = element.getBoundingClientRect();
      const dx = was.left - now.left;
      const dy = was.top - now.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      const glide = element.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], {
        duration,
        easing,
      });
      running.push(glide);
    }
  };
}
