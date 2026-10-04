// The event viewer's two heights on phones (eventDialog.ts): the pure part, so it can be tested.
//
// On a phone the viewer opens as a sheet over the lower part of the screen (about 58%), with the event's flyer
// above it, so what's new (when, where, price, who) shows at once instead of the same flyer again. Pulling the
// sheet up (or simply scrolling it) expands it to the whole screen; pulling it down from there brings it back,
// and once more closes it.
//
// Each slide is a vertical scroller: the flyer at the top (sticky) and the sheet's panel after it. So the sheet's
// height is the slide's scroll position: 0 is the half sheet ("medium"), `peek` (the flyer's area, up to 42% of
// the screen) is the full sheet, and further down is reading the full sheet. Touch uses that native scrolling
// (with CSS scroll snapping between the two heights); a mouse or pen dragging the sheet's bar uses `settle`.

export type Detent = "medium" | "full";

/** Share of the screen the half sheet covers; the flyer gets the rest (`--viewer-peek` in tokens.css). */
export const MEDIUM_SHARE = 0.58;

const FLICK = 0.5; // px/ms: a release this fast goes the way it was moving, however short
const CLOSE_PULL = 110; // px: pulled this far below the half sheet, it closes

/** The sheet's height for a slide scrolled `scrollTop` down, with the flyer's area `peek` tall. */
export function detentAt(scrollTop: number, peek: number): Detent {
  return peek <= 0 || scrollTop >= peek - 1 ? "full" : "medium"; // no flyer above: it's all sheet
}

/** Where to scroll a slide for `detent`. */
export function scrollTopFor(detent: Detent, peek: number): number {
  return detent === "full" ? Math.max(peek, 0) : 0;
}

/** Tapping the handle switches between the two heights. */
export function otherDetent(detent: Detent): Detent {
  return detent === "full" ? "medium" : "full";
}

/**
 * Where a drag of the sheet ends: `position` is the slide's scroll position, negative when the sheet was pulled
 * down below the half sheet; `velocity` is in px/ms, positive while moving toward the full sheet.
 * Speed decides first, then distance (like the bottom sheets in lib/sheet.ts).
 */
export function settle(position: number, peek: number, velocity: number): Detent | "close" {
  if (position < 0) return velocity < -FLICK || position < -CLOSE_PULL ? "close" : "medium";
  if (position >= peek) return "full"; // reading further down: stays where it is
  if (velocity > FLICK) return "full";
  if (velocity < -FLICK) return "medium";
  return position >= peek / 2 ? "full" : "medium";
}
