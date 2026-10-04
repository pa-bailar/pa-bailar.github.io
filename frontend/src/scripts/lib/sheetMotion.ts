// What every sheet's motion shares: the bottom sheets (lib/sheet.ts) and the details drawer (views/drawerSheet.ts)
// decide a release and leave the same way (values from Material/iOS sheets and Apple's "fluid interfaces").

/** px/ms (500 px/s): a release this fast goes the way it was moving, however short. */
export const FLICK = 0.5;
/** px: the least drag that closes on release… */
export const CLOSE_DISTANCE = 110;
/** …or this share of the screen's height, whichever is larger. */
export const CLOSE_FRACTION = 0.22;

const EXIT_MIN = 160; // ms
const EXIT_MAX = 280; // ms
const EXIT_MIN_SPEED = 1.2; // px/ms: slow releases still leave briskly

/** How far a release must have dragged to close, on a screen `viewport` px tall. */
export function closeDistance(viewport: number): number {
  return Math.max(CLOSE_DISTANCE, viewport * CLOSE_FRACTION);
}

/** How long leaving takes with `remaining` px to go at the finger's `velocity` (px/ms): 160–280 ms. */
export function exitDurationFor(remaining: number, velocity = 0): number {
  const duration = Math.max(remaining, 0) / Math.max(velocity, EXIT_MIN_SPEED);
  return Math.round(Math.min(Math.max(duration, EXIT_MIN), EXIT_MAX));
}
