// The details drawer's geometry and gestures on phones (eventDrawer.ts): the pure part, so it can be tested.
//
// Like Instagram's comments, the drawer rises over the list, which stays where it was, visible above it under a
// light scrim. It opens at half height ("medium", the lower 55% of the screen); pulled up (or scrolled) it covers
// the screen up to TOP_GAP from the top ("full"), where its content scrolls. Pulled down it goes back to half
// height, and once more it closes. Positions are the drawer's offset from its full height, in px (translateY).

export type Detent = "medium" | "full";

/** Share of the screen the drawer covers at half height. */
export const MEDIUM_SHARE = 0.55;
/** px left above the drawer at full height (the list still peeks: it's a layer, not a page). */
export const TOP_GAP = 12;
/** The scrim's opacity at each height: light at half (the card above stays readable), darker at full. */
export const SCRIM_MEDIUM = 0.32;
export const SCRIM_FULL = 0.55;

const FLICK = 0.5; // px/ms: a release this fast goes the way it was moving, however short (as lib/sheet.ts)
const CLOSE_DISTANCE = 110; // px pulled below the half height that close on release…
const CLOSE_FRACTION = 0.22; // …or this share of the screen, whichever is larger
const BACK_TO_MEDIUM = 40; // px: a flick down from full height lands on half height unless already past it by this

/** How far down the drawer sits at `detent` ("closed": just out of sight), for a screen `viewport` px tall. */
export function offsetFor(detent: Detent | "closed", viewport: number): number {
  const height = viewport - TOP_GAP;
  if (detent === "full") return 0;
  if (detent === "medium") return height - Math.round(viewport * MEDIUM_SHARE);
  return height + TOP_GAP;
}

/** The scrim's opacity with the drawer at `offset`: it follows the drawer, 0 once it's gone. */
export function scrimAt(offset: number, viewport: number): number {
  const medium = offsetFor("medium", viewport);
  const closed = offsetFor("closed", viewport);
  if (offset >= medium) return SCRIM_MEDIUM * Math.max(0, 1 - (offset - medium) / (closed - medium));
  return SCRIM_MEDIUM + (SCRIM_FULL - SCRIM_MEDIUM) * (1 - Math.max(offset, 0) / medium);
}

/** Tapping the handle switches between the two heights. */
export function otherDetent(detent: Detent): Detent {
  return detent === "full" ? "medium" : "full";
}

/**
 * Where a drag of the drawer ends: `offset` where it was let go, `velocity` in px/ms (positive: moving down),
 * `from` the height it started at. Speed decides first, then distance.
 */
export function settle(offset: number, viewport: number, velocity: number, from: Detent): Detent | "close" {
  const medium = offsetFor("medium", viewport);
  if (velocity > FLICK) return from === "full" && offset < medium + BACK_TO_MEDIUM ? "medium" : "close";
  if (velocity < -FLICK) return "full";
  if (offset > medium + Math.max(CLOSE_DISTANCE, viewport * CLOSE_FRACTION)) return "close";
  return offset < medium / 2 ? "full" : "medium";
}

/** How long the drawer takes to leave from `offset` at the finger's `velocity` (px/ms): 160–280 ms. */
export function exitDuration(offset: number, viewport: number, velocity = 0): number {
  const remaining = Math.max(offsetFor("closed", viewport) - offset, 0);
  return Math.round(Math.min(Math.max(remaining / Math.max(velocity, 1.2), 160), 280));
}

/**
 * Opening over the list: how far to scroll the page so the tapped card's image stays in view, or null when it's
 * already mostly visible between the bar (`barBottom`) and the drawer's top at half height (`drawerTop`). Then
 * its top goes right under the bar. `force` (a shared link): always.
 */
export function cardScrollDelta(
  { top, bottom }: { top: number; bottom: number },
  { barBottom, drawerTop, force = false }: { barBottom: number; drawerTop: number; force?: boolean },
): number | null {
  const room = drawerTop - barBottom;
  const shown = Math.max(0, Math.min(bottom, drawerTop) - Math.max(top, barBottom));
  if (!force && shown >= Math.min(bottom - top, room) * 0.6) return null;
  return top - barBottom;
}
