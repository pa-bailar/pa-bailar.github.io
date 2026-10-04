// Dragging the details drawer on phones (eventDrawer.ts): a finger, a mouse or a pen, and the wheel. Where a drag
// ends (a height, or closing) is decided by drawerSheet.ts; moving the drawer and closing it, by eventDrawer.ts,
// through `DrawerControl`.

import { type Detent, offsetFor, settle } from "./drawerSheet";

const DRAG_SLOP = 4; // px a finger or mouse moves before it's a drag
const VELOCITY_WINDOW = 80; // ms of recent movement for the release speed
const RUBBER_BAND = 0.7; // pulled up past full height, it moves less and less
const WHEEL_DOWN = 30; // px of wheel up, at the top of the full drawer, that bring it back to half height

/** What the gestures read from the drawer and ask of it. */
export interface DrawerControl {
  /** Phones' drawer ("sheet"), or wide screens' side panel, which doesn't drag. */
  readonly mode: "sheet" | "panel";
  readonly detent: Detent;
  /** px the drawer sits below its full height. */
  readonly offset: number;
  /** The screen's height. */
  readonly viewport: number;
  /** Sliding away: no new gesture. */
  readonly leaving: boolean;
  /** The drawer's scrolling content. */
  body(): HTMLElement | null;
  /** Follow the finger: `next` px below the full height, at once. */
  place(next: number): void;
  setDetent(next: Detent): void;
  /** Let go far or fast enough: close, from `from` at the finger's `velocity` (px/ms). */
  close(release: { from: number; velocity: number }): void;
  /** While dragging (`.is-dragging`: no transition). */
  setDragging(dragging: boolean): void;
}

interface Drag {
  startY: number;
  startOffset: number;
  from: Detent;
  samples: { y: number; time: number }[];
  moved: boolean;
}

/** Its bar (handle and head) drags the drawer at any height; × is a button. */
const inBar = (target: HTMLElement) => Boolean(target.closest(".drawer__grip, .drawer__head")) && !target.closest("[data-close-drawer]");

/** Touch, mouse, pen and wheel on `panel` (the drawer's sheet) move the drawer through `drawer`. */
export function initDrawerGestures(panel: HTMLElement, drawer: DrawerControl) {
  let drag: Drag | null = null;

  const dragStart = (y: number, time: number) => {
    drag = { startY: y, startOffset: drawer.offset, from: drawer.detent, samples: [{ y, time }], moved: false };
  };

  const dragMove = (y: number, time: number) => {
    if (!drag) return;
    if (Math.abs(y - drag.startY) > DRAG_SLOP) drag.moved = true;
    let next = drag.startOffset + (y - drag.startY);
    if (next < 0) next = -((-next) ** RUBBER_BAND);
    drawer.setDragging(true);
    drawer.place(next);
    drag.samples.push({ y, time });
    drag.samples = drag.samples.filter((sample) => time - sample.time <= VELOCITY_WINDOW);
  };

  /** Let go: settle at a height, or close. False when it wasn't a drag (a tap). */
  const dragEnd = (): boolean => {
    const ended = drag;
    drag = null;
    drawer.setDragging(false);
    if (!ended) return false;
    if (!ended.moved) {
      const resting = offsetFor(drawer.detent, drawer.viewport);
      if (drawer.offset !== resting) drawer.place(resting);
      return false;
    }
    const [first, last] = [ended.samples[0], ended.samples.at(-1)];
    const velocity = first && last && last.time > first.time ? (last.y - first.y) / (last.time - first.time) : 0;
    const target = settle(drawer.offset, drawer.viewport, velocity, ended.from);
    if (target === "close") drawer.close({ from: drawer.offset, velocity: Math.max(velocity, 0) });
    else drawer.setDetent(target);
    return true;
  };

  // Touch: at half height any vertical drag moves the drawer; at full height its content scrolls, and the drawer
  // follows the finger from its bar, or when the content is at its top and the finger pulls down.
  let touch: { x: number; y: number; bar: boolean; decided: boolean; dragging: boolean } | null = null;
  panel.addEventListener(
    "touchstart",
    (domEvent) => {
      if (touch?.dragging) return; // a second finger while dragging: the first one keeps the drag (else it never ends)
      const point = domEvent.touches[0];
      touch =
        drawer.mode === "sheet" && !drawer.leaving && point && domEvent.touches.length === 1
          ? { x: point.clientX, y: point.clientY, bar: inBar(domEvent.target as HTMLElement), decided: false, dragging: false }
          : null;
    },
    { passive: true },
  );
  panel.addEventListener(
    "touchmove",
    (domEvent) => {
      const point = domEvent.touches[0];
      if (!touch || !point) return;
      const [dx, dy] = [point.clientX - touch.x, point.clientY - touch.y];
      if (!touch.decided) {
        if (Math.abs(dx) < DRAG_SLOP && Math.abs(dy) < DRAG_SLOP) return;
        touch.decided = true;
        const atTop = (drawer.body()?.scrollTop ?? 0) <= 0;
        touch.dragging = Math.abs(dy) >= Math.abs(dx) && (drawer.detent === "medium" || touch.bar || (atTop && dy > 0));
        if (touch.dragging) dragStart(touch.y, domEvent.timeStamp);
      }
      if (!touch.dragging) return;
      if (domEvent.cancelable) domEvent.preventDefault(); // the drawer owns the gesture: nothing scrolls under it
      dragMove(point.clientY, domEvent.timeStamp);
    },
    { passive: false },
  );
  const releaseTouch = () => {
    if (touch?.dragging) dragEnd();
    touch = null;
  };
  panel.addEventListener("touchend", releaseTouch);
  panel.addEventListener("touchcancel", releaseTouch);

  // A mouse or pen: the bar drags at any height, the content at half height. A tap on the handle isn't a drag.
  let captured = false;
  let swallowClick = false;
  panel.addEventListener("pointerdown", (domEvent) => {
    const target = domEvent.target as HTMLElement;
    if (domEvent.pointerType === "touch" || domEvent.button !== 0 || drawer.mode !== "sheet" || drawer.leaving) return;
    if (target.closest("a, summary, input, button:not([data-detent-toggle])")) return;
    if (!inBar(target) && drawer.detent === "full") return; // the content scrolls
    domEvent.preventDefault(); // no text selection while dragging
    captured = false;
    dragStart(domEvent.clientY, domEvent.timeStamp);
  });
  panel.addEventListener("pointermove", (domEvent) => {
    if (!drag || domEvent.pointerType === "touch") return;
    if (!drag.moved && Math.abs(domEvent.clientY - drag.startY) <= DRAG_SLOP) return;
    if (!captured) {
      panel.setPointerCapture(domEvent.pointerId); // only once it's a drag: a tap's click lands on the handle
      captured = true;
    }
    dragMove(domEvent.clientY, domEvent.timeStamp);
  });
  const releasePointer = (domEvent: PointerEvent) => {
    if (!drag || domEvent.pointerType === "touch") return;
    if (!dragEnd()) return;
    swallowClick = true; // the click that ends a drag on the handle isn't a tap on it
    window.setTimeout(() => (swallowClick = false));
  };
  panel.addEventListener("pointerup", releasePointer);
  panel.addEventListener("pointercancel", releasePointer);
  panel.addEventListener(
    "click",
    (domEvent) => {
      if (!swallowClick) return;
      swallowClick = false;
      domEvent.stopPropagation();
      domEvent.preventDefault();
    },
    { capture: true },
  );

  // The wheel at half height expands it, as scrolling the content would; at the top of the full drawer, a wheel up
  // brings it back.
  panel.addEventListener(
    "wheel",
    (domEvent) => {
      if (drawer.mode !== "sheet" || drawer.leaving) return;
      if (drawer.detent === "medium" && domEvent.deltaY > 0) {
        domEvent.preventDefault();
        drawer.setDetent("full");
      } else if (drawer.detent === "full" && (drawer.body()?.scrollTop ?? 0) <= 0 && domEvent.deltaY < -WHEEL_DOWN) {
        domEvent.preventDefault();
        drawer.setDetent("medium");
      }
    },
    { passive: false },
  );
}
