// An event's details, in a drawer over the list (components/EventDrawer.astro), like Instagram's comments.
//   - Phones and tablets (under 900 px): tapping a card, its "Detalles" or the line under it raises the drawer to
//     half height (the lower 55% of the screen) over the list, which stays where it was, visible above it under a
//     light scrim. The list only moves when the card would be mostly hidden: then its image goes right under the
//     bar. Pulled up, or scrolled, the drawer covers the screen (12 px from the top) and its content scrolls; pulled
//     down from its bar, or from the top of its content, it goes back to half height, and once more it closes. The
//     handle switches between the two heights. The drawer is modal: the page behind doesn't scroll, focus goes to
//     the title and back to what opened it. The geometry and the gesture's end are in drawerSheet.ts.
//   - Wide screens: a side panel on the right, not modal, so the list stays usable: another card shows its event
//     in the panel, and its card is outlined in the list.
//   - The drawer has no flyer: the visitor is looking at the card. Only one event's details are rendered, and
//     nothing stays once it closes (the iPhone's memory: ARCHITECTURE.md, section 5.7).
// The address bar shows the event's own URL (/evento/<id>/): opening pushes it to the history, so every way of
// closing (×, the scrim, Escape, a drag down, the phone's back button) goes through "back".

import type { DanceEvent } from "../types";
import { byId, escapeHtml, prefersReducedMotion } from "../lib/dom";
import { detailsEventName, type DetailsSource, trackEvent, trackPageview } from "../lib/analytics";
import { ICONS } from "../lib/icons";
import { eventPath } from "../lib/links";
import { holdClips } from "./clips";
import { eventDrawerHtml, handleMediaLinkClick } from "./eventDetail";
import { scrollPageTo, stickyOffset } from "./jumpBar";
import {
  type Detent,
  MEDIUM_SHARE,
  cardScrollDelta,
  exitDuration,
  offsetFor,
  otherDetent,
  scrimAt,
  settle,
} from "./drawerSheet";

const PANEL_QUERY = "(min-width: 900px)"; // wide enough for the list and a side panel (tokens.css, --panel-width)
const TITLE_ID = "drawer-title";
const RISE = 320; // ms, Material's emphasized decelerate: quick, with a soft landing
const RISE_EASING = "cubic-bezier(0.05, 0.7, 0.1, 1)";
const SETTLE = 300; // ms, between the two heights or springing back
const SETTLE_EASING = "cubic-bezier(0.2, 0, 0, 1)";
const EXIT_EASING = "cubic-bezier(0.3, 0, 0.8, 0.15)"; // emphasized accelerate: it leaves and keeps going
const PANEL_EXIT = 200; // ms: the side panel slides out
const DRAG_SLOP = 4; // px a finger or mouse moves before it's a drag
const VELOCITY_WINDOW = 80; // ms of recent movement for the release speed
const RUBBER_BAND = 0.7; // pulled up past full height, it moves less and less
const WHEEL_DOWN = 30; // px of wheel up, at the top of the full drawer, that bring it back to half height
const UNDER_BAR = 8; // px left between the bar and the card brought into view

let current: DanceEvent | null = null;
let findEvent: (id: string) => DanceEvent | undefined = () => undefined;
let mode: "sheet" | "panel" = "sheet";
let detent: Detent = "medium";
let offset = 0; // px the drawer sits below its full height (phones)
let viewport = 0; // the screen's height when it opened (or last resized)
let opener: HTMLElement | null = null; // what had the focus when it opened: it gets it back
let leaving = false; // sliding away
let pendingExit: { from: number; velocity: number } | null = null; // a close waiting for its "back"
let exitTimer = 0;
let swapping = false; // closing only to reopen in the other mode (the window crossed 900 px)

interface HistoryState {
  eventId?: string;
}

const drawer = () => byId<HTMLDialogElement>("event-drawer");
const body = () => drawer().querySelector<HTMLElement>(".drawer__body");

/** The event's card on screen (the list's, or the calendar day's). */
function cardOf(id: string): HTMLElement | undefined {
  return [...document.querySelectorAll<HTMLElement>(`main .event-card[data-event-card="${CSS.escape(id)}"]`)].find(
    (card) => card.offsetParent !== null,
  );
}

// ---------- the drawer's height (phones) ----------

/** Puts the drawer `next` px below its full height, the scrim following; `duration` animates it (CSS). */
function place(next: number, { duration = 0, easing = SETTLE_EASING } = {}) {
  offset = next;
  const element = drawer();
  const animate = duration > 0 && !prefersReducedMotion();
  element.classList.toggle("is-animating", animate);
  if (animate) {
    element.style.setProperty("--drawer-duration", `${duration}ms`);
    element.style.setProperty("--drawer-easing", easing);
  }
  element.style.setProperty("--drawer-y", `${next}px`);
  element.style.setProperty("--scrim-opacity", scrimAt(next, viewport).toFixed(3));
}

function setDetent(next: Detent, { duration = SETTLE, easing = SETTLE_EASING } = {}) {
  detent = next;
  const element = drawer();
  element.dataset.detent = next;
  const handle = element.querySelector<HTMLElement>("[data-detent-toggle]");
  handle?.setAttribute("aria-expanded", String(next === "full"));
  handle?.setAttribute("aria-label", next === "full" ? "Ver menos" : "Ver todo el detalle");
  if (next === "medium") body()?.scrollTo({ top: 0 }); // at half height it starts from the top again
  place(offsetFor(next, viewport), { duration, easing });
  // The full drawer covers the list's clips: they wait. At half height the one above keeps playing.
  holdClips("drawer", mode === "sheet" && next === "full");
}

/**
 * The tapped card stays in view above the half drawer: the list moves only when the card would be mostly hidden,
 * and then its image goes right under the bar. `force` (a shared link): always there, at once.
 */
function bringCardIntoView(id: string, force: boolean) {
  const card = cardOf(id);
  if (!card) return;
  const box = (card.querySelector(".event-card__media") ?? card).getBoundingClientRect();
  const barBottom = stickyOffset() + UNDER_BAR;
  const drawerTop = viewport - Math.round(viewport * MEDIUM_SHARE);
  const delta = cardScrollDelta(box, { barBottom, drawerTop, force });
  if (delta !== null) scrollPageTo(window.scrollY + delta, { smooth: !force });
}

// ---------- open ----------

function render(event: DanceEvent) {
  const content = byId("drawer-content");
  try {
    content.innerHTML = eventDrawerHtml(event, { titleId: TITLE_ID });
  } catch (error) {
    // One bad event never breaks the drawer: a way to its page instead.
    console.error(error);
    content.innerHTML = `
      <header class="drawer__head">
        <div class="drawer__heading"><h2 class="event-dialog__title" id="${TITLE_ID}" tabindex="-1">${escapeHtml(event.title)}</h2></div>
        <button class="drawer__close" type="button" data-close-drawer aria-label="Cerrar">${ICONS.close}</button>
      </header>
      <div class="drawer__body event-dialog__info">
        <p>No pudimos mostrar este evento aquí.</p>
        <p><a class="btn" href="${escapeHtml(eventPath(event))}">Abrir su página</a></p>
      </div>`;
  }
}

/** Side panel: the open event's card is outlined in the list (also after the list is drawn again: main.ts). */
export function highlightCurrentCard({ reveal = false } = {}) {
  document.querySelectorAll(".event-card.is-current").forEach((card) => card.classList.remove("is-current"));
  if (!drawer().open || leaving || mode !== "panel" || !current) return;
  const card = cardOf(current.id);
  card?.classList.add("is-current");
  if (reveal) card?.scrollIntoView({ block: "center" });
}

/** As a modal drawer over the list (phones), or as a side panel next to it (wide screens). */
function show(event: DanceEvent, shared: boolean) {
  const element = drawer();
  mode = window.matchMedia(PANEL_QUERY).matches ? "panel" : "sheet";
  element.dataset.mode = mode;
  if (mode === "panel") {
    document.documentElement.classList.add("has-viewer-panel");
    element.show();
    holdClips("drawer", false);
    highlightCurrentCard({ reveal: shared });
    return;
  }
  viewport = window.innerHeight;
  bringCardIntoView(event.id, shared);
  element.showModal();
  place(offsetFor("closed", viewport)); // from just below the screen…
  element.getBoundingClientRect(); // …laid out there before it rises
  setDetent("medium", { duration: RISE, easing: RISE_EASING });
}

const focusTitle = () => document.getElementById(TITLE_ID)?.focus({ preventScroll: true });

/**
 * Opens `event`'s details. `source` says what opened them (a card, its "Detalles", the line under it, a shared
 * link), counted as a GoatCounter event. `shared`: the list was just scrolled to its card (a shared link).
 */
export function openEventDrawer(
  event: DanceEvent,
  { source, pushHistory = true, shared = false }: { source?: DetailsSource; pushHistory?: boolean; shared?: boolean } = {},
) {
  const element = drawer();
  if (leaving) finishClose(); // tapped while the panel was sliding out: start over
  const wasOpen = element.open;
  if (!wasOpen) opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  current = event;
  render(event);
  if (wasOpen) highlightCurrentCard();
  else show(event, shared);
  focusTitle();
  if (pushHistory) {
    const state: HistoryState = { eventId: event.id };
    // Another card while the side panel is open: the address changes, and back still closes.
    if (wasOpen) history.replaceState(state, "", eventPath(event));
    else history.pushState(state, "", eventPath(event));
  }
  trackPageview(eventPath(event), event.title); // which events people look at
  if (source) trackEvent(detailsEventName(source));
}

// ---------- close ----------

/** Every close goes through the history ("back"), so ×, the scrim, Escape, a drag and the back button agree. */
function requestClose({ from = offset, velocity = 0 } = {}) {
  if (!drawer().open || leaving) return;
  if ((history.state as HistoryState | null)?.eventId) {
    pendingExit = { from, velocity };
    history.back(); // popstate → leave
  } else leave({ from, velocity });
}

/** Slide away from `from` at the finger's `velocity` (px/ms), then close. */
function leave({ from = offset, velocity = 0, instant = false } = {}) {
  const element = drawer();
  if (!element.open || leaving) return;
  leaving = true;
  document.querySelectorAll(".event-card.is-current").forEach((card) => card.classList.remove("is-current"));
  if (instant || prefersReducedMotion()) return finishClose();
  if (mode === "panel") {
    element.classList.add("is-closing");
    exitTimer = window.setTimeout(finishClose, PANEL_EXIT);
    return;
  }
  const duration = exitDuration(from, viewport, velocity);
  place(offsetFor("closed", viewport), { duration, easing: EXIT_EASING });
  exitTimer = window.setTimeout(finishClose, duration);
}

function finishClose() {
  window.clearTimeout(exitTimer);
  const element = drawer();
  leaving = false;
  pendingExit = null;
  element.classList.remove("is-closing", "is-animating", "is-dragging");
  if (element.open) element.close(); // → "close": the rest of the cleanup
}

/** The window crossed 900 px while open: reopen in the other mode, on the same event. */
function swapMode() {
  const element = drawer();
  if (!current) return;
  swapping = true;
  element.close();
  document.documentElement.classList.remove("has-viewer-panel");
  show(current, false);
  focusTitle();
}

// ---------- dragging (phones) ----------

interface Drag {
  startY: number;
  startOffset: number;
  from: Detent;
  samples: { y: number; time: number }[];
  moved: boolean;
}

let drag: Drag | null = null;

function dragStart(y: number, time: number) {
  drag = { startY: y, startOffset: offset, from: detent, samples: [{ y, time }], moved: false };
}

function dragMove(y: number, time: number) {
  if (!drag) return;
  if (Math.abs(y - drag.startY) > DRAG_SLOP) drag.moved = true;
  let next = drag.startOffset + (y - drag.startY);
  if (next < 0) next = -((-next) ** RUBBER_BAND);
  drawer().classList.add("is-dragging");
  place(next);
  drag.samples.push({ y, time });
  drag.samples = drag.samples.filter((sample) => time - sample.time <= VELOCITY_WINDOW);
}

/** Let go: settle at a height, or close. False when it wasn't a drag (a tap). */
function dragEnd(): boolean {
  const ended = drag;
  drag = null;
  drawer().classList.remove("is-dragging");
  if (!ended) return false;
  if (!ended.moved) {
    if (offset !== offsetFor(detent, viewport)) place(offsetFor(detent, viewport));
    return false;
  }
  const [first, last] = [ended.samples[0], ended.samples.at(-1)];
  const velocity = first && last && last.time > first.time ? (last.y - first.y) / (last.time - first.time) : 0;
  const target = settle(offset, viewport, velocity, ended.from);
  if (target === "close") requestClose({ from: offset, velocity: Math.max(velocity, 0) });
  else setDetent(target);
  return true;
}

/** Its bar (handle and head) drags the drawer at any height; × is a button. */
const inBar = (target: HTMLElement) => Boolean(target.closest(".drawer__grip, .drawer__head")) && !target.closest("[data-close-drawer]");

/**
 * Touch: at half height any vertical drag moves the drawer; at full height its content scrolls, and the drawer
 * follows the finger from its bar, or when the content is at its top and the finger pulls down.
 */
function initTouch(panel: HTMLElement) {
  let touch: { x: number; y: number; bar: boolean; decided: boolean; dragging: boolean } | null = null;
  panel.addEventListener(
    "touchstart",
    (domEvent) => {
      const point = domEvent.touches[0];
      touch =
        mode === "sheet" && !leaving && point && domEvent.touches.length === 1
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
        const atTop = (body()?.scrollTop ?? 0) <= 0;
        touch.dragging = Math.abs(dy) >= Math.abs(dx) && (detent === "medium" || touch.bar || (atTop && dy > 0));
        if (touch.dragging) dragStart(touch.y, domEvent.timeStamp);
      }
      if (!touch.dragging) return;
      if (domEvent.cancelable) domEvent.preventDefault(); // the drawer owns the gesture: nothing scrolls under it
      dragMove(point.clientY, domEvent.timeStamp);
    },
    { passive: false },
  );
  const release = () => {
    if (touch?.dragging) dragEnd();
    touch = null;
  };
  panel.addEventListener("touchend", release);
  panel.addEventListener("touchcancel", release);
}

/** A mouse or pen: the bar drags at any height, the content at half height. A tap on the handle isn't a drag. */
function initPointer(panel: HTMLElement) {
  let captured = false;
  let swallowClick = false;
  panel.addEventListener("pointerdown", (domEvent) => {
    const target = domEvent.target as HTMLElement;
    if (domEvent.pointerType === "touch" || domEvent.button !== 0 || mode !== "sheet" || leaving) return;
    if (target.closest("a, summary, input, button:not([data-detent-toggle])")) return;
    if (!inBar(target) && detent === "full") return; // the content scrolls
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
  const release = (domEvent: PointerEvent) => {
    if (!drag || domEvent.pointerType === "touch") return;
    if (!dragEnd()) return;
    swallowClick = true; // the click that ends a drag on the handle isn't a tap on it
    window.setTimeout(() => (swallowClick = false));
  };
  panel.addEventListener("pointerup", release);
  panel.addEventListener("pointercancel", release);
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
  // The wheel at half height expands it, as scrolling the content would; at the top of the full drawer, a wheel
  // up brings it back.
  panel.addEventListener(
    "wheel",
    (domEvent) => {
      if (mode !== "sheet" || leaving) return;
      if (detent === "medium" && domEvent.deltaY > 0) {
        domEvent.preventDefault();
        setDetent("full");
      } else if (detent === "full" && (body()?.scrollTop ?? 0) <= 0 && domEvent.deltaY < -WHEEL_DOWN) {
        domEvent.preventDefault();
        setDetent("medium");
      }
    },
    { passive: false },
  );
}

// ---------- setup ----------

/** `find` looks an event up by id, to open it again when the visitor goes forward in history. */
export function initEventDrawer(find: (id: string) => DanceEvent | undefined) {
  findEvent = find;
  const element = drawer();
  const panel = byId("drawer-panel");

  element.addEventListener("click", (domEvent) => {
    const target = domEvent.target as HTMLElement;
    if (target.closest("[data-close-drawer]")) requestClose(); // ×, or the scrim
    else if (target.closest("[data-detent-toggle]")) setDetent(otherDetent(detent));
    else if (current) handleMediaLinkClick(domEvent, current);
  });

  // Escape: the modal drawer gets "cancel" (slide away instead of vanishing); the side panel isn't modal, so the
  // page handles it, unless a sheet is open over it (that one closes first).
  element.addEventListener("cancel", (cancel) => {
    cancel.preventDefault();
    requestClose();
  });
  document.addEventListener("keydown", (key) => {
    if (key.key !== "Escape" || !element.open || mode !== "panel" || document.querySelector("dialog:modal")) return;
    key.preventDefault();
    requestClose();
  });

  // The keyboard reaching something below the half drawer's fold: the whole drawer, so it's seen.
  panel.addEventListener("focusin", (domEvent) => {
    const target = domEvent.target as HTMLElement;
    if (mode === "sheet" && detent === "medium" && body()?.contains(target) && target.matches(":focus-visible")) setDetent("full");
  });

  // A rotation, or the phone's address bar showing or hiding, changes the screen's height.
  window.addEventListener("resize", () => {
    if (!element.open || leaving) return;
    if (window.matchMedia(PANEL_QUERY).matches !== (mode === "panel")) swapMode();
    else if (mode === "sheet") {
      viewport = window.innerHeight;
      place(offsetFor(detent, viewport));
    }
  });

  element.addEventListener("close", () => {
    if (swapping) {
      swapping = false; // reopened in the other mode already
      return;
    }
    window.clearTimeout(exitTimer);
    leaving = false;
    byId("drawer-content").replaceChildren(); // nothing of it stays in memory while it's closed
    current = null;
    holdClips("drawer", false);
    document.documentElement.classList.remove("has-viewer-panel");
    document.querySelectorAll(".event-card.is-current").forEach((card) => card.classList.remove("is-current"));
    // Focus back where it was (the card or its "Detalles"), unless the visitor already moved it elsewhere.
    const focus = document.activeElement;
    if (opener?.isConnected && (!focus || focus === document.body || element.contains(focus))) {
      opener.focus({ preventScroll: true });
    }
    opener = null;
    // Closed some other way (the browser's own): leave the event's URL the way back would.
    if ((history.state as HistoryState | null)?.eventId) history.back();
  });

  // Back (or forward): follow the URL.
  window.addEventListener("popstate", (domEvent) => {
    const eventId = (domEvent.state as HistoryState | null)?.eventId;
    // Back from a sheet over the drawer (posts, a post) lands on this same event: it stays as it is.
    if (eventId && element.open && !leaving && current?.id === eventId) return;
    const event = eventId ? findEvent(eventId) : undefined;
    if (event) {
      openEventDrawer(event, { pushHistory: false });
      return;
    }
    if (!element.open) return;
    // Safari's edge swipe already animated going back: close at once instead of animating twice.
    const browserAnimated = (domEvent as PopStateEvent & { hasUAVisualTransition?: boolean }).hasUAVisualTransition;
    const exit = pendingExit ?? { from: offset, velocity: 0 };
    pendingExit = null;
    leave({ ...exit, instant: Boolean(browserAnimated) });
  });

  initTouch(panel);
  initPointer(panel);
}
