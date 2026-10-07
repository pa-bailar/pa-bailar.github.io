// A double-tap on a flyer (Instagram's "like", out of habit) is two clicks on the same spot. The first opens the event's
// details, which rise under the finger (on a wide screen with a mouse, its image big beside them), and the second landed
// on whatever they put there: Compartir, the account's profile, the dim area that closes them again (the audit of 7 Oct
// 2026: 20 emulated double-taps on Android and iPhone, the second tap on the details every time). That second click is
// dropped (main.ts); a tap anywhere else, or later, works as always.

/** A double-tap's taps come within this many milliseconds (Android counts 300, iOS about 350)… */
export const SECOND_TAP_MS = 450;
/** …and this many pixels apart (the finger moves a little between them). */
export const SECOND_TAP_SLOP = 40;

export interface Tap {
  x: number;
  y: number;
  /** The event's timeStamp (milliseconds). */
  at: number;
}

/** Whether `next` is the second tap of a double-tap whose first one was `first`. */
export function isSecondTap(first: Tap | null, next: Tap): boolean {
  if (!first) return false;
  const soon = next.at >= first.at && next.at - first.at <= SECOND_TAP_MS;
  return soon && Math.hypot(next.x - first.x, next.y - first.y) <= SECOND_TAP_SLOP;
}

/** A click made with a finger or a mouse (not Enter on a link or a button: their clicks have no position). */
export const isPointerClick = (domEvent: MouseEvent): boolean => domEvent.detail > 0;

/** The tap a click was. */
export const tapOf = (domEvent: MouseEvent): Tap => ({ x: domEvent.clientX, y: domEvent.clientY, at: domEvent.timeStamp });
