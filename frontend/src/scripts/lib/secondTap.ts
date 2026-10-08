// A double-tap on a flyer (Instagram's "like", out of habit) is two clicks on the same spot. The first opens the event's
// details, which rise under the finger (on a wide screen with a mouse, its image big beside them), and the second landed
// on whatever they put there: Compartir, the account's profile, the dim area that closes them again (the audit of 7 Oct
// 2026: 20 emulated double-taps on Android and iPhone, the second tap on the details every time). The same goes for
// anything a tap opens or changes under the finger: "Ver N más" (the second tap opened the first new card's details),
// "Ver las 6 publicaciones", the Instagram button, a notice's button (gone at once, the view under it took the tap), an
// event page's flyer ("Abrir en Instagram" rising under it): the bug hunt of 7 Oct 2026. So a second tap is dropped
// when it lands on another control than the first one did (views/secondTaps.ts); the same control twice (a month's
// arrow, a carousel's) is two taps, as always. A tap anywhere else, or later, works as always.

/** A double-tap's clicks come within this many milliseconds (Android counts 300 between the taps, iOS about 350)…
 * WebKit holds the second one back while it tells a double-tap from two taps: a 150 ms double-tap's clicks came 200–380
 * ms apart in Playwright's WebKit, and past 450 under load, when the second opened the first new card under "Ver N
 * más" (the code-quality pass of 8 Oct 2026). */
export const SECOND_TAP_MS = 600;
/** …and this many pixels apart (the finger moves a little between them). */
export const SECOND_TAP_SLOP = 40;

export interface Tap {
  x: number;
  y: number;
  /** The event's timeStamp (milliseconds). */
  at: number;
  /** What it pressed (controlKey); "" for nothing in particular. */
  control?: string;
}

/** Whether `next` is the second tap of a double-tap whose first one was `first`. */
export function isSecondTap(first: Tap | null, next: Tap): boolean {
  if (!first) return false;
  const soon = next.at >= first.at && next.at - first.at <= SECOND_TAP_MS;
  return soon && Math.hypot(next.x - first.x, next.y - first.y) <= SECOND_TAP_SLOP;
}

/** Whether `next` is a double-tap's second tap that landed on another control than the first: on what the first one
 * opened or changed under the finger. */
export function isStraySecondTap(first: Tap | null, next: Tap): boolean {
  return isSecondTap(first, next) && (first?.control ?? "") !== (next.control ?? "");
}

/** What a tap can press: links, buttons, fields, cards (they take the focus), the dialogs' own surface. */
const CONTROL =
  "a[href], button, input, select, textarea, summary, label, [tabindex], dialog, " +
  '[role="button"], [role="tab"], [role="switch"], [role="link"], [role="option"], [role="menuitem"]';

/** The control under a tap, as a key that stays the same when that control is drawn again (a bookmark, a month's
 * arrow): its tag, id, link and data. "" for nothing in particular (text, the page). */
export function controlKey(target: EventTarget | null): string {
  const control = (target as Element | null)?.closest?.(CONTROL);
  if (!control) return "";
  const kept = [...control.attributes].filter(({ name }) => ["id", "href"].includes(name) || name.startsWith("data-"));
  return [control.tagName, ...kept.map(({ name, value }) => `${name}=${value}`)].join(" ");
}

/** A click made with a finger or a mouse (not Enter on a link or a button: their clicks have no position). */
export const isPointerClick = (domEvent: MouseEvent): boolean => domEvent.detail > 0;

/** The tap a click was, and what it pressed. */
export const tapOf = (domEvent: MouseEvent): Tap => ({
  x: domEvent.clientX,
  y: domEvent.clientY,
  at: domEvent.timeStamp,
  control: controlKey(domEvent.target),
});
