// Entry point: load the events embedded in the page, wire up interactions and render.

import type { DanceEvent, EventType, View } from "./types";
import { initClickTracking } from "./lib/analytics";
import { byId } from "./lib/dom";
import { eventCountLabel } from "./lib/format";
import { addMonths, currentMonth, todayIso } from "./lib/dates";
import {
  activeFilterCount,
  clearFilters,
  createInitialState,
  defaultDayForMonth,
  eventsInView,
  sectionId,
  visibleEvents,
} from "./state";
import { initThemeToggle } from "./theme";
import { renderCalendarView } from "./views/calendarView";
import { initEventDialog, openEventDialog } from "./views/eventDialog";
import { rankedStyles, renderFilters } from "./views/filters";
import {
  captureListPosition,
  closeBarSearch,
  initJumpBar,
  type ListAnchor,
  renderJumpBar,
  restoreListPosition,
  returnToScroll,
} from "./views/jumpBar";
import { renderUpcomingView, showWholePeriod } from "./views/upcomingView";
import { initPostViewer } from "./views/postViewer";
import { initPostsSheet } from "./views/postsSheet";
import { initViewSwitch, renderViewSwitch } from "./views/viewSwitch";
import { initSaveButtons, renderSavedToggles } from "./views/saveButton";
import { initInstallPrompt, registerServiceWorker } from "./views/installPrompt";
import { prepareWeekendShare, shareWeekend } from "./views/shareWeekend";
import { isSaved, keepOnly } from "./lib/saved";

const state = createInitialState();
let events: DanceEvent[] = [];

/** data-* attributes that identify a re-rendered control, so focus can be put back on it. */
const FOCUS_KEYS = ["type", "style", "day"] as const;

function focusSelector(element: Element | null): string | null {
  if (!(element instanceof HTMLElement)) return null;
  const key = FOCUS_KEYS.find((name) => element.dataset[name] !== undefined);
  return key ? `[data-${key}="${CSS.escape(element.dataset[key]!)}"]` : null;
}

function announce(count: number) {
  const label = eventCountLabel(count);
  byId("results-status").textContent = state.view === "upcoming" ? `${label} próximos` : `${label} este día`;
  byId("filter-sheet-results").textContent = count ? `Ver ${label}` : "Ver resultados";
}

/** Containers whose controls are re-rendered: focus goes back to the same control in the same one. */
const FOCUS_SCOPES = "#filter-sheet, #jump-bar, .toolbar, main";

/** Where to look for the re-rendered control: the open filter sheet, else where the focus was. */
function focusScope(previous: Element | null): ParentNode {
  return document.querySelector("#filter-sheet[open]") ?? previous?.closest(FOCUS_SCOPES) ?? document;
}

/** `keepPlace`: a filter changed; keep the period being read under the bar (see restoreListPosition). */
function render({ keepPlace = false } = {}) {
  // Re-rendering replaces chips and calendar days; remember which one had focus, and where.
  const focused = focusSelector(document.activeElement);
  const scope = focusScope(document.activeElement);
  const anchor = keepPlace && state.view === "upcoming" ? captureListPosition() : null;

  renderFilters(events, state);
  const upcoming = byId("view-upcoming");
  const calendar = byId("view-calendar");
  upcoming.hidden = state.view !== "upcoming";
  calendar.hidden = state.view !== "calendar";
  document.querySelectorAll<HTMLElement>("[data-view]").forEach((tab) => {
    tab.setAttribute("aria-selected", String(tab.dataset.view === state.view));
  });
  renderViewSwitch(state.view);

  const { shown, groups } =
    state.view === "upcoming"
      ? renderUpcomingView(upcoming, events, state)
      : { shown: renderCalendarView(events, state), groups: [] }; // the calendar has no periods to jump to
  renderJumpBar({
    groups,
    activeFilters: activeFilterCount(state),
    styles: rankedStyles(eventsInView(events, state)),
    styleFilter: state.styleFilter,
    eventCount: eventsInView(events, state).length,
    showPeriods: state.view === "upcoming",
    searching: state.query !== "",
  });
  renderSavedCount();
  if (anchor) restoreListPosition(anchor);
  announce(shown);
  prepareWeekendShare();

  if (focused) scope.querySelector<HTMLElement>(focused)?.focus();
}

/** Where each view was left: coming back to it lands there, like switching tabs in Instagram. */
let leftList: { scrollY: number; filters: string; anchor: ListAnchor | null } | null = null;
let leftCalendar: number | null = null;

const filtersKey = () => JSON.stringify([state.typeFilter, state.styleFilter, state.accountFilter]);

/** The tabs and the floating button. Each view keeps its place. */
function showView(view: View) {
  if (view === state.view) return;
  if (state.view === "upcoming") {
    leftList = { scrollY: window.scrollY, filters: filtersKey(), anchor: captureListPosition() };
  } else leftCalendar = window.scrollY;
  state.view = view;
  render();
  if (view === "upcoming") {
    if (!leftList) return;
    // Same filters: the very same spot. Filters changed in the calendar: the same period, as any filter change.
    if (leftList.filters === filtersKey()) returnToScroll(leftList.scrollY, leftList.anchor);
    else if (leftList.anchor) restoreListPosition(leftList.anchor);
    return;
  }
  if (leftCalendar !== null) {
    returnToScroll(leftCalendar);
    return;
  }
  // The first time, if the page was scrolled past the tabs: back up to them, so the calendar is seen whole.
  const toolbar = document.querySelector<HTMLElement>(".toolbar");
  const top = toolbar?.getBoundingClientRect().top ?? 0;
  if (top < 0) window.scrollTo({ top: top + window.scrollY, behavior: "auto" });
}

/** "Guardados 3": how many upcoming events are saved, on the toggles. */
function renderSavedCount() {
  const today = todayIso();
  renderSavedToggles(events.filter((event) => event.date >= today && isSaved(event.id)).length, state.savedOnly);
}

/** Search, "Guardados" or a view change made the list start over: back up to the tabs if the page is past them. */
function backToTop() {
  const toolbar = document.querySelector<HTMLElement>(".toolbar");
  const top = toolbar?.getBoundingClientRect().top ?? 0;
  if (top < 0) window.scrollTo({ top: top + window.scrollY, behavior: "auto" });
}

let searchTimer = 0;

/** Typing in a search field (the bar's or the toolbar's): both show the same text; results after a pause. */
function handleSearchInput(domEvent: Event) {
  const input = domEvent.target as HTMLInputElement;
  if (!input.matches("[data-search]")) return;
  state.query = input.value;
  document.querySelectorAll<HTMLInputElement>("[data-search]").forEach((field) => {
    if (field !== input) field.value = input.value;
  });
  clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => {
    render();
    backToTop();
  }, 150);
}

/** After filtering by academy from a card far down the list, move to the filter notice (and its "show all" button). */
function focusAccountFilter() {
  byId("account-filter").querySelector<HTMLElement>("button")?.focus();
}

/** One delegated listener for every data-* control rendered by the views. */
function handleClick(domEvent: MouseEvent) {
  const control = (domEvent.target as HTMLElement).closest<HTMLElement>(
    "[data-view],[data-type],[data-style],[data-account],[data-clear-filters],[data-day],[data-event],[data-month-step],[data-today],[data-show-period],[data-saved-only],[data-close-search],[data-share-weekend]",
  );
  if (!control) return;
  const { view, type, style, account, day, event: eventId, monthStep, showPeriod } = control.dataset;

  if ("shareWeekend" in control.dataset) {
    void shareWeekend();
    return;
  }
  if ("savedOnly" in control.dataset) {
    state.savedOnly = !state.savedOnly;
    render();
    backToTop();
    return;
  }
  if ("closeSearch" in control.dataset) {
    state.query = "";
    document.querySelectorAll<HTMLInputElement>("[data-search]").forEach((field) => (field.value = ""));
    closeBarSearch();
    render();
    return;
  }
  if (showPeriod) {
    // "Ver los 23 eventos" / "Ver 7 más": the period opens whole; focus moves to its first new event.
    const section = control.closest<HTMLElement>(".agenda-group");
    const before = section?.querySelectorAll(".event-card").length ?? 0;
    if (showWholePeriod(showPeriod)) render();
    const cards = document.getElementById(sectionId(showPeriod))?.querySelectorAll<HTMLElement>(".event-card__hit");
    cards?.[before]?.focus({ preventScroll: true });
    return;
  }

  if (eventId) {
    // The card's title is a link: let the browser handle new-tab clicks; a plain click opens the viewer.
    if (domEvent.button !== 0 || domEvent.metaKey || domEvent.ctrlKey || domEvent.shiftKey || domEvent.altKey) return;
    const event = events.find((item) => item.id === eventId);
    if (!event) return;
    domEvent.preventDefault();
    openEventDialog(event, visibleEvents(events, state));
    return;
  }
  if (view) {
    showView(view as View);
    return;
  }
  if (type) state.typeFilter = type as EventType | "all";
  // A pressed chip tapped again clears it; options in the bar's rhythm menu just select.
  else if (style) {
    const isToggle = control.matches(".chip") && control.getAttribute("aria-pressed") === "true";
    state.styleFilter = isToggle ? "all" : style;
  }
  else if (account !== undefined) {
    state.accountFilter = account || null; // "" = show every academy again
  } else if ("clearFilters" in control.dataset) {
    clearFilters(state);
    document.querySelectorAll<HTMLInputElement>("[data-search]").forEach((field) => (field.value = ""));
    closeBarSearch();
  }
  else if (day) state.selectedDay = day;
  else if (monthStep) {
    state.month = addMonths(state.month, Number(monthStep));
    state.selectedDay = defaultDayForMonth(events, state.month);
  } else if ("today" in control.dataset) {
    state.month = currentMonth();
    state.selectedDay = todayIso();
  }
  // Filters keep the period being read in place. (Tapping an academy on a card instead moves to its notice.)
  render({ keepPlace: Boolean(type || style || "clearFilters" in control.dataset) });

  // The control clicked was re-rendered away: put focus somewhere useful.
  if (account) focusAccountFilter();
  else if ("clearFilters" in control.dataset) {
    // The first type chip that can be seen (in the open sheet, or the toolbar), else the bar's ⚙.
    const chips = [...document.querySelectorAll<HTMLElement>('[data-filter-row="type"] button')];
    const visible = chips.find((chip) => chip.closest("#filter-sheet[open]") || chip.offsetParent !== null);
    (visible ?? byId("jump-filters")).focus();
  }
}

export function start() {
  events = JSON.parse(byId("events-data").textContent || "[]");
  keepOnly(new Set(events.map((event) => event.id))); // saved events no longer in the data are forgotten
  initThemeToggle();
  initEventDialog((id) => events.find((event) => event.id === id));
  initPostsSheet();
  initPostViewer();
  initInstallPrompt();
  registerServiceWorker();
  initJumpBar({
    reveal: (key) => {
      if (showWholePeriod(key)) render();
    },
  });
  initViewSwitch(showView);
  initClickTracking();
  document.addEventListener("click", handleClick);
  document.addEventListener("input", handleSearchInput);
  // Saving changes the "Guardados" count. The list itself only changes while it shows just the saved events:
  // then it's redrawn right where the visitor was (never jumping, e.g. to a period's heading).
  initSaveButtons(() => {
    if (!state.savedOnly) return renderSavedCount();
    const scrollY = window.scrollY;
    render();
    returnToScroll(scrollY);
  });
  render();
}
