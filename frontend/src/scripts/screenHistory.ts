// The phone's "back" between the app's own screens, not only the event details and the sheets (eventDrawer.ts,
// lib/sheet.ts).
//
// Moves that feel like going somewhere get a history entry: a period opened whole ("Ver los 23 eventos"), the calendar, "Guardados". Without one, "back" right after them
// had nothing to go back to and left the site, which closes an installed app. Each entry holds the screen it
// shows (`Screen`); "back" (or forward) puts that screen back, at the scroll position it had.
//
// Undoing a move from the page itself (the list button, "Guardados" again) goes back
// in history when the current entry is that move, so the history never piles up screens to step through.
//
// Overlays (a sheet, the event details) get history entries of their own on top of the screen's
// (`overlayState`): they carry the screen under them, marked as an overlay. Undoing a move from inside one
// (the "Filtros" sheet's "Limpiar", the list next to the side panel) can't go back in
// history: that would close the overlay instead. The move is undone right there, the overlay stays, and the
// screen's entry is skipped when "back" (or closing the overlay) reaches it later.

import type { View } from "./types";

export type ScreenKind = "period" | "view" | "saved";

/** A screen entry: `kind` is the move that led to it (absent: the start). */
export interface Step {
  id: string;
  kind?: ScreenKind;
}

export interface Screen {
  view: View;
  savedOnly: boolean;
  periods: string[]; // periods shown whole
  scrollY: number;
  steps?: Step[]; // the screen entries up to this one, from the start: the last is this one
}

export type ScreenData = Omit<Screen, "steps">;

/** What any of the app's history entries may hold: the screen, and the overlay over it, if any. */
export interface AppHistoryState {
  screen?: Screen;
  overlay?: boolean; // a sheet, the event details or the "Cuándo" menu, over the screen in `screen`
  eventId?: string; // the event details' entry (views/drawerHistory.ts)
  sheet?: string; // a panel sheet's entry: the sheet's id (lib/sheet.ts)
  menu?: string; // the "Cuándo" menu's entry (views/whenMenu.ts)
}

/**
 * A history entry's state, typed: the current entry's (`history.state`) or a popstate's. An entry the app didn't
 * write (the first one, or a page's from before) reads as {}.
 */
export function historyState(state: unknown = history.state): AppHistoryState {
  return typeof state === "object" && state !== null ? (state as AppHistoryState) : {};
}

interface Hooks {
  /** The screen on show now. */
  current: () => ScreenData;
  /**
   * Put `screen` back (back or forward). `undoing`: the move a `leave` stepped back out of (its other changes since,
   * e.g. "Guardados" turned off in the calendar, stay as they are).
   */
  apply: (screen: Screen, undoing?: ScreenKind) => void;
  /** The address of a screen (each view has its own: lib/links.ts viewPath), kept with its history entry. */
  address?: (screen: ScreenData) => string;
}

let hooks: Hooks | null = null;
let counter = 0;
/** Screen entries undone from inside an overlay: "back" passes over them (`leave`). */
const skipped = new Set<string>();

const newId = () => `${Date.now().toString(36)}.${(counter++).toString(36)}`;
const stepsOf = (state: AppHistoryState): Step[] => state.screen?.steps ?? [{ id: newId() }];

/** The current entry remembers the screen as it is now (above all, how far down it was). */
function remember(steps = stepsOf(historyState())) {
  if (!hooks) return;
  const state = historyState();
  const screen = hooks.current();
  history.replaceState({ ...state, screen: { ...screen, steps } } satisfies AppHistoryState, "", addressOf(screen, state));
}

/** The screen's own address, with the query and the hash; none for an overlay (it keeps its own, e.g. an event's). */
function addressOf(screen: ScreenData, state: AppHistoryState): string | undefined {
  if (!hooks?.address || state.overlay) return undefined;
  return `${hooks.address(screen)}${location.search}${location.hash}`;
}

/** The move a `leave` stepped back out of, until its popstate lands. */
let undoing: ScreenKind | undefined;
/** The hash of the entry on show: back from an in-page jump (#info) puts the scroll back, as the browser won't. */
let shownHash = "";

export function initScreenHistory(screenHooks: Hooks) {
  hooks = screenHooks;
  // The screens put their own scroll back (`apply`). The browser's own restoring would undo it: it saves an
  // entry's position when the next one is pushed, after the move already scrolled.
  history.scrollRestoration = "manual";
  shownHash = location.hash;
  remember();
  window.addEventListener("popstate", (domEvent) => {
    const state = historyState(domEvent.state);
    const step = state.screen?.steps?.at(-1);
    // A screen undone from inside an overlay: on to the one before it.
    if (step && !state.overlay && skipped.delete(step.id)) {
      history.back();
      return;
    }
    const from = undoing;
    undoing = undefined;
    const jumpedBack = location.hash !== shownHash;
    shownHash = location.hash;
    if (state.screen) screenHooks.apply(state.screen, from);
    if (from) remember(); // that entry now holds the screen as it is (e.g. "Guardados" off)
    // Back from an in-page jump ("Info", #info): the same screen, so apply leaves the scroll alone; put it back here.
    if (jumpedBack && state.screen && !state.overlay) window.scrollTo({ top: state.screen.scrollY, behavior: "auto" });
  });
  // Before an in-page jump: this entry remembers where the page was, for back to return there.
  if (typeof document === "undefined") return; // unit tests: a fake history, no page
  document.addEventListener(
    "click",
    (domEvent) => {
      const link = (domEvent.target as Element | null)?.closest?.("a[href^='#']");
      if (link && link.getAttribute("href") !== "#") remember();
    },
    true,
  );
  window.addEventListener("hashchange", () => (shownHash = location.hash));
}

/** A move to another screen: `move` changes and draws it; then it gets its own history entry. */
export function goTo(kind: ScreenKind, move: () => void) {
  remember();
  const steps = stepsOf(historyState());
  move();
  if (hooks) {
    const screen: Screen = { ...hooks.current(), steps: [...steps, { id: newId(), kind }] };
    history.pushState({ screen } satisfies AppHistoryState, "", addressOf(screen, {}));
  }
}

/**
 * Undo a `kind` move from the page: back in history when that's the current entry, else `move` here. Under an
 * overlay, `move` here too, and that screen's entry is skipped later.
 */
export function leave(kind: ScreenKind, move: () => void) {
  const state = historyState();
  const steps = stepsOf(state);
  const last = steps.at(-1);
  if (last?.kind === kind && steps.length > 1) {
    if (!state.overlay) {
      undoing = kind;
      history.back();
      return;
    }
    skipped.add(last.id);
    move();
    remember(steps.slice(0, -1)); // the overlay now sits on the screen before it
    return;
  }
  move();
  remember();
}

/**
 * The history state of an overlay (a sheet, the event details) opened over the current entry: it carries the
 * screen under it (and whatever else that entry holds, like the open event), plus `extra`.
 */
export function overlayState(extra: Omit<AppHistoryState, "screen" | "overlay">): AppHistoryState {
  return { ...historyState(), ...extra, overlay: true };
}

export function sameScreen(a: Omit<ScreenData, "scrollY">, b: Omit<ScreenData, "scrollY">): boolean {
  return (
    a.view === b.view &&
    a.savedOnly === b.savedOnly &&
    a.periods.length === b.periods.length &&
    a.periods.every((key) => b.periods.includes(key))
  );
}
