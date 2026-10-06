// The details' place in the history (eventDrawer.ts). The address bar shows the open event's own URL
// (/evento/<id>/): opening pushes it, so every way of closing (×, the scrim, Escape, a drag down, the phone's back
// button) goes through "back", and back or forward opens and closes the details by the entry they land on.
// The entries are overlays over the screen's (screenHistory.ts): they carry the screen under them.

import type { DanceEvent } from "../types";
import { addressAfterClosing, eventPath } from "../lib/links";
import { historyState, overlayState } from "../screenHistory";

/** Whether the current entry is an event's details. */
const onEventEntry = (): boolean => Boolean(historyState().eventId);

/**
 * `event`'s details opened: its entry, over the screen's. Another card while the side panel is open (`wasOpen`)
 * replaces it (the address changes, and back still closes), unless the list moved to another view meanwhile (the
 * calendar): that screen keeps its entry, and the event gets one over it. A period opened whole meanwhile has no
 * entry of its own (screenHistory.ts goTo): the event's entry is replaced as usual.
 */
export function enterEvent(event: DanceEvent, wasOpen: boolean) {
  if (wasOpen && onEventEntry()) history.replaceState({ ...historyState(), eventId: event.id }, "", eventPath(event));
  else history.pushState(overlayState({ eventId: event.id }), "", eventPath(event));
}

/** A way of closing: back, when the current entry is the event's (its popstate then closes it): true. */
export function backOutOfEvent(): boolean {
  if (!onEventEntry()) return false;
  history.back();
  return true;
}

/**
 * Closed, whatever the way. If it was the browser's own (the event's entry is still current), its entry is left as
 * back would; on a screen the list moved to while the side panel was open (whose entry kept the event's address),
 * the address goes back to the home page's.
 */
export function afterClosing() {
  if (backOutOfEvent()) return;
  const address = addressAfterClosing(location, historyState().screen?.view);
  if (address) history.replaceState(history.state, "", address);
}

export type HistoryMove = { kind: "stay" } | { kind: "open"; eventId: string } | { kind: "close" } | { kind: "none" };

/**
 * Back or forward landed on an entry with `state`: what the details do. The same event, open (back from a sheet over
 * it: the posts, a post): it stays. Another event that exists: it opens, unless the details are closing (then
 * nothing: see below). No event: the open details close.
 */
export function historyMove(
  state: unknown,
  drawer: { open: boolean; leaving: boolean; currentId: string | null },
  exists: (id: string) => boolean,
): HistoryMove {
  const { eventId } = historyState(state);
  if (eventId && drawer.open && !drawer.leaving && drawer.currentId === eventId) return { kind: "stay" };
  // Closing, a "back" passed over a screen undone from inside the side panel and landed on an earlier event's entry:
  // that's not a request to open it. The close goes on, and afterClosing steps back out of that entry too.
  if (eventId && drawer.leaving && drawer.currentId !== eventId) return { kind: "none" };
  if (eventId && exists(eventId)) return { kind: "open", eventId };
  return drawer.open ? { kind: "close" } : { kind: "none" };
}
