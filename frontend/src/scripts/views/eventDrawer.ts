// An event's details, in a drawer over the list (components/EventDrawer.astro), like Instagram's comments.
//   - Phones and tablets (under 900 px wide, or 600 px tall: a phone in landscape): tapping a card or its "Detalles" raises the drawer to half height (the lower
//     55% of the screen) over the list, which stays where it was, visible above it under a light scrim. The list
//     only moves when the card would be mostly hidden: then its image goes right under the bar. Pulled up, or
//     scrolled, the drawer covers the screen (12 px from the top) and its content scrolls; pulled down from its bar,
//     or from the top of its content, it goes back to half height, and once more it closes. The handle switches
//     between the two heights. The drawer is modal: the page behind doesn't scroll, focus goes to the title and
//     back to what opened it. The geometry and where a drag ends: drawerSheet.ts; the gestures: drawerGestures.ts.
//   - Wide screens (900 × 600 and up): a side panel on the right, not modal, so the list stays usable: another card shows its event
//     in the panel, and its card is outlined in the list.
//   - The drawer has no flyer: the visitor is looking at the card. Only one event's details are rendered, and
//     nothing stays once it closes (the iPhone's memory: ARCHITECTURE.md, section 5.7).
// The address bar shows the event's own URL, and every way of closing goes through "back" (drawerHistory.ts).

import type { DanceEvent } from "../types";
import { byId, escapeHtml, prefersReducedMotion } from "../lib/dom";
import { detailsEventName, type DetailsSource, trackEvent, trackPageview } from "../lib/analytics";
import { ICONS } from "../lib/icons";
import { eventPath } from "../lib/links";
import { DURATION, EASE } from "../lib/motion";
import { holdClips } from "./clips";
import { initDrawerGestures } from "./drawerGestures";
import { afterClosing, backOutOfEvent, enterEvent, historyMove } from "./drawerHistory";
import {
  type Detent,
  MEDIUM_SHARE,
  PANEL_MIN_HEIGHT,
  PANEL_MIN_WIDTH,
  cardScrollDelta,
  exitDuration,
  offsetFor,
  otherDetent,
  scrimAt,
} from "./drawerSheet";
import { eventDrawerHtml } from "./eventDetail";
import { handleMediaLinkClick } from "./eventDetailActions";
import { scrollPageTo, stickyOffset } from "./jumpBar";

// Wide enough for the list and a side panel (--panel-width), and tall enough to have no bar at the bottom.
const PANEL_QUERY = `(min-width: ${PANEL_MIN_WIDTH}px) and (min-height: ${PANEL_MIN_HEIGHT}px)`;
const TITLE_ID = "drawer-title";
const UNDER_BAR = 8; // px left between the bar and the card brought into view

/** The drawer's state while the page is open. */
const state = {
  current: null as DanceEvent | null,
  findEvent: (() => undefined) as (id: string) => DanceEvent | undefined,
  mode: "sheet" as "sheet" | "panel",
  detent: "medium" as Detent,
  offset: 0, // px the drawer sits below its full height (phones)
  viewport: 0, // the screen's height when it opened (or last resized)
  opener: null as HTMLElement | null, // what had the focus when it opened: it gets it back
  leaving: false, // sliding away
  pendingExit: null as { from: number; velocity: number } | null, // a close waiting for its "back"
  exitTimer: 0,
  // Where the focus was right before closing: the browser then moves it back to what had it when the drawer was
  // shown (the first card, after the side panel swapped events), so the close handler decides from this instead.
  focusBeforeClose: undefined as Element | null | undefined,
};

const drawer = () => byId<HTMLDialogElement>("event-drawer");
const body = () => drawer().querySelector<HTMLElement>(".drawer__body");

/** The event's card on screen (the list's, or the calendar day's). */
function cardOf(id: string): HTMLElement | undefined {
  return [...document.querySelectorAll<HTMLElement>(`main .event-card[data-event-card="${CSS.escape(id)}"]`)].find(
    (card) => card.offsetParent !== null,
  );
}

/** No card outlined as the side panel's. */
const clearCurrentCard = () =>
  document.querySelectorAll(".event-card.is-current").forEach((card) => card.classList.remove("is-current"));

// ---------- the drawer's height (phones) ----------

/** How the drawer moves to a height: for how long (ms; 0 at once) and along which curve. */
interface Motion {
  duration?: number;
  easing?: string;
}

/** Puts the drawer `next` px below its full height, the scrim following; `duration` animates it (CSS). */
function place(next: number, { duration = 0, easing = EASE.standard }: Motion = {}) {
  state.offset = next;
  const element = drawer();
  const animate = duration > 0 && !prefersReducedMotion();
  element.classList.toggle("is-animating", animate);
  if (animate) {
    element.style.setProperty("--drawer-duration", `${duration}ms`);
    element.style.setProperty("--drawer-easing", easing);
  }
  element.style.setProperty("--drawer-y", `${next}px`);
  element.style.setProperty("--scrim-opacity", scrimAt(next, state.viewport).toFixed(3));
}

function setDetent(next: Detent, { duration = DURATION.settle, easing = EASE.standard }: Motion = {}) {
  state.detent = next;
  const element = drawer();
  element.dataset.detent = next;
  const handle = element.querySelector<HTMLElement>("[data-detent-toggle]");
  handle?.setAttribute("aria-expanded", String(next === "full"));
  handle?.setAttribute("aria-label", next === "full" ? "Ver menos" : "Ver todo el detalle");
  if (next === "medium") body()?.scrollTo({ top: 0 }); // at half height it starts from the top again
  place(offsetFor(next, state.viewport), { duration, easing });
  // The full drawer covers the list's clips: they wait. At half height the one above keeps playing.
  holdClips("drawer", state.mode === "sheet" && next === "full");
}

/**
 * The tapped card stays in view above the half drawer: the list moves only when the card would be mostly hidden,
 * and then its image goes right under the bar. `force` (a shared link): always there, at once.
 */
function bringCardIntoView(id: string, force: boolean) {
  const card = cardOf(id);
  if (!card) return;
  // A shared link jumps straight to it: its flyer loads now, not when the lazy loading gets to it.
  if (force) card.querySelectorAll<HTMLImageElement>("img[loading=lazy]").forEach((image) => (image.loading = "eager"));
  const box = (card.querySelector(".event-card__media") ?? card).getBoundingClientRect();
  const barBottom = stickyOffset() + UNDER_BAR;
  const drawerTop = state.viewport - Math.round(state.viewport * MEDIUM_SHARE);
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
      <div class="drawer__head">
        <div class="drawer__heading"><h2 class="event-detail__title" id="${TITLE_ID}" tabindex="-1">${escapeHtml(event.title)}</h2></div>
        <button class="drawer__close" type="button" data-close-drawer aria-label="Cerrar">${ICONS.close}</button>
      </div>
      <div class="drawer__body event-detail__info">
        <p>No pudimos mostrar este evento aquí.</p>
        <p><a class="btn" href="${escapeHtml(eventPath(event))}">Abrir su página</a></p>
      </div>`;
  }
}

/** Side panel: the open event's card is outlined in the list (also after the list is drawn again: main.ts). */
export function highlightCurrentCard({ reveal = false } = {}) {
  clearCurrentCard();
  if (!drawer().open || state.leaving || state.mode !== "panel" || !state.current) return;
  const card = cardOf(state.current.id);
  card?.classList.add("is-current");
  if (reveal) card?.scrollIntoView({ block: "center" });
}

/** As a modal drawer over the list (phones), or as a side panel next to it (wide screens). */
function show(event: DanceEvent, shared: boolean) {
  const element = drawer();
  state.mode = window.matchMedia(PANEL_QUERY).matches ? "panel" : "sheet";
  element.dataset.mode = state.mode;
  if (state.mode === "panel") {
    element.show();
    holdClips("drawer", false);
    highlightCurrentCard({ reveal: shared });
    return;
  }
  state.viewport = window.innerHeight;
  bringCardIntoView(event.id, shared);
  element.showModal();
  place(offsetFor("closed", state.viewport)); // from just below the screen…
  element.getBoundingClientRect(); // …laid out there before it rises
  setDetent("medium", { duration: DURATION.enter, easing: EASE.emphasizedDecelerate });
}

const focusTitle = () => document.getElementById(TITLE_ID)?.focus({ preventScroll: true });

/**
 * Opens `event`'s details. `source` says what opened them (a card, its "Detalles", a shared link), counted as a
 * GoatCounter event. `shared`: the list was just scrolled to its card (a shared link).
 */
export function openEventDrawer(
  event: DanceEvent,
  { source, pushHistory = true, shared = false }: { source?: DetailsSource; pushHistory?: boolean; shared?: boolean } = {},
) {
  const element = drawer();
  if (state.leaving) finishClose(); // tapped while the panel was sliding out: start over
  const wasOpen = element.open;
  // What opened it gets the focus back: the last card opened, when the side panel swaps events.
  const active = document.activeElement;
  if (active instanceof HTMLElement && active !== document.body && !element.contains(active)) state.opener = active;
  else if (!wasOpen) state.opener = null;
  state.current = event;
  render(event);
  if (wasOpen) highlightCurrentCard();
  else show(event, shared);
  focusTitle();
  if (pushHistory) enterEvent(event, wasOpen);
  trackPageview(eventPath(event), event.title); // which events people look at
  if (source) trackEvent(detailsEventName(source));
}

// ---------- close ----------

/** Every close goes through the history ("back"), so ×, the scrim, Escape, a drag and the back button agree. */
function requestClose({ from = state.offset, velocity = 0 } = {}) {
  if (!drawer().open || state.leaving) return;
  state.pendingExit = { from, velocity };
  if (backOutOfEvent()) return; // popstate → leave
  state.pendingExit = null;
  leave({ from, velocity });
}

/** Slide away from `from` at the finger's `velocity` (px/ms), then close. */
function leave({ from = state.offset, velocity = 0, instant = false } = {}) {
  const element = drawer();
  if (!element.open || state.leaving) return;
  state.leaving = true;
  clearCurrentCard();
  if (instant || prefersReducedMotion()) return finishClose();
  if (state.mode === "panel") {
    element.classList.add("is-closing");
    state.exitTimer = window.setTimeout(finishClose, DURATION.panelOut);
    return;
  }
  const duration = exitDuration(from, state.viewport, velocity);
  place(offsetFor("closed", state.viewport), { duration, easing: EASE.emphasizedAccelerate });
  state.exitTimer = window.setTimeout(finishClose, duration);
}

function finishClose() {
  window.clearTimeout(state.exitTimer);
  const element = drawer();
  state.leaving = false;
  state.pendingExit = null;
  element.classList.remove("is-closing", "is-animating", "is-dragging");
  state.focusBeforeClose = document.activeElement;
  if (element.open) element.close(); // → "close": the rest of the cleanup
}

/** Everything closing leaves behind: the focus back, the content gone, the address. */
function cleanUpAfterClose(element: HTMLDialogElement) {
  window.clearTimeout(state.exitTimer);
  state.leaving = false;
  // Focus back where it was (the last card opened, or its "Detalles"), unless the visitor already moved it elsewhere.
  const focus = state.focusBeforeClose === undefined ? document.activeElement : state.focusBeforeClose;
  state.focusBeforeClose = undefined;
  if (state.opener?.isConnected && (!focus || focus === document.body || element.contains(focus))) {
    state.opener.focus({ preventScroll: true });
  }
  state.opener = null;
  byId("drawer-content").replaceChildren(); // nothing of it stays in memory while it's closed
  state.current = null;
  holdClips("drawer", false);
  clearCurrentCard();
  afterClosing();
}

/** The window crossed 900 px wide (or 600 px tall) while open: reopen in the other mode, on the same event. */
function swapMode() {
  const element = drawer();
  if (!state.current) return;
  element.close(); // its "close" finds it open again and cleans nothing
  show(state.current, false);
  focusTitle();
}

// ---------- setup ----------

/** `find` looks an event up by id, to open it again when the visitor goes forward in history. */
export function initEventDrawer(find: (id: string) => DanceEvent | undefined) {
  state.findEvent = find;
  const element = drawer();
  const panel = byId("drawer-panel");

  element.addEventListener("click", (domEvent) => {
    const target = domEvent.target as HTMLElement;
    if (target.closest("[data-close-drawer]")) requestClose(); // ×, or the scrim
    else if (target.closest("[data-detent-toggle]")) setDetent(otherDetent(state.detent));
    else if (state.current) handleMediaLinkClick(domEvent, state.current);
  });

  // Escape: the modal drawer gets "cancel" (slide away instead of vanishing); the side panel isn't modal, so the
  // page handles it, unless a sheet is open over it (that one closes first).
  element.addEventListener("cancel", (cancel) => {
    cancel.preventDefault();
    requestClose();
  });
  document.addEventListener("keydown", (key) => {
    if (key.key !== "Escape" || !element.open || state.mode !== "panel" || document.querySelector("dialog:modal")) return;
    key.preventDefault();
    requestClose();
  });

  // The keyboard reaching something below the half drawer's fold: the whole drawer, so it's seen.
  panel.addEventListener("focusin", (domEvent) => {
    const target = domEvent.target as HTMLElement;
    if (state.mode === "sheet" && state.detent === "medium" && body()?.contains(target) && target.matches(":focus-visible")) {
      setDetent("full");
    }
  });

  // A rotation, or the phone's address bar showing or hiding, changes the screen's height.
  window.addEventListener("resize", () => {
    if (!element.open || state.leaving) return;
    if (window.matchMedia(PANEL_QUERY).matches !== (state.mode === "panel")) swapMode();
    else if (state.mode === "sheet") {
      state.viewport = window.innerHeight;
      place(offsetFor(state.detent, state.viewport));
    }
  });

  // The "close" event comes after the dialog closed, as a separate task. If it was opened again meanwhile (in the
  // other mode, or another card tapped while the side panel slid away), there's nothing to clean up: doing it would
  // empty the reopened drawer and step back out of its event.
  element.addEventListener("close", () => {
    if (!element.open) cleanUpAfterClose(element);
  });

  // Back (or forward): follow the URL.
  window.addEventListener("popstate", (domEvent) => {
    const drawerNow = { open: element.open, leaving: state.leaving, currentId: state.current?.id ?? null };
    const move = historyMove(domEvent.state, drawerNow, (id) => Boolean(state.findEvent(id)));
    if (move.kind === "open") {
      const event = state.findEvent(move.eventId);
      if (event) openEventDrawer(event, { pushHistory: false });
      return;
    }
    if (move.kind !== "close") return;
    // Safari's edge swipe already animated going back: close at once instead of animating twice.
    const browserAnimated = (domEvent as PopStateEvent & { hasUAVisualTransition?: boolean }).hasUAVisualTransition;
    const exit = state.pendingExit ?? { from: state.offset, velocity: 0 };
    state.pendingExit = null;
    leave({ ...exit, instant: Boolean(browserAnimated) });
  });

  initDrawerGestures(panel, {
    get mode() {
      return state.mode;
    },
    get detent() {
      return state.detent;
    },
    get offset() {
      return state.offset;
    },
    get viewport() {
      return state.viewport;
    },
    get leaving() {
      return state.leaving;
    },
    body,
    place: (next) => place(next),
    setDetent: (next) => setDetent(next),
    close: (release) => requestClose(release),
    setDragging: (dragging) => element.classList.toggle("is-dragging", dragging),
  });
}
