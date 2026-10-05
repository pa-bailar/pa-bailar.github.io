// Entry point: load the events embedded in the page, wire up interactions and render.

import type { DanceEvent, EventType, View } from "./types";
import type { AgendaGroup, FilterGroup } from "./state";
import { initClickTracking } from "./lib/analytics";
import { byId } from "./lib/dom";
import { eventCountLabel } from "./lib/format";
import { addMonths, currentMonth, lastDay, shownDay, todayIso } from "./lib/dates";
import { eventPath, sharedEventLink } from "./lib/links";
import {
  clearFilters,
  createInitialState,
  defaultDayForMonth,
  groupByPeriod,
  listedDay,
  listOrder,
  toggled,
  visibleEvents,
} from "./state";
import { initThemeToggle } from "./theme";
import { renderCalendarView } from "./views/calendarView";
import { watchClips } from "./views/clips";
import { highlightCurrentCard, initEventDrawer, openEventDrawer } from "./views/eventDrawer";
import { openEventPosts } from "./views/eventDetail";
import { armDetailsHint, markDetailsHintSeen } from "./views/detailsHint";
import { filterModel, renderFilters, staleDates } from "./views/filters";
import {
  captureListPosition,
  closeBarSearch,
  initJumpBar,
  type ListAnchor,
  openFilterSheet,
  renderJumpBar,
  restoreListPosition,
  returnToScroll,
} from "./views/jumpBar";
import {
  renderUpcomingView,
  setWholePeriods,
  sharedEventEntry,
  showWholePeriod,
  wholePeriods,
} from "./views/upcomingView";
import { goTo, initScreenHistory, leave, sameScreen, type Screen } from "./screenHistory";
import { initPostViewer } from "./views/postViewer";
import { initPostsSheet } from "./views/postsSheet";
import { initViewSwitch, renderViewSwitch } from "./views/viewSwitch";
import { closeWhenMenu, isWhenMenuOpen, openWhenMenu, syncWhenMenu } from "./views/whenMenu";
import { initSaveButtons, renderSavedToggles } from "./views/saveButton";
import { initInstallPrompt, offerAfterSaving, registerServiceWorker } from "./views/installPrompt";
import { initSharing, plansEventUrl, setShareSources, type ShareSource } from "./views/sharing";
import { PERIOD_SHARE_TITLES, periodShareText, plansShareText } from "./lib/shareText";
import { dateRangeLabel, styleLabel, typeLabel } from "./lib/format";
import { isSaved, keepOnly } from "./lib/saved";

const state = createInitialState();
let events: DanceEvent[] = [];

/**
 * The control that had the focus, as a selector for the same control once it's drawn again: a filter chip, a
 * calendar day, ⚙.
 */
function focusSelector(element: Element | null): string | null {
  if (!(element instanceof HTMLElement)) return null;
  const { filter, value, day } = element.dataset;
  if (filter && value !== undefined) return `[data-filter="${CSS.escape(filter)}"][data-value="${CSS.escape(value)}"]`;
  if (day) return `[data-day="${CSS.escape(day)}"]`;
  if (element.matches("[data-open-filters]")) return "[data-open-filters]";
  if (element.matches("[data-when-open]")) return "[data-when-open]";
  return null;
}

/** The number of events, said politely to screen readers after each change. */
function announce(count: number) {
  const label = eventCountLabel(count);
  byId("results-status").textContent = state.view === "upcoming" ? `${label} próximos` : `${label} este día`;
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

  let model = filterModel(events, state);
  // A period chosen that's no longer there (the day changed while the page was open) can't be unchosen: drop it.
  const stale = staleDates(model, state);
  if (stale.length) {
    state.dates = state.dates.filter((key) => !stale.includes(key));
    model = filterModel(events, state);
  }
  renderFilters(model, state);
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
      : { shown: renderCalendarView(events, state), groups: [] }; // the calendar has no periods
  renderJumpBar({ searching: state.query !== "" });
  renderSavedCount();
  watchClips(byId(state.view === "upcoming" ? "view-upcoming" : "view-calendar")); // the videos' clips, as a feed
  if (anchor) restoreListPosition(anchor);
  announce(shown);
  setShareSources(shareSources(groups));
  syncWhenMenu(); // "Cuándo" was drawn again: its menu, if open, stays under it
  highlightCurrentCard(); // the side panel's event, outlined again among the new cards
  armDetailsHint();

  if (focused) scope.querySelector<HTMLElement>(focused)?.focus();
}

/** Where each view was left: coming back to it lands there, like switching tabs in Instagram. */
let leftList: { scrollY: number; filters: string; anchor: ListAnchor | null } | null = null;
let leftCalendar: number | null = null;

const filtersKey = () => JSON.stringify([state.types, state.styles, state.dates, state.accountFilter]);

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
    if (leftList.filters === filtersKey()) returnToScroll(leftList.scrollY);
    else if (leftList.anchor) restoreListPosition(leftList.anchor);
    return;
  }
  if (leftCalendar !== null) {
    returnToScroll(leftCalendar);
    return;
  }
  // The first time, if the page was scrolled past the tabs: back up to them, so the calendar is seen whole.
  backToTop();
}

/** The tabs and the floating button: the calendar is a move of its own ("back" returns to the list). */
function navigateView(view: View) {
  if (view === state.view) return;
  if (view === "calendar") goTo("view", () => showView(view));
  else leave("view", () => showView(view));
}

const currentScreen = (): Omit<Screen, "kind"> => ({
  view: state.view,
  account: state.accountFilter,
  savedOnly: state.savedOnly,
  periods: wholePeriods(),
  scrollY: window.scrollY,
});

/** Back (or forward) to `screen`: its view, academy, saved events and opened periods, where it was scrolled. */
function applyScreen(screen: Screen) {
  if (sameScreen(screen, currentScreen())) return; // e.g. back from an event or a sheet: the screen stays
  state.accountFilter = screen.account;
  state.savedOnly = screen.savedOnly;
  setWholePeriods(screen.periods);
  if (screen.view !== state.view) {
    showView(screen.view); // it puts each view back where it was
    return;
  }
  render();
  returnToScroll(screen.scrollY);
}

/** The saved events still to come, in the list's order (a series by its next session). */
function upcomingSaved(): DanceEvent[] {
  const today = todayIso();
  return listOrder(events.filter((event) => lastDay(event) >= today && isSaved(event.id)), today);
}

/** "Guardados 3": how many upcoming events are saved, on the toggles. */
function renderSavedCount() {
  renderSavedToggles(upcomingSaved().length, state.savedOnly);
}

/** What narrows the list, for a shared image's subtitle: "Salsa, Bachata", "Talleres", "@academia", «búsqueda».
 * (The period is the title.) */
function filtersLabel(): string {
  return [
    state.types.map(typeLabel).join(", "),
    state.styles.map(styleLabel).join(", "),
    state.accountFilter ? `@${state.accountFilter}` : "",
    state.query.trim() ? `«${state.query.trim()}»` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

/** What each share button of the list shares: the near periods as on screen, and Guardados' plans. */
function shareSources(groups: AgendaGroup[]): Map<string, ShareSource> {
  const sources = new Map<string, ShareSource>();
  const filters = filtersLabel();
  for (const group of groups) {
    const title = PERIOD_SHARE_TITLES[group.key];
    const days = group.events.map((event) => listedDay(event, state.dates)); // as listed: an event under way is today's
    const first = days[0];
    const last = days.at(-1);
    if (!title || !first || !last) continue;
    sources.set(`periodo-${group.key}`, {
      title,
      subtitle: [dateRangeLabel(first, last), filters].filter(Boolean).join(" · "),
      text: periodShareText(filters ? `${title} · ${filters}` : title, group.events),
      events: group.events,
    });
  }
  const plans = upcomingSaved();
  const [firstPlan] = plans;
  const lastPlanDay = plans.map(lastDay).sort().at(-1); // the plans' last day: an event over several days may end last
  if (state.savedOnly && firstPlan && lastPlanDay) {
    sources.set("planes", {
      title: "Mis planes para bailar",
      subtitle: dateRangeLabel(shownDay(firstPlan), lastPlanDay),
      text: plansShareText(plans, plansEventUrl),
      events: plans,
    });
  }
  return sources;
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

/** No search anymore: the fields empty, the bar back to its chips. */
function clearSearch() {
  state.query = "";
  document.querySelectorAll<HTMLInputElement>("[data-search]").forEach((field) => (field.value = ""));
  closeBarSearch();
}

/** After filtering by academy from a card far down the list: focus its chip ("@academia ×"), where it can be undone. */
function focusAccountFilter() {
  const chips = [...document.querySelectorAll<HTMLElement>('#jump-chips [data-account], #filter-status [data-account]')];
  chips.find((chip) => chip.offsetParent !== null)?.focus();
}

/**
 * After "Limpiar": the control is gone (a chip, the empty list's button), hidden (the line under the bar, the
 * toolbar's status row) or disabled (the sheet's). The focus goes to the sheet's first chip, ⚙, or the toolbar's
 * first chip: controls that render() puts the focus back on when it draws them again (focusSelector), also after
 * the academy's screen is left through the history.
 */
function focusAfterClearing(control: HTMLElement) {
  const sheet = control.closest("#filter-sheet");
  const candidates = sheet
    ? [...sheet.querySelectorAll<HTMLElement>("[data-filter]")]
    : [...document.querySelectorAll<HTMLElement>("[data-open-filters], #date-filters [data-filter], #type-filters [data-filter]")];
  candidates.find((candidate) => candidate.offsetParent !== null)?.focus({ preventScroll: true });
}

/** One delegated listener for every data-* control rendered by the views. */
function handleClick(domEvent: MouseEvent) {
  const control = (domEvent.target as HTMLElement).closest<HTMLElement>(
    "[data-when-open],[data-when-clear],[data-when],[data-view],[data-filter],[data-account],[data-clear-filters],[data-clear-search],[data-open-filters],[data-day],[data-event],[data-card-posts],[data-month-step],[data-today],[data-show-period],[data-saved-only],[data-close-search]",
  );
  if (!control) return;
  const { view, filter, value, account, day, event: eventId, cardPosts, monthStep, showPeriod, when } = control.dataset;

  // "Cuándo" (phones): its chip opens the menu (or closes it), an option applies one date and closes it, × takes the
  // date away. The focus stays on (or goes back to) the chip, drawn again.
  if ("whenOpen" in control.dataset) {
    if (isWhenMenuOpen()) closeWhenMenu({ focusChip: true });
    else openWhenMenu();
    return;
  }
  if (when !== undefined) {
    if (control.getAttribute("aria-disabled") === "true") return; // nothing to show then: the menu stays
    state.dates = when ? [when] : [];
    render({ keepPlace: true });
    closeWhenMenu({ focusChip: true });
    return;
  }
  if ("whenClear" in control.dataset) {
    state.dates = [];
    render({ keepPlace: true });
    document.querySelector<HTMLElement>("#jump-chips [data-when-open]")?.focus({ preventScroll: true });
    return;
  }

  if ("savedOnly" in control.dataset) {
    const showSaved = () => {
      state.savedOnly = !state.savedOnly;
      render();
      backToTop();
    };
    if (state.savedOnly) leave("saved", showSaved);
    else goTo("saved", showSaved);
    return;
  }
  if ("closeSearch" in control.dataset || "clearSearch" in control.dataset) {
    clearSearch();
    render();
    return;
  }
  if ("openFilters" in control.dataset) {
    openFilterSheet();
    return;
  }
  if (showPeriod) {
    // "Ver los 23 eventos" / "Ver 7 más": the period opens whole; focus moves to its first new event.
    const section = control.closest<HTMLElement>(".agenda-group");
    const before = section?.querySelectorAll(".event-card").length ?? 0;
    goTo("period", () => {
      if (showWholePeriod(showPeriod)) render();
    });
    const cards = section?.isConnected
      ? section.querySelectorAll<HTMLElement>(".event-card__hit")
      : document.querySelector(`[data-period="${CSS.escape(showPeriod)}"]`)?.querySelectorAll<HTMLElement>(".event-card__hit");
    cards?.[before]?.focus({ preventScroll: true });
    return;
  }
  if (cardPosts) {
    const event = events.find((item) => item.id === cardPosts);
    if (event) openEventPosts(event);
    return;
  }
  if (eventId) {
    // The card's title is a link: let the browser handle new-tab clicks; a plain click opens the details.
    if (domEvent.button !== 0 || domEvent.metaKey || domEvent.ctrlKey || domEvent.shiftKey || domEvent.altKey) return;
    const event = events.find((item) => item.id === eventId);
    if (!event) return;
    domEvent.preventDefault();
    // Counted by where it was opened: the card itself or its "Detalles".
    const source = control.dataset.source === "boton" ? "boton" : "tarjeta";
    markDetailsHintSeen();
    openEventDrawer(event, { source });
    return;
  }
  if (view) {
    navigateView(view as View);
    return;
  }
  if (account !== undefined) {
    // An academy's events (its @ on a card), or all of them again ("" from its chip or the notice's button).
    if (account) {
      goTo("account", () => {
        state.accountFilter = account;
        render();
        focusAccountFilter();
      });
    } else {
      leave("account", () => {
        state.accountFilter = null;
        render({ keepPlace: true });
      });
      // Its chip ("@academia ×", in the bar or the sheet) or the toolbar's button goes away with it.
      if (document.activeElement === document.body || document.activeElement === control) focusAfterClearing(control);
    }
    return;
  }
  if (filter && value !== undefined) {
    // One tap chooses, another unchooses; a dimmed option (nothing to show with the other filters) does nothing.
    if (control.getAttribute("aria-disabled") === "true") return;
    const group = filter as FilterGroup;
    if (group === "types") state.types = toggled(state.types, value) as EventType[];
    else state[group] = toggled(state[group], value);
  } else if ("clearFilters" in control.dataset) {
    // "Limpiar": dates, rhythms, types and the academy (its screen is left as "back" would). Not the search
    // nor "Guardados".
    const account = state.accountFilter;
    clearFilters(state);
    if (account) {
      state.accountFilter = account; // `leave` takes it away, through the history when it came from a card
      leave("account", () => {
        state.accountFilter = null;
        render({ keepPlace: true });
      });
    }
  } else if (day) state.selectedDay = day;
  else if (monthStep) {
    state.month = addMonths(state.month, Number(monthStep));
    state.selectedDay = defaultDayForMonth(events, state.month);
  } else if ("today" in control.dataset) {
    state.month = currentMonth();
    state.selectedDay = todayIso();
  }
  // Filters keep the period being read in place (or the next one left, for a date filter).
  const filtered = Boolean(filter) || "clearFilters" in control.dataset;
  render({ keepPlace: filtered });

  // The control clicked was re-rendered away, or "Limpiar" (which never stays usable): put focus somewhere useful.
  const lost = document.activeElement === document.body || document.activeElement === control;
  if (lost && ("clearFilters" in control.dataset || (filtered && !control.isConnected))) focusAfterClearing(control);
}

/**
 * A shared link (/evento/<id>/, which forwards here as ?evento=<id>): the list opens at that event's card (its
 * period opened whole if it was summarized), with its details drawer at half height over it. The address goes
 * back to the home page first, so × or "back" leave the visitor on the list instead of leaving the site. An event
 * that isn't in the list (it already passed) goes back to its own page, which says so.
 */
function openSharedEvent() {
  const link = sharedEventLink(location);
  if (!link) return;
  const { id, params } = link;
  history.replaceState(null, "", link.address); // the list's entry, under the drawer's (pushed once it opens)
  const event = events.find((item) => item.id === id);
  if (!event) return;
  const entry = sharedEventEntry(groupByPeriod(visibleEvents(events, state), todayIso(), state.dates), id);
  if (!entry.listed) {
    params.set("pagina", "1"); // its page stays (it would forward here again otherwise)
    location.replace(`${eventPath(event)}?${params}`);
    return;
  }
  if (entry.open && showWholePeriod(entry.open)) render();
  // Once the page has settled (fonts in, layout measured): the card is found where it will stay.
  void document.fonts.ready.then(() =>
    requestAnimationFrame(() => requestAnimationFrame(() => openEventDrawer(event, { source: "enlace", shared: true }))),
  );
}

export function start() {
  events = JSON.parse(byId("events-data").textContent || "[]");
  keepOnly(new Set(events.map((event) => event.id))); // saved events no longer in the data are forgotten
  initThemeToggle();
  initEventDrawer((id) => events.find((event) => event.id === id));
  initPostsSheet();
  initPostViewer();
  initSharing((id) => events.find((event) => event.id === id));
  initInstallPrompt();
  registerServiceWorker();
  initJumpBar();
  initViewSwitch(navigateView);
  initClickTracking();
  document.addEventListener("click", handleClick);
  document.addEventListener("input", handleSearchInput);
  // Saving changes the "Guardados" count. The list itself only changes while it shows just the saved events:
  // then it's redrawn right where the visitor was (never jumping, e.g. to a period's heading).
  initSaveButtons(() => {
    offerAfterSaving(upcomingSaved().length);
    if (!state.savedOnly) return renderSavedCount();
    const scrollY = window.scrollY;
    render();
    returnToScroll(scrollY);
  });
  render();
  openSharedEvent();
  initScreenHistory({ current: currentScreen, apply: applyScreen });
}
