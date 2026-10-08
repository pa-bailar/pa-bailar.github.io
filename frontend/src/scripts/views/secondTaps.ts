// A double-tap's second tap, dropped where it would press something the first one opened or changed under the finger
// (lib/secondTap.ts): before any other listener, on every page that has taps (main.ts, eventPage.ts).

import { isPointerClick, isSecondTap, isStraySecondTap, tapOf, type Tap } from "../lib/secondTap";

let last: Tap | null = null; // the page's last tap, until the next click
let opening: Tap | null = null; // the last tap that opened an event from its card, until the next click

/** A card's tap that opened its event (main.ts): its second tap is dropped even on the same card, which on a wide
 * screen would open the event again. */
export function markOpeningTap(domEvent: MouseEvent) {
  if (isPointerClick(domEvent)) opening = tapOf(domEvent);
}

/** From now on, a double-tap's second tap that lands on another control than the first (or follows a card's opening
 * tap) does nothing: no listener hears it, and a link doesn't follow. */
export function dropStraySecondTaps() {
  document.addEventListener(
    "click",
    (domEvent) => {
      const [first, opened] = [last, opening];
      last = opening = null;
      if (!isPointerClick(domEvent)) return;
      const tap = tapOf(domEvent);
      if (isStraySecondTap(first, tap) || isSecondTap(opened, tap)) {
        domEvent.preventDefault();
        domEvent.stopImmediatePropagation();
        return;
      }
      last = tap;
    },
    true,
  );
}
