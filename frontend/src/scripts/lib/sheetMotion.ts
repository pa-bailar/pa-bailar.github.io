// What every sheet's motion shares: the bottom sheets (lib/sheet.ts) and the details drawer (views/drawerSheet.ts)
// decide a release and leave the same way (values from Material/iOS sheets and Apple's "fluid interfaces").

/** ms of the latest movement that measure a release's velocity. */
export const VELOCITY_WINDOW = 80;

/** px a finger moves before a bottom sheet decides between a drag and a scroll or swipe (lib/sheet.ts). */
export const SHEET_DIRECTION_SLOP = 10;
/** px a finger or mouse moves before the details drawer takes it as a drag, not a tap (views/drawerGestures.ts). */
export const DRAWER_DRAG_SLOP = 4;

/** px/ms (500 px/s): a release this fast goes the way it was moving, however short. */
export const FLICK = 0.5;
/** px: the least drag that closes on release… */
export const CLOSE_DISTANCE = 110;
/** …or this share of the screen's height, whichever is larger. */
export const CLOSE_FRACTION = 0.22;

const EXIT_MIN = 160; // ms
const EXIT_MAX = 280; // ms
const EXIT_MIN_SPEED = 1.2; // px/ms: slow releases still leave briskly

/** Whether a click at (x, y) on a dialog itself fell on its backdrop: outside its box. A click on the dialog's own
 * padding (a sheet's gutters, the strip under its handle) has the dialog as its target too, and closed it (the bug hunt
 * of 7 Oct 2026: a tap beside the flyer closed the viewer). */
export function isOnBackdrop(box: { left: number; right: number; top: number; bottom: number }, x: number, y: number) {
  return x < box.left || x > box.right || y < box.top || y > box.bottom;
}

/** How far a release must have dragged to close, on a screen `viewport` px tall. */
export function closeDistance(viewport: number): number {
  return Math.max(CLOSE_DISTANCE, viewport * CLOSE_FRACTION);
}

/** A finger's (or a mouse's) position along the drag, and when (ms, the event's timeStamp). */
export interface MotionSample {
  y: number;
  time: number;
}

/**
 * The velocity at release (px/ms, positive downwards) over the samples of the last VELOCITY_WINDOW ms; 0 without
 * movement over time. `samples` are in the order they came.
 */
export function releaseVelocity(samples: readonly MotionSample[]): number {
  const last = samples.at(-1);
  const first = last && samples.find((sample) => last.time - sample.time <= VELOCITY_WINDOW);
  return first && last && last.time > first.time ? (last.y - first.y) / (last.time - first.time) : 0;
}

/** How long leaving takes with `remaining` px to go at the finger's `velocity` (px/ms): 160–280 ms. */
export function exitDurationFor(remaining: number, velocity = 0): number {
  const duration = Math.max(remaining, 0) / Math.max(velocity, EXIT_MIN_SPEED);
  return Math.round(Math.min(Math.max(duration, EXIT_MIN), EXIT_MAX));
}
