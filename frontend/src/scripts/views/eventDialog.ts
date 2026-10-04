// Event viewer on the home page: a dialog with one slide per event on screen, in list order.
//   - Swipe sideways (or ‹ ›, or the arrow keys) for the previous/next event. Each event fills the width, like an
//     Instagram post. Swiping is signaled by the "3 de 9" counter with ‹ › and, until the visitor first swipes, a
//     nudge that briefly shows the next event.
//   - Phones (under 900 px): a sheet over the lower part of the screen (about 58%) with the event's flyer above
//     it, so tapping a card shows what's new at once. Pulling it up (or scrolling it) expands it to the whole
//     screen; the handle switches between the two heights (viewerSheet.ts has the logic). Swiping keeps the
//     height chosen. Close with ×, Escape, the phone's back button, or by dragging it down (lib/sheet.ts).
//   - Wide screens: a side panel on the right, not modal, so the list stays usable next to it: tapping another
//     card shows that event in the panel, and the current card is outlined. Escape and × close it.
// The address bar shows the current event's own URL (/evento/<id>/): opening pushes it to the history,
// so "back" closes the viewer; swiping (or another card, in the panel) replaces it, so back still closes.
//
// Memory: the track has a slide for every event (so swiping and the counter work as one strip), but only the
// current event and its neighbors have their detail inside (`renderAround`, RENDERED_AROUND); the others are
// empty slides of the same width. Filling all of them loaded every flyer and clip of the list at once (35
// full-size images for 37 events, about 190 MB decoded), which made iPhone's Safari close the page. Emptied
// slides release their clips and players, and closing the viewer empties them all.

import type { DanceEvent } from "../types";
import { byId, escapeHtml, prefersReducedMotion } from "../lib/dom";
import { detailsEventName, type DetailsSource, trackEvent, trackPageview } from "../lib/analytics";
import { eventPath } from "../lib/links";
import { onceFlag } from "../lib/onceFlag";
import { dismissSheet, initSheet } from "../lib/sheet";
import { pauseClips, releaseClips, resumeClips, watchClips } from "./clips";
import { stopInlinePlayers } from "./inlinePlayer";
import { eventSheetHtml, handleDetailClick } from "./eventDetail";
import { slidesToRender } from "./viewerWindow";
import { type Detent, detentAt, otherDetent, scrollTopFor, settle } from "./viewerSheet";

const SETTLE_DELAY = 120; // ms without scrolling that count as "the swipe ended"
const RENDERED_AROUND = 1; // events rendered on each side of the current one
const PANEL_QUERY = "(min-width: 900px)"; // wide enough for the list and a side panel (tokens.css, --panel-width)
const VELOCITY_WINDOW = 80; // ms of recent movement for a mouse drag's release speed
const DRAG_SLOP = 4; // px a mouse moves before a press on the handle is a drag, not a tap
const GLIDE_MAX = 700; // ms: a released drag's glide to its height is over by then

const swipeHint = onceFlag("swipe-hint-seen");

let list: DanceEvent[] = [];
let index = 0;
let findEvent: (id: string) => DanceEvent | undefined = () => undefined;
let mode: "sheet" | "panel" = "sheet";
let detent: Detent = "medium";
let opener: HTMLElement | null = null; // what had the focus when the viewer opened: it gets it back
let swapping = false; // closing only to reopen in the other mode (the window crossed 900 px)

interface HistoryState {
  eventId?: string;
}

const dialog = () => byId<HTMLDialogElement>("event-dialog");
const track = () => byId("viewer-track");
const slides = () => [...track().children] as HTMLElement[];
const currentSlide = () => slides()[index];

/** An empty slide: its detail goes in when it's the current event or next to it (fillSlide). */
function slideHtml(position: number): string {
  return `
    <article class="viewer-slide" data-slide="${position}" role="group"
      aria-roledescription="evento" aria-label="${position + 1} de ${list.length}"></article>`;
}

/** Each slide's bar, at the top of its sheet: the handle (phones), ‹ "3 de 9" ›, and ×. */
function barHtml(position: number): string {
  const expanded = detent === "full";
  return `
    <div class="viewer-bar">
      <button class="viewer-bar__grab" type="button" data-detent-toggle aria-expanded="${expanded}"
        aria-label="${expanded ? "Ver menos" : "Ver todo el detalle"}"><span class="sheet-handle" aria-hidden="true"></span></button>
      <div class="viewer-bar__nav">
        <button class="icon-btn" type="button" data-step="-1" aria-label="Evento anterior"${position === 0 ? " disabled" : ""}>‹</button>
        <span class="viewer-bar__count">${position + 1} de ${list.length}</span>
        <button class="icon-btn" type="button" data-step="1" aria-label="Evento siguiente"${position >= list.length - 1 ? " disabled" : ""}>›</button>
      </div>
      <button class="icon-btn" type="button" data-close-dialog aria-label="Cerrar">×</button>
    </div>`;
}

/** The detail, or, if this event can't be shown, a way to its page: one bad event never breaks the viewer. */
function detailHtml(event: DanceEvent, position: number, selected = 0): string {
  const bar = barHtml(position);
  try {
    return eventSheetHtml(event, selected, { titleId: `event-title-${position}`, bar });
  } catch (error) {
    console.error(error);
    return `
      <div class="viewer-panel">
        ${bar}
        <div class="event-dialog__info">
          <h2 class="event-dialog__title" id="event-title-${position}">${escapeHtml(event.title)}</h2>
          <p>No pudimos mostrar este evento aquí.</p>
          <p><a class="btn" href="${escapeHtml(eventPath(event))}">Abrir su página</a></p>
        </div>
      </div>`;
  }
}

// ---------- the sheet's two heights (phones) ----------

/** How tall the flyer's area above the half sheet is: the scroll that expands the sheet to the whole screen. */
function peekOf(slide: HTMLElement): number {
  return slide.querySelector<HTMLElement>(".event-dialog__visual")?.offsetHeight ?? 0;
}

function scrollToDetent(slide: HTMLElement, next: Detent, smooth: boolean) {
  slide.scrollTo({ top: scrollTopFor(next, peekOf(slide)), behavior: smooth && !prefersReducedMotion() ? "smooth" : "auto" });
}

/** A rendered slide that isn't the current one takes the sheet's height, so swiping keeps it. */
function matchDetent(slide: HTMLElement) {
  if (mode !== "sheet" || slide === currentSlide() || slide.dataset.rendered === undefined) return;
  const peek = peekOf(slide);
  if (slide.scrollTop <= peek) slide.scrollTop = scrollTopFor(detent, peek);
}

/** The full sheet covers the flyer: its clip stops, and plays again when the sheet goes back down. */
function syncClips() {
  const slide = currentSlide();
  if (!slide || mode !== "sheet") return;
  if (detent === "full") pauseClips(slide);
  else resumeClips(slide);
}

function setDetent(next: Detent) {
  if (next === detent) return;
  detent = next;
  dialog().dataset.detent = next;
  dialog()
    .querySelectorAll<HTMLElement>("[data-detent-toggle]")
    .forEach((grab) => {
      grab.setAttribute("aria-expanded", String(next === "full"));
      grab.setAttribute("aria-label", next === "full" ? "Ver menos" : "Ver todo el detalle");
    });
  slides().forEach(matchDetent);
  syncClips();
}

/** The current slide was scrolled (by touch, the wheel, the keyboard or the handle): which height is it at? */
function onSlideScroll(slide: HTMLElement) {
  if (mode !== "sheet" || slide !== currentSlide()) return;
  setDetent(detentAt(slide.scrollTop, peekOf(slide)));
}

// ---------- slides ----------

function fillSlide(slide: HTMLElement) {
  if (slide.dataset.rendered !== undefined) return;
  const position = Number(slide.dataset.slide);
  const event = list[position];
  if (!event) return;
  slide.innerHTML = detailHtml(event, position);
  slide.dataset.rendered = "";
  watchClips(slide);
  matchDetent(slide);
}

/** Back to an empty slide, releasing its clip and player first. */
function emptySlide(slide: HTMLElement) {
  if (slide.dataset.rendered === undefined) return;
  stopInlinePlayers(slide);
  releaseClips(slide);
  slide.replaceChildren();
  slide.scrollTop = 0;
  delete slide.dataset.rendered;
}

/** Fill the slides around `position`; with `trim`, empty the others (when a swipe has settled). */
function renderAround(position: number, { trim = true } = {}) {
  const keep = slidesToRender(position, list.length, RENDERED_AROUND);
  slides().forEach((slide, i) => {
    if (keep.has(i)) fillSlide(slide);
    else if (trim) emptySlide(slide);
  });
}

/** Empty every slide (the viewer closed, or opens on another list). */
function emptyAll() {
  slides().forEach(emptySlide);
}

function scrollToSlide(position: number, smooth: boolean) {
  const slide = slides()[position];
  if (!slide) return;
  const left = slide.offsetLeft - (track().clientWidth - slide.clientWidth) / 2;
  track().scrollTo({ left, behavior: smooth && !prefersReducedMotion() ? "smooth" : "auto" });
}

/**
 * Side panel: the current event's card is outlined in the list (and, after ‹ ›, brought into view). Also after
 * the list is drawn again (main.ts), as filtering replaces the cards.
 */
export function highlightCurrentCard({ reveal = false } = {}) {
  document.querySelectorAll(".event-card.is-current").forEach((card) => card.classList.remove("is-current"));
  const id = list[index]?.id;
  if (!dialog().open || mode !== "panel" || !id) return;
  const card = document.querySelector(`.event-card__hit[data-event="${CSS.escape(id)}"]`)?.closest(".event-card");
  card?.classList.add("is-current");
  if (reveal) card?.scrollIntoView({ block: "nearest", behavior: prefersReducedMotion() ? "auto" : "smooth" });
}

/** Make `position` the current event: URL, and only its slide reachable by keyboard. */
function setCurrent(position: number, { updateUrl }: { updateUrl: boolean }) {
  index = position;
  const event = list[position];
  if (!event) return;
  renderAround(position);
  dialog().setAttribute("aria-labelledby", `event-title-${position}`);
  slides().forEach((slide, i) => (slide.inert = i !== position));
  if (updateUrl) history.replaceState({ eventId: event.id } satisfies HistoryState, "", eventPath(event));
  highlightCurrentCard({ reveal: updateUrl });
  syncClips();
  trackPageview(eventPath(event), event.title); // which events people look at
}

function step(delta: number) {
  const next = Math.min(Math.max(index + delta, 0), list.length - 1);
  if (next === index) return;
  scrollToSlide(next, true);
  setCurrent(next, { updateUrl: true });
  swipeHint.mark();
}

/** The slide closest to the center of the viewer. */
function closestSlide(): number {
  const center = track().scrollLeft + track().clientWidth / 2;
  const distances = slides().map((slide) => Math.abs(slide.offsetLeft + slide.clientWidth / 2 - center));
  return distances.indexOf(Math.min(...distances));
}

/** After a swipe settles, the slide closest to the center is the current one. */
function onTrackScroll() {
  // Closing hides the track, which resets its scroll: that's no swipe (it would put an event's URL back).
  if (!dialog().open) return;
  const closest = closestSlide();
  if (closest >= 0 && closest !== index) {
    setCurrent(closest, { updateUrl: true });
    swipeHint.mark();
  } else if (closest === index) {
    renderAround(index); // a glide (‹ ›) filled slides on its way: back to the current event and its neighbors
  }
}

// ---------- one-time swipe hint ----------

function maybeHint() {
  if (list.length < 2 || swipeHint.seen() || prefersReducedMotion()) return;
  const hint = `is-hinting-${index < list.length - 1 ? "next" : "previous"}`;
  const stop = () => track().classList.remove(hint);
  track().classList.add(hint);
  track().addEventListener("animationend", stop, { once: true });
  dialog().addEventListener("touchstart", stop, { once: true, passive: true }); // the visitor took over
}

// ---------- open, close, history ----------

/** Open as a sheet (modal) on phones, or as a side panel (not modal) next to the list on wide screens. */
function showDialog() {
  const element = dialog();
  mode = window.matchMedia(PANEL_QUERY).matches ? "panel" : "sheet";
  element.dataset.mode = mode;
  element.dataset.detent = detent;
  document.documentElement.classList.toggle("has-viewer-panel", mode === "panel");
  if (mode === "panel") element.show();
  else element.showModal();
}

/** The window crossed 900 px while open: reopen in the other mode, on the same event. */
function swapMode() {
  swapping = true;
  dialog().close();
  showDialog();
  scrollToSlide(index, false);
  highlightCurrentCard();
}

/**
 * Opens `event`, with `events` (the list on screen, in order) as the slides to swipe through. `source` says what
 * opened it (a card, its "Detalles", the line under it, a shared link), counted as a GoatCounter event.
 */
export function openEventDialog(
  event: DanceEvent,
  events: DanceEvent[],
  { pushHistory = true, source }: { pushHistory?: boolean; source?: DetailsSource } = {},
) {
  const wasOpen = dialog().open;
  emptyAll(); // the slides of the list it had before, with their clips
  list = events.some((item) => item.id === event.id) ? events : [event];
  const position = list.findIndex((item) => item.id === event.id);
  if (!wasOpen) {
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    detent = "medium"; // a sheet opens at half height, the flyer above it
  }
  track().innerHTML = list.map((_, position) => slideHtml(position)).join("");
  if (!wasOpen) showDialog();
  // The viewer itself takes the focus, not its first button: opening it (for example from a shared link,
  // before any tap) would otherwise show "‹" outlined as if selected. The arrow keys work from here.
  dialog().focus({ preventScroll: true });
  scrollToSlide(position, false);
  setCurrent(position, { updateUrl: wasOpen && pushHistory }); // another card while the panel is open: replace
  if (pushHistory && !wasOpen) history.pushState({ eventId: event.id } satisfies HistoryState, "", eventPath(event));
  if (source) trackEvent(detailsEventName(source));
  maybeHint();
}

/** `find` looks an event up by id, to reopen it when the visitor goes forward in history. */
export function initEventDialog(find: (id: string) => DanceEvent | undefined) {
  findEvent = find;
  const element = dialog();

  element.addEventListener("click", (domEvent) => {
    const target = domEvent.target as HTMLElement;
    const slide = target.closest<HTMLElement>("[data-slide]");
    if (slide) {
      const position = Number(slide.dataset.slide);
      const event = list[position];
      const rerender = (selected: number) => {
        if (!event) return;
        stopInlinePlayers(slide);
        releaseClips(slide);
        slide.innerHTML = detailHtml(event, position, selected);
        watchClips(slide);
      };
      if (event && handleDetailClick(slide, domEvent, event, rerender)) return;
    }
    const stepButton = target.closest<HTMLElement>("[data-step]");
    if (stepButton) step(Number(stepButton.dataset.step));
    else if (target.closest("[data-detent-toggle]")) {
      const current = currentSlide();
      if (current) scrollToDetent(current, otherDetent(detent), true);
    }
    // Close on ×, or a tap on the backdrop (the modal dialog itself; the side panel has none).
    else if ((target === element && mode === "sheet") || target.closest("[data-close-dialog]")) dismissSheet(element);
  });

  element.addEventListener("keydown", (key) => {
    if (key.key === "ArrowRight") step(1);
    else if (key.key === "ArrowLeft") step(-1);
  });

  // The side panel isn't modal, so the browser doesn't close it on Escape: do it here, unless a sheet is open
  // over it (that one closes first).
  document.addEventListener("keydown", (key) => {
    if (key.key !== "Escape" || !element.open || mode !== "panel" || document.querySelector("dialog:modal")) return;
    key.preventDefault();
    dismissSheet(element);
  });

  // While swiping, the next event is filled at once (a frame at a time); the rest waits for the swipe to settle.
  let settleTimer = 0;
  let frame = 0;
  track().addEventListener(
    "scroll",
    () => {
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0;
          if (!element.open) return;
          const closest = closestSlide();
          if (closest >= 0) renderAround(closest, { trim: false }); // there before the finger gets to it
        });
      clearTimeout(settleTimer);
      settleTimer = window.setTimeout(onTrackScroll, SETTLE_DELAY);
    },
    { passive: true },
  );

  // A slide scrolling up and down is the sheet changing height (scroll events don't bubble: caught on the way down).
  element.addEventListener(
    "scroll",
    (domEvent) => {
      const target = domEvent.target;
      if (target instanceof HTMLElement && target.classList.contains("viewer-slide")) onSlideScroll(target);
    },
    { capture: true, passive: true },
  );

  // A rotation, or the phone's address bar showing or hiding, changes the width: stay on the same event.
  window.addEventListener("resize", () => {
    if (!element.open) return;
    if (window.matchMedia(PANEL_QUERY).matches !== (mode === "panel")) swapMode();
    else scrollToSlide(index, false);
  });

  // Closed by ×, backdrop, Escape or pull-down: leave the event's URL the way the back button would.
  element.addEventListener("close", () => {
    if (swapping) {
      swapping = false; // reopened in the other mode already
      return;
    }
    pauseClips(element);
    stopInlinePlayers(element);
    emptyAll(); // nothing of the viewer stays in memory while it's closed
    element.classList.remove("is-gliding");
    document.documentElement.classList.remove("has-viewer-panel");
    document.querySelectorAll(".event-card.is-current").forEach((card) => card.classList.remove("is-current"));
    // Focus back where it was (the card or its "Detalles"), unless the visitor already moved it elsewhere.
    const focus = document.activeElement;
    if (opener?.isConnected && (!focus || focus === document.body || element.contains(focus))) {
      opener.focus({ preventScroll: true });
    }
    opener = null;
    if ((history.state as HistoryState | null)?.eventId) history.back();
  });

  // Back (or forward) button: follow the URL.
  window.addEventListener("popstate", (domEvent) => {
    const eventId = (domEvent.state as HistoryState | null)?.eventId;
    const event = eventId ? findEvent(eventId) : undefined;
    // Safari's edge swipe already animates going back: close at once instead of animating twice.
    const browserAnimated = (domEvent as PopStateEvent & { hasUAVisualTransition?: boolean }).hasUAVisualTransition;
    // Back from a sheet over the viewer (posts, a post) lands on this same event: the viewer stays as it is.
    if (event && element.open && list[index]?.id === event.id) return;
    if (event) openEventDialog(event, list.length ? list : [event], { pushHistory: false });
    else if (element.open) dismissSheet(element, { instant: Boolean(browserAnimated) });
  });

  // Touch: dragging down while the sheet is at half height (its slide scrolled to the top) closes it. Up, or from
  // the full sheet, is the slide's own scrolling: the sheet changes height. The side panel doesn't drag.
  initSheet(element, () => mode === "sheet" && (currentSlide()?.scrollTop ?? 0) <= 0);
  initMouseDrag(element);
}

/**
 * A mouse or pen dragging the sheet by its bar (touch scrolls natively): it follows the pointer between the two
 * heights, and pulled below the half sheet it moves down with the backdrop fading, like a touch drag. On release,
 * `settle` picks the height, or closes.
 */
function initMouseDrag(element: HTMLDialogElement) {
  let drag: {
    bar: HTMLElement;
    slide: HTMLElement;
    startY: number;
    startTop: number;
    position: number;
    moved: boolean;
  } | null = null;
  let samples: { position: number; time: number }[] = [];
  let swallowClick = false;

  element.addEventListener("pointerdown", (domEvent) => {
    const target = domEvent.target as HTMLElement;
    if (domEvent.pointerType === "touch" || domEvent.button !== 0 || mode !== "sheet") return;
    const bar = target.closest<HTMLElement>(".viewer-bar");
    const slide = bar?.closest<HTMLElement>(".viewer-slide");
    if (!bar || !slide || target.closest("button:not([data-detent-toggle])")) return;
    domEvent.preventDefault(); // no text selection or native drag starting from the bar (it'd cancel this one)
    drag = { bar, slide, startY: domEvent.clientY, startTop: slide.scrollTop, position: slide.scrollTop, moved: false };
    samples = [{ position: slide.scrollTop, time: domEvent.timeStamp }];
  });

  element.addEventListener("pointermove", (domEvent) => {
    if (!drag) return;
    const dy = domEvent.clientY - drag.startY;
    if (!drag.moved && Math.abs(dy) < DRAG_SLOP) return;
    if (!drag.moved) {
      drag.moved = true;
      // Captured only once it's a drag: captured from the press, a tap's click would land on the bar, not the handle.
      drag.bar.setPointerCapture(domEvent.pointerId);
      element.classList.add("is-dragging", "is-gliding"); // no transitions, no scroll snapping while it follows
    }
    drag.position = drag.startTop - dy;
    drag.slide.scrollTop = Math.max(drag.position, 0);
    const pulled = Math.max(-drag.position, 0);
    element.style.transform = pulled ? `translateY(${pulled}px)` : "";
    element.style.setProperty("--drag", String(Math.min(pulled / (window.innerHeight * 0.5), 1) * 0.8));
    samples.push({ position: drag.position, time: domEvent.timeStamp });
    samples = samples.filter((sample) => domEvent.timeStamp - sample.time <= VELOCITY_WINDOW);
  });

  const release = () => {
    if (!drag) return;
    const { slide, position, moved } = drag;
    drag = null;
    if (!moved) return; // a plain click: the handle's click toggles the height
    swallowClick = true; // the click that follows, if any (it comes before the timer)
    window.setTimeout(() => (swallowClick = false));
    const [first, last] = [samples[0], samples.at(-1)];
    const velocity = first && last && last.time > first.time ? (last.position - first.position) / (last.time - first.time) : 0;
    const peek = peekOf(slide);
    const target = settle(position, peek, velocity);
    if (target === "close") {
      dismissSheet(element, { velocity: Math.max(-velocity, 0) });
      return;
    }
    element.classList.remove("is-dragging"); // a sheet pulled below the half height springs back (sheet.css)
    element.style.removeProperty("transform");
    element.style.removeProperty("--drag");
    // Snapping stays off until the glide to the chosen height ends: turned back on mid-glide, it stops it.
    const done = () => element.classList.remove("is-gliding");
    if (position >= peek) return done();
    scrollToDetent(slide, target, true);
    slide.addEventListener("scrollend", done, { once: true });
    window.setTimeout(done, GLIDE_MAX); // browsers without scrollend, or nothing to scroll
  };
  element.addEventListener("pointerup", release);
  element.addEventListener("pointercancel", release);

  // The click that ends a drag on the handle isn't a tap on it.
  element.addEventListener(
    "click",
    (domEvent) => {
      if (!swallowClick) return;
      swallowClick = false;
      domEvent.stopPropagation();
      domEvent.preventDefault();
    },
    { capture: true },
  );
}
