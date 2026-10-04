// The details' place in the history (eventDrawer.ts). The address bar shows the open event's own URL
// (/evento/<id>/): opening pushes it, so every way of closing (×, the scrim, Escape, a drag down, the phone's back
// button) goes through "back", and back or forward opens and closes the details by the entry they land on.
// The entries are overlays over the screen's (screenHistory.ts): they carry the screen under them.

import type { DanceEvent } from "../types";
import { addressAfterClosing, eventPath } from "../lib/links";
import { overlayState } from "../screenHistory";

export interface DrawerHistoryState {
  eventId?: string;
}

const eventIdOf = (state: unknown) => (state as DrawerHistoryState | null)?.eventId;

/** Whether the current entry is an event's details. */
export const onEventEntry = (): boolean => Boolean(eventIdOf(history.state));

/**
 * `event`'s details opened: its entry, over the screen's. Another card while the side panel is open (`wasOpen`)
 * replaces it (the address changes, and back still closes), unless the list moved to another screen meanwhile (an
 * academy, the calendar): that screen keeps its entry, and the event gets one over it.
 */
export function enterEvent(event: DanceEvent, wasOpen: boolean) {
  if (wasOpen && onEventEntry()) history.replaceState({ ...history.state, eventId: event.id }, "", eventPath(event));
  else history.pushState(overlayState({ eventId: event.id } satisfies DrawerHistoryState), "", eventPath(event));
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
  const address = addressAfterClosing(location);
  if (address) history.replaceState(history.state, "", address);
}

export type HistoryMove = { kind: "stay" } | { kind: "open"; eventId: string } | { kind: "close" } | { kind: "none" };

/**
 * Back or forward landed on an entry with `state`: what the details do. The same event, open (back from a sheet over
 * it: the posts, a post): it stays. Another event that exists: it opens. No event: the open details close.
 */
export function historyMove(
  state: unknown,
  drawer: { open: boolean; leaving: boolean; currentId: string | null },
  exists: (id: string) => boolean,
): HistoryMove {
  const eventId = eventIdOf(state);
  if (eventId && drawer.open && !drawer.leaving && drawer.currentId === eventId) return { kind: "stay" };
  if (eventId && exists(eventId)) return { kind: "open", eventId };
  return drawer.open ? { kind: "close" } : { kind: "none" };
}
