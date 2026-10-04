// Event viewer on the home page: a dialog with one slide per event on screen, in list order.
//   - Swipe sideways (or ‹ ›, or the arrow keys) for the previous/next event; scroll up/down to read.
//   - Each event fills the width, like an Instagram post. Swiping is signaled by the "3 de 9" counter with
//     ‹ › and, until the visitor first swipes, a nudge that briefly shows the next event.
//   - Close with ×, Escape, the phone's back button, or by dragging it down (lib/sheet.ts); every way
//     of closing slides it away instead of making it vanish.
// The address bar shows the current event's own URL (/evento/<id>/): opening pushes it to the history,
// so "back" closes the viewer; swiping replaces it, so back still closes instead of stepping events.
//
// Memory: the track has a slide for every event (so swiping and the counter work as one strip), but only the
// current event and its neighbors have their detail inside (`renderAround`, RENDERED_AROUND); the others are
// empty slides of the same width. Filling all of them loaded every flyer and clip of the list at once (35
// full-size images for 37 events, about 190 MB decoded), which made iPhone's Safari close the page. Emptied
// slides release their clips and players, and closing the viewer empties them all.

import type { DanceEvent } from "../types";
import { byId, escapeHtml, prefersReducedMotion } from "../lib/dom";
import { trackPageview } from "../lib/analytics";
import { eventPath } from "../lib/links";
import { dismissSheet, initSheet } from "../lib/sheet";
import { pauseClips, releaseClips, watchClips } from "./clips";
import { stopInlinePlayers } from "./inlinePlayer";
import { eventDetailHtml, handleDetailClick } from "./eventDetail";
import { slidesToRender } from "./viewerWindow";

const HINT_KEY = "swipe-hint-seen";
const SETTLE_DELAY = 120; // ms without scrolling that count as "the swipe ended"
const RENDERED_AROUND = 1; // events rendered on each side of the current one

let list: DanceEvent[] = [];
let index = 0;
let findEvent: (id: string) => DanceEvent | undefined = () => undefined;

interface HistoryState {
  eventId?: string;
}

const dialog = () => byId<HTMLDialogElement>("event-dialog");
const track = () => byId("viewer-track");
const slides = () => [...track().children] as HTMLElement[];

/** An empty slide: its detail goes in when it's the current event or next to it (fillSlide). */
function slideHtml(position: number): string {
  return `
    <article class="viewer-slide event-dialog__layout" data-slide="${position}" role="group"
      aria-roledescription="evento" aria-label="${position + 1} de ${list.length}"></article>`;
}

/** The detail, or, if this event can't be shown, a way to its page: one bad event never breaks the viewer. */
function detailHtml(event: DanceEvent, position: number, selected = 0): string {
  try {
    return eventDetailHtml(event, selected, { headingLevel: 2, titleId: `event-title-${position}` });
  } catch (error) {
    console.error(error);
    return `
      <div class="event-dialog__info">
        <h2 class="event-dialog__title" id="event-title-${position}">${escapeHtml(event.title)}</h2>
        <p>No pudimos mostrar este evento aquí.</p>
        <p><a class="btn" href="${escapeHtml(eventPath(event))}">Abrir su página</a></p>
      </div>`;
  }
}

function fillSlide(slide: HTMLElement) {
  if (slide.dataset.rendered !== undefined) return;
  const position = Number(slide.dataset.slide);
  const event = list[position];
  if (!event) return;
  slide.innerHTML = detailHtml(event, position);
  slide.dataset.rendered = "";
  watchClips(slide);
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

/** The counter ("4 de 18") and the arrows. Updated during a swipe, as soon as the next event passes the middle. */
function showPosition(position: number) {
  byId("viewer-count").textContent = `${position + 1} de ${list.length}`;
  dialog().querySelector<HTMLButtonElement>('[data-step="-1"]')!.disabled = position === 0;
  dialog().querySelector<HTMLButtonElement>('[data-step="1"]')!.disabled = position === list.length - 1;
}

/** Make `position` the current event: counter, arrows, URL, and only its slide reachable by keyboard. */
function setCurrent(position: number, { updateUrl }: { updateUrl: boolean }) {
  index = position;
  const event = list[position];
  if (!event) return;
  renderAround(position);
  showPosition(position);
  dialog().setAttribute("aria-labelledby", `event-title-${position}`);
  slides().forEach((slide, i) => (slide.inert = i !== position));
  if (updateUrl) history.replaceState({ eventId: event.id } satisfies HistoryState, "", eventPath(event));
  trackPageview(eventPath(event), event.title); // which events people look at
}

function step(delta: number) {
  const next = Math.min(Math.max(index + delta, 0), list.length - 1);
  if (next === index) return;
  scrollToSlide(next, true);
  setCurrent(next, { updateUrl: true });
  markHintSeen();
}

/** The slide closest to the center of the viewer. */
function closestSlide(): number {
  const center = track().scrollLeft + track().clientWidth / 2;
  const distances = slides().map((slide) => Math.abs(slide.offsetLeft + slide.clientWidth / 2 - center));
  return distances.indexOf(Math.min(...distances));
}

/** After a swipe settles, the slide closest to the center is the current one. */
function onTrackScroll() {
  const closest = closestSlide();
  if (closest >= 0 && closest !== index) {
    setCurrent(closest, { updateUrl: true });
    markHintSeen();
  }
}

// ---------- one-time swipe hint ----------

function hintSeen(): boolean {
  try {
    return localStorage.getItem(HINT_KEY) === "1";
  } catch {
    return true; // no storage (private mode…): don't nudge every time
  }
}

function markHintSeen() {
  try {
    localStorage.setItem(HINT_KEY, "1");
  } catch {
    // Not saved: the hint shows again next time, which is harmless.
  }
}

function maybeHint() {
  if (list.length < 2 || hintSeen() || prefersReducedMotion()) return;
  const hint = `is-hinting-${index < list.length - 1 ? "next" : "previous"}`;
  const stop = () => track().classList.remove(hint);
  track().classList.add(hint);
  track().addEventListener("animationend", stop, { once: true });
  dialog().addEventListener("touchstart", stop, { once: true, passive: true }); // the visitor took over
}

// ---------- open, close, history ----------

/** Opens `event`, with `events` (the list on screen, in order) as the slides to swipe through. */
export function openEventDialog(event: DanceEvent, events: DanceEvent[], { pushHistory = true } = {}) {
  emptyAll(); // the slides of the list it had before, with their clips
  list = events.some((item) => item.id === event.id) ? events : [event];
  const position = list.findIndex((item) => item.id === event.id);
  track().innerHTML = list.map((_, position) => slideHtml(position)).join("");
  if (!dialog().open) dialog().showModal();
  // The viewer itself takes the focus, not its first button: opening it (for example from a shared link,
  // before any tap) would otherwise show "‹" outlined as if selected. The arrow keys work from here.
  dialog().focus({ preventScroll: true });
  scrollToSlide(position, false);
  setCurrent(position, { updateUrl: false });
  if (pushHistory) history.pushState({ eventId: event.id } satisfies HistoryState, "", eventPath(event));
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
    // Close on × or a tap on the backdrop (the dialog element itself).
    else if (target === element || target.closest("[data-close-dialog]")) dismissSheet(element);
  });

  element.addEventListener("keydown", (key) => {
    if (key.key === "ArrowRight") step(1);
    else if (key.key === "ArrowLeft") step(-1);
  });

  // While swiping, the counter follows at once (a frame at a time); the rest waits for the swipe to settle.
  let settleTimer = 0;
  let frame = 0;
  track().addEventListener(
    "scroll",
    () => {
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0;
          const closest = closestSlide();
          if (closest < 0) return;
          showPosition(closest);
          renderAround(closest, { trim: false }); // the next event is there before the finger gets to it
        });
      clearTimeout(settleTimer);
      settleTimer = window.setTimeout(onTrackScroll, SETTLE_DELAY);
    },
    { passive: true },
  );

  // A rotation, or the phone's address bar showing or hiding, changes the width: stay on the same event.
  window.addEventListener("resize", () => {
    if (element.open) scrollToSlide(index, false);
  });

  // Closed by ×, backdrop, Escape or pull-down: leave the event's URL the way the back button would.
  element.addEventListener("close", () => {
    pauseClips(element);
    stopInlinePlayers(element);
    emptyAll(); // nothing of the viewer stays in memory while it's closed
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

  // Drag down from the top bar, or from the event when it's scrolled to the top.
  initSheet(element, (target) => Boolean(target.closest(".viewer-bar")) || (slides()[index]?.scrollTop ?? 0) <= 0);
}
