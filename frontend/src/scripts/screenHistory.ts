// The phone's "back" between the app's own screens, not only events and sheets (eventDialog.ts, lib/sheet.ts).
//
// Moves that feel like going somewhere get a history entry: an academy's events (tapping its @ on a card), a
// period opened whole ("Ver los 23 eventos"), the calendar, "Guardados". Without one, "back" right after them
// had nothing to go back to and left the site, which closes an installed app. Each entry holds the screen it
// shows (`Screen`); "back" (or forward) puts that screen back, at the scroll position it had.
//
// Undoing a move from the page itself ("ver todas las academias", the list button, "Guardados" again) goes back
// in history when the current entry is that move, so the history never piles up screens to step through.

import type { View } from "./types";

export type ScreenKind = "account" | "period" | "view" | "saved";

export interface Screen {
  view: View;
  account: string | null;
  savedOnly: boolean;
  periods: string[]; // periods shown whole
  scrollY: number;
  kind?: ScreenKind; // the move that led here (absent: the start)
}

interface ScreenHistoryState {
  screen?: Screen;
}

interface Hooks {
  /** The screen on show now. */
  current: () => Omit<Screen, "kind">;
  /** Put `screen` back (back or forward). */
  apply: (screen: Screen) => void;
}

let hooks: Hooks | null = null;

const entry = () => (history.state ?? {}) as ScreenHistoryState;

/** The current entry remembers the screen as it is now (above all, how far down it was). */
function remember(kind = entry().screen?.kind) {
  if (!hooks) return;
  history.replaceState({ ...entry(), screen: { ...hooks.current(), kind } }, "");
}

export function initScreenHistory(screenHooks: Hooks) {
  hooks = screenHooks;
  // The screens put their own scroll back (`apply`). The browser's own restoring would undo it: it saves an
  // entry's position when the next one is pushed, after the move already scrolled.
  history.scrollRestoration = "manual";
  remember();
  window.addEventListener("popstate", (domEvent) => {
    const screen = (domEvent.state as ScreenHistoryState | null)?.screen;
    if (screen) screenHooks.apply(screen);
  });
}

/** A move to another screen: `move` changes and draws it; then it gets its own history entry. */
export function goTo(kind: ScreenKind, move: () => void) {
  remember();
  move();
  if (hooks) history.pushState({ screen: { ...hooks.current(), kind } } satisfies ScreenHistoryState, "");
}

/** Undo a `kind` move from the page: back in history when that's the current entry, else `move` here. */
export function leave(kind: ScreenKind, move: () => void) {
  if (entry().screen?.kind === kind) {
    history.back();
    return;
  }
  move();
  remember();
}

export function sameScreen(a: Omit<Screen, "kind" | "scrollY">, b: Omit<Screen, "kind" | "scrollY">): boolean {
  return (
    a.view === b.view &&
    a.account === b.account &&
    a.savedOnly === b.savedOnly &&
    a.periods.length === b.periods.length &&
    a.periods.every((key) => b.periods.includes(key))
  );
}
