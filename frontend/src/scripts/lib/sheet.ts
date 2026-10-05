// Bottom sheets (the filters, an event's posts, a post), with the behavior of native ones
// (values from Material/iOS sheets and Apple's "fluid interfaces" guidance):
//   - drag down to dismiss: the sheet follows the finger 1:1, shrinks slightly and the backdrop fades
//     with it; dragging up past the top resists like a rubber band;
//   - on release it decides by velocity first, then distance: a flick down closes, a flick up cancels;
//   - closing continues from where the finger left it, at the finger's speed (a flick never slows down);
//   - every way of closing (×, Escape, back, drag) slides it away instead of making it vanish.
// The motion itself is CSS (styles/components/sheet.css): .sheet, .is-dragging, .is-closing, --drag.

import { prefersReducedMotion } from "./dom";
import {
  FLICK,
  type MotionSample,
  SHEET_DIRECTION_SLOP,
  closeDistance,
  exitDurationFor,
  releaseVelocity,
} from "./sheetMotion";
import { historyState, overlayState } from "../screenHistory";

// A flick down (FLICK) closes however short; past closeDistance() it closes unless flicked back up (FLICK_UP).
const FLICK_UP = -0.3; // px/ms: a flick back up cancels, however far it was dragged
const SHRINK = 0.04; // scale lost at full drag progress
const BACKDROP_FADE = 0.8; // backdrop opacity lost at full drag progress
const RUBBER_BAND = 60; // px: most it moves when dragged up past the top

const closing = new WeakSet<HTMLDialogElement>();
/** What had the focus when each panel sheet opened; for one that took another's place, what opened that one. */
const openers = new WeakMap<HTMLDialogElement, Element | null>();
/** Panel sheets open in another's place: closing gives the focus back to their opener (initPanelSheet). */
const tookPlace = new WeakSet<HTMLDialogElement>();

/**
 * Slide the sheet away, then close it. `velocity` (px/ms) carries a flick's speed into the exit;
 * `instant` closes without animating (reduced motion, or the browser already animated a back swipe).
 */
export function dismissSheet(sheet: HTMLDialogElement, { velocity = 0, instant = false } = {}) {
  if (!sheet.open || closing.has(sheet)) return;
  if (instant || prefersReducedMotion()) {
    sheet.close();
    return;
  }
  closing.add(sheet);
  const offset = new DOMMatrix(getComputedStyle(sheet).transform).m42; // px already dragged
  const remaining = Math.max(sheet.offsetHeight - offset, 0);
  const duration = exitDurationFor(remaining, velocity);
  sheet.style.setProperty("--sheet-exit-duration", `${duration}ms`);
  // Same frame: drop the finger's position and add the exit state, so it continues from where it is.
  sheet.classList.remove("is-dragging");
  sheet.style.removeProperty("transform");
  sheet.classList.add("is-closing");
  window.setTimeout(() => {
    sheet.close();
    sheet.classList.remove("is-closing", "is-dragging");
    for (const property of ["--drag", "--sheet-exit-duration"]) sheet.style.removeProperty(property);
    closing.delete(sheet);
  }, duration);
}

/**
 * Drag down to dismiss. `canStartDrag(target)` says whether a touch there may drag the sheet: usually
 * its top bar, or its content when scrolled to the top (otherwise the touch scrolls the content).
 * Escape also slides the sheet away instead of the browser's instant close.
 */
function initSheet(sheet: HTMLDialogElement, canStartDrag: (target: HTMLElement) => boolean) {
  let startX = 0;
  let startY = 0;
  let dragging: boolean | null = null; // null = direction not decided yet; false = not a drag
  let offset = 0; // px the sheet is moved down (negative: rubber band above the top)
  let samples: MotionSample[] = [];

  const springBack = () => {
    sheet.classList.remove("is-dragging");
    sheet.style.removeProperty("transform");
    sheet.style.removeProperty("--drag");
  };

  sheet.addEventListener(
    "touchstart",
    (touch) => {
      // Not while it's already leaving, and only where dragging makes sense. A second finger while dragging
      // doesn't start over: the drag stays the first one's.
      const point = touch.touches[0];
      if (!point || dragging) return;
      dragging = !closing.has(sheet) && canStartDrag(touch.target as HTMLElement) ? null : false;
      startX = point.clientX;
      startY = point.clientY;
      offset = 0;
      samples = [{ y: startY, time: touch.timeStamp }];
    },
    { passive: true },
  );

  // Not passive: once the sheet owns the gesture it stops the content (and iOS) from scrolling too.
  sheet.addEventListener(
    "touchmove",
    (touch) => {
      const point = touch.touches[0];
      if (dragging === false || !point) return;
      const [x, y] = [point.clientX, point.clientY];
      if (dragging === null) {
        const [dx, dy] = [x - startX, y - startY];
        if (Math.abs(dx) < SHEET_DIRECTION_SLOP && Math.abs(dy) < SHEET_DIRECTION_SLOP) return;
        dragging = dy > 0 && Math.abs(dy) > Math.abs(dx); // down: drag; sideways or up: swipe or scroll
        if (!dragging) return;
        sheet.classList.add("is-dragging");
      }
      touch.preventDefault();
      samples.push({ y, time: touch.timeStamp });
      const dy = y - startY;
      offset = dy >= 0 ? dy : -(1 - 1 / (1 + Math.abs(dy) / 300)) * RUBBER_BAND;
      const progress = Math.min(Math.max(offset, 0) / (window.innerHeight * 0.5), 1);
      sheet.style.transform = `translateY(${offset}px) scale(${1 - SHRINK * progress})`;
      sheet.style.setProperty("--drag", String(progress * BACKDROP_FADE));
    },
    { passive: false },
  );

  const release = () => {
    if (!dragging) return;
    dragging = false;
    const speed = releaseVelocity(samples);
    const farEnough = offset > closeDistance(window.innerHeight);
    if (speed > FLICK || (farEnough && speed > FLICK_UP)) dismissSheet(sheet, { velocity: speed });
    else springBack(); // the transition animates it back
  };
  sheet.addEventListener("touchend", release);
  sheet.addEventListener("touchcancel", release);

  sheet.addEventListener("cancel", (cancel) => {
    cancel.preventDefault();
    dismissSheet(sheet);
  });
}

/**
 * Open a panel sheet with its own history entry (same URL), like the event drawer's: the phone's back
 * button closes this sheet only, and the next back what was under it (the drawer, then the list).
 * `replacing`: a sheet it takes the place of (a post chosen among an event's posts): that one slides away and
 * this one takes over its history entry, so back doesn't step through a sheet that's gone, and its opener (the
 * details' "Ver las 3 publicaciones"): the browser would give the focus back to the post's thumbnail, inside the
 * closed sheet, which leaves it nowhere.
 */
export function openPanelSheet(sheet: HTMLDialogElement, { replacing }: { replacing?: HTMLDialogElement } = {}) {
  const takeOver = replacing?.open && historyState().sheet === replacing.id;
  if (replacing?.open) {
    openers.set(sheet, openers.get(replacing) ?? null);
    tookPlace.add(sheet);
  } else {
    openers.set(sheet, document.activeElement);
    tookPlace.delete(sheet);
  }
  sheet.showModal();
  // Over the entry it opens on (the screen, or the event details under it), marked as an overlay: undoing a screen
  // move from inside it doesn't go back through it (screenHistory.ts, `leave`).
  const state = overlayState({ sheet: sheet.id });
  if (takeOver) history.replaceState(state, ""); // before it closes: its close then leaves the history alone
  else history.pushState(state, "");
  if (replacing) dismissSheet(replacing);
}

/**
 * A panel sheet (the filters, an event's posts, a post), opened with openPanelSheet: × (`[data-close-sheet]`)
 * and a tap on the backdrop close it; it drags down to dismiss from its head (`.sheet-panel__head`) or
 * whenever its content is scrolled to the top (`scroller`: what scrolls, when it isn't the sheet itself); back
 * closes it. `onClick` gets every other click inside.
 */
export function initPanelSheet(
  sheet: HTMLDialogElement,
  onClick?: (target: HTMLElement) => void,
  { scroller = sheet }: { scroller?: HTMLElement } = {},
) {
  sheet.addEventListener("click", (domEvent) => {
    const target = domEvent.target as HTMLElement;
    const close = target.closest<HTMLButtonElement>("[data-close-sheet]");
    if (target === sheet || (close && !close.disabled)) dismissSheet(sheet);
    else onClick?.(target);
  });
  initSheet(sheet, (target) => Boolean(target.closest(".sheet-panel__head")) || scroller.scrollTop <= 0);
  // Closed by ×, backdrop, Escape or a drag: leave its history entry the way back would. One open in another's place
  // gives the focus back to that one's opener (openPanelSheet), if it's still on the page.
  sheet.addEventListener("close", () => {
    if (historyState().sheet === sheet.id) history.back();
    const opener = openers.get(sheet);
    if (tookPlace.has(sheet) && opener?.isConnected) (opener as HTMLElement).focus({ preventScroll: true });
    tookPlace.delete(sheet);
    openers.delete(sheet);
  });
  // Back: the entry under this sheet's is now current, so the sheet goes.
  window.addEventListener("popstate", (domEvent) => {
    if (sheet.open && historyState(domEvent.state).sheet !== sheet.id) dismissSheet(sheet);
  });
}
