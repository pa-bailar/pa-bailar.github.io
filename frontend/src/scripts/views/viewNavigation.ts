// Moving between the views (Próximos and Calendario) and the screens' history, keeping the visitor's place: each
// view remembers where it was left, like switching tabs in Instagram, and in the calendar whatever changes the
// day's list ends with its start on screen (revealDay). main.ts owns the state and draws it (`render`).

import type { AppState, View } from "../types";
import { goTo, leave, sameScreen, type Screen, type ScreenData, type ScreenKind } from "../screenHistory";
import {
  captureListPosition,
  type ListAnchor,
  restoreListPosition,
  returnToScroll,
  scrollPageTo,
  stickyOffset,
} from "./jumpBar";
import { setWholePeriods, wholePeriods } from "./upcomingView";
import { bottomInset } from "./bottomNav";
import { VIEW_TITLES } from "../lib/viewTitles";

/** How much of the day's list shows under its heading once it's revealed: the start of the first card. */
const DAY_PEEK = 96;

export interface ViewNavigation {
  /**
   * The bar at the bottom (Eventos, Calendario) and the tabs: the calendar is a move of its own ("back" returns to
   * the list). The view already on screen goes back to the top of the page, like Instagram's tabs.
   */
  navigateView(view: View): void;
  /** In the calendar: the start of the day's list on screen (see below). */
  revealDay(options?: { smooth?: boolean }): void;
  /**
   * Search, "Guardados" or a view change made the list start over: back up to where it starts (the tabs on wide
   * screens; on phones, the pinned bar where it sits before it's pinned) if the page is past it.
   */
  backToTop(): void;
  /** The screen on show, for its history entry. */
  currentScreen(): ScreenData;
  /** Back (or forward) to `screen`: its view, saved events and opened periods, where it was scrolled. */
  applyScreen(screen: Screen, undoing?: ScreenKind): void;
  /** The page opened on the calendar (its own address, /calendario/): its home on screen once laid out. */
  openedOnCalendar(): void;
}

/** The views of `state`, drawn by `render`. */
export function viewNavigation(state: AppState, render: () => void): ViewNavigation {
  /** Where the list was left: coming back to it lands there. */
  let leftList: { scrollY: number; filters: string; anchor: ListAnchor | null } | null = null;

  const filtersKey = () => JSON.stringify([state.types, state.styles, state.dates, state.hideBars]);

  /**
   * Shows `view` (no history entry of its own). The list comes back where it was left; the calendar always opens on
   * its home: the month and the start of the day's list on screen, never where it was scrolled before (its cards
   * look like the list's, and coming back deep in them, visitors lost track of where they were: the owner, 4 October
   * 2026).
   */
  function showView(view: View) {
    if (view === state.view) return;
    if (state.view === "upcoming") {
      leftList = { scrollY: window.scrollY, filters: filtersKey(), anchor: captureListPosition() };
    }
    state.view = view;
    document.title = VIEW_TITLES[view].title;
    render();
    if (view === "upcoming") {
      if (!leftList) return;
      // Same filters: the very same spot. Filters changed in the calendar: the same period, as any filter change.
      if (leftList.filters === filtersKey()) returnToScroll(leftList.scrollY);
      else if (leftList.anchor) restoreListPosition(leftList.anchor);
      return;
    }
    calendarHome();
  }

  /** The calendar's home: the month's title under the pinned bar if the page is past it, and the day's list on screen. */
  function calendarHome() {
    const head = document.querySelector<HTMLElement>(".calendar__head");
    const offset = stickyOffset() + 8;
    if (head && head.getBoundingClientRect().top < offset) {
      window.scrollTo({ top: head.getBoundingClientRect().top + window.scrollY - offset, behavior: "auto" });
    }
    revealDay();
  }

  /**
   * The calendar's one rule: whatever changes the day's list (opening the calendar, coming back to it, a day, the
   * month's ‹ ›, "Hoy", a filter, a search, "Guardados", back), the start of that list ends up on screen. When its
   * heading and the top of what follows are below the fold, the page moves just that far (gliding after a tap, at
   * once otherwise); when they're on screen, or above it (the visitor is reading the cards), it doesn't move. On a
   * phone the list starts below the fold at the top of the page, and a tap there seemed to do nothing (the owner,
   * 4 October 2026).
   */
  function revealDay({ smooth = false } = {}) {
    if (state.view !== "calendar") return;
    const day = document.querySelector<HTMLElement>(".calendar__day-heading");
    if (!day) return;
    // What's on screen ends at the bar at the bottom (phones).
    const below = day.getBoundingClientRect().bottom + DAY_PEEK - (window.innerHeight - bottomInset());
    if (below > 0) scrollPageTo(window.scrollY + below, { smooth });
  }

  function navigateView(view: View) {
    if (view === state.view) {
      scrollPageTo(0, { smooth: true });
      return;
    }
    if (view === "calendar") goTo("view", () => showView(view));
    else leave("view", () => showView(view));
  }

  function backToTop() {
    // Wide screens: the toolbar (the tabs). Phones hide it: the content's top, under the pinned bar.
    const toolbar = document.querySelector<HTMLElement>(".toolbar");
    const shown = toolbar && toolbar.getClientRects().length > 0;
    const anchor = shown ? toolbar : document.querySelector<HTMLElement>("main");
    const top = (anchor?.getBoundingClientRect().top ?? 0) - (shown ? 0 : stickyOffset());
    if (top < 0) window.scrollTo({ top: top + window.scrollY, behavior: "auto" });
    revealDay(); // in the calendar, the day's list still starts on screen
  }

  const currentScreen = (): ScreenData => ({
    view: state.view,
    savedOnly: state.savedOnly,
    periods: wholePeriods(),
    scrollY: window.scrollY,
  });

  function applyScreen(screen: Screen, undoing?: ScreenKind) {
    if (sameScreen(screen, currentScreen())) return; // e.g. back from an event or a sheet: the screen stays
    // Leaving the calendar ("back" out of its move) keeps "Guardados" as it was set in it.
    if (undoing !== "view") state.savedOnly = screen.savedOnly;
    setWholePeriods(screen.periods);
    if (screen.view !== state.view) {
      showView(screen.view); // it puts each view back where it was
      return;
    }
    render();
    returnToScroll(screen.scrollY);
    revealDay();
  }

  function openedOnCalendar() {
    void document.fonts.ready.then(() => requestAnimationFrame(calendarHome));
  }

  return { navigateView, revealDay, backToTop, currentScreen, applyScreen, openedOnCalendar };
}
