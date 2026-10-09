// Moving between the views (Próximos, Calendario, Guardados) and the screens' history, keeping the visitor's place:
// the list remembers where it was left, like switching tabs in Instagram; the calendar opens on its home, Guardados at
// its top; and in the calendar whatever changes the day's list ends with its start on screen (revealDay). main.ts
// owns the state and draws it (`render`).

import type { AppState, View } from "../types";
import { goTo, leave, replaceScreen, sameScreen, type Screen, type ScreenData } from "../screenHistory";
import {
  captureListPosition,
  type ListAnchor,
  restoreListPosition,
  returnToScroll,
  scrollPageTo,
} from "./jumpBar";
import { stickyOffset } from "./pinnedBars";
import { bottomInset, visibleBottom } from "./bottomNav";
import { VIEW_TITLES } from "../lib/viewTitles";

/** How much of the day's list shows under its heading once it's revealed: the start of the first card. */
const DAY_PEEK = 96;

/** What the list shows, besides the view: its filters and its search. */
export interface ListChoices {
  filters: string;
  query: string;
}

export function listChoices(state: Pick<AppState, "types" | "styles" | "dates" | "hideBars" | "query">): ListChoices {
  return { filters: JSON.stringify([state.types, state.styles, state.dates, state.hideBars]), query: state.query.trim() };
}

/**
 * Where the list comes back after another view: the very same spot when nothing changed meanwhile; the same period
 * when a filter changed, as for any filter change; its start when the search changed, as a search typed in the list
 * does (a new list). The bug hunt of 7 Oct 2026: back from a search made in the calendar, the list stood where it was
 * left, deep in other results, as if nothing had changed.
 */
export function listComeback(left: ListChoices, now: ListChoices): "spot" | "period" | "start" {
  if (left.query !== now.query) return "start";
  return left.filters === now.filters ? "spot" : "period";
}

export interface ViewNavigation {
  /**
   * The bar at the bottom (Eventos, Calendario, Guardados) and the tabs: the calendar and Guardados are a move of
   * their own ("back" returns to the list; from one to the other, still to the list). The view already on screen goes
   * back to the top of the page, like Instagram's tabs.
   */
  navigateView(view: View): void;
  /** In the calendar: the start of the day's list on screen (see below). */
  revealDay(options?: { smooth?: boolean }): void;
  /**
   * Search or a view change made the list start over: back up to where it starts (the tabs on wide
   * screens; on phones, the pinned bar where it sits before it's pinned) if the page is past it.
   */
  backToTop(): void;
  /** The screen on show, for its history entry. */
  currentScreen(): ScreenData;
  /** Back (or forward) to `screen`: its view and opened periods, where it was scrolled. */
  applyScreen(screen: Screen): void;
  /** The page opened on the calendar (its own address, /calendario/): its home on screen once laid out. */
  openedOnCalendar(): void;
}

/** The views of `state`, drawn by `render`. */
export function viewNavigation(state: AppState, render: () => void): ViewNavigation {
  /** Where the list was left: coming back to it lands there. */
  let leftList: { scrollY: number; choices: ListChoices; anchor: ListAnchor | null } | null = null;

  /**
   * Shows `view` (no history entry of its own). The list comes back where it was left (listComeback); the calendar
   * always opens on its home: the month and the start of the day's list on screen, never where it was scrolled before
   * (its cards look like the list's, and coming back deep in them, visitors lost track of where they were: the owner,
   * 4 October 2026). Guardados opens at its top. `scrollY`: where the list's history entry says it was, for when the
   * page has no memory of leaving it (reloaded since: back then put the list at its top, the bug hunt of 7 Oct 2026).
   */
  function showView(view: View, { scrollY }: { scrollY?: number } = {}) {
    if (view === state.view) return;
    if (state.view === "upcoming") {
      leftList = { scrollY: window.scrollY, choices: listChoices(state), anchor: captureListPosition() };
    }
    state.view = view;
    document.title = VIEW_TITLES[view].title;
    render();
    if (view === "upcoming") {
      if (!leftList) return scrollY === undefined ? undefined : returnToScroll(scrollY);
      const comeback = listComeback(leftList.choices, listChoices(state));
      if (comeback === "spot") returnToScroll(leftList.scrollY);
      else if (comeback === "start") backToTop();
      else if (leftList.anchor) restoreListPosition(leftList.anchor);
      return;
    }
    if (view === "calendar") calendarHome();
    else backToTop();
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
   * month's ‹ ›, "Hoy", a filter, a search, back), the start of that list ends up on screen. When its
   * heading and the top of what follows are below the fold, the page moves just that far (gliding after a tap, at
   * once otherwise); when they're on screen, or above it (the visitor is reading the cards), it doesn't move. On a
   * phone the list starts below the fold at the top of the page, and a tap there seemed to do nothing (the owner,
   * 4 October 2026).
   */
  function revealDay({ smooth = false } = {}) {
    if (state.view !== "calendar") return;
    const day = document.querySelector<HTMLElement>(".calendar__day-heading");
    if (!day) return;
    // What's on screen ends at the bar at the bottom (phones), or above the keyboard while searching.
    const screenEnd = visibleBottom(window.innerHeight, window.visualViewport, bottomInset());
    const below = day.getBoundingClientRect().bottom + DAY_PEEK - screenEnd;
    if (below > 0) scrollPageTo(window.scrollY + below, { smooth });
  }

  function navigateView(view: View) {
    if (view === state.view) {
      scrollPageTo(0, { smooth: true });
      return;
    }
    const move = () => showView(view);
    if (view === "upcoming") leave("view", move);
    else if (state.view === "upcoming") goTo("view", move);
    else replaceScreen("view", move); // the calendar ⇄ Guardados: back still returns to the list
  }

  function backToTop() {
    // The content's top, just under what's pinned (the toolbar and its tabs on wide screens, the bar on phones). Not the
    // toolbar's own top: it's sticky, so once pinned it reads 0, and wide screens never went back up (Guardados opened
    // at its bottom, a search's results mid-page: the bug hunt of 7 Oct 2026).
    const top = (document.querySelector("main")?.getBoundingClientRect().top ?? 0) - stickyOffset();
    if (top < 0) window.scrollTo({ top: top + window.scrollY, behavior: "auto" });
    revealDay(); // in the calendar, the day's list still starts on screen
  }

  const currentScreen = (): ScreenData => ({
    view: state.view,
    scrollY: window.scrollY,
  });

  function applyScreen(screen: Screen) {
    if (sameScreen(screen, currentScreen())) return; // e.g. back from an event or a sheet: the screen stays
    if (screen.view !== state.view) {
      showView(screen.view, { scrollY: screen.scrollY }); // it puts each view back where it was
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
