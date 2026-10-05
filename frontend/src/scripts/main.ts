// Entry point: load the events embedded in the page, wire up interactions and render.

import type { AppState, DanceEvent, EventType, View } from "./types";
import { initClickTracking } from "./lib/analytics";
import { byId, isPlainClick } from "./lib/dom";
import { focusAfterClearing, focusScope, focusSelector } from "./lib/focus";
import { eventCountLabel, formatLongDate } from "./lib/format";
import { addMonths, currentMonth, isUpcoming, nowInBogota, todayIso } from "./lib/dates";
import { eventPath, sharedEventLink, viewOfPath, viewPath } from "./lib/links";
import { shareSources } from "./lib/shareSources";
import {
  HIDE_BARS_KEY,
  clearFilters,
  createInitialState,
  defaultDayForMonth,
  groupByPeriod,
  isFilterGroup,
  isView,
  listOrder,
  toggled,
  visibleEvents,
  type AgendaGroup,
} from "./state";
import { initThemeToggle } from "./theme";
import { renderCalendarView } from "./views/calendarView";
import { watchClips } from "./views/clips";
import { highlightCurrentCard, initEventDrawer, openEventDrawer } from "./views/eventDrawer";
import { openEventPosts } from "./views/eventDetailActions";
import { armDetailsHint, markDetailsHintSeen } from "./views/detailsHint";
import { HIDE_BARS_FILTER, filterModel, staleDates } from "./lib/filterModel";
import { storedSwitch } from "./lib/storedSwitch";
import { renderFilters } from "./views/filters";
import {
  captureListPosition,
  initJumpBar,
  openFilterSheet,
  renderJumpBar,
  restoreListPosition,
  returnToScroll,
} from "./views/jumpBar";
import { renderUpcomingView, sharedEventEntry, showWholePeriod } from "./views/upcomingView";
import { goTo, initScreenHistory } from "./screenHistory";
import { initPostViewer } from "./views/postViewer";
import { initPostsSheet } from "./views/postsSheet";
import { closeSearchField, initBottomNav, renderBottomNav } from "./views/bottomNav";
import { viewNavigation } from "./views/viewNavigation";
import { closeWhenMenu, isWhenMenuOpen, openWhenMenu, syncWhenMenu } from "./views/whenMenu";
import { closePanel, initFilterPanels, syncPanels, togglePanel } from "./views/filterPanels";
import { initSaveButtons, renderSavedCount as drawSavedCount } from "./views/saveButton";
import { renderSavedView } from "./views/savedView";
import { watchDayChange } from "./views/dayChange";
import { initInstallPrompt, offerAfterSaving, registerServiceWorker } from "./views/installPrompt";
import { initSharing, plansEventUrl, setShareSources } from "./views/sharing";
import { isSaved, keepOnly } from "./lib/saved";

/** "Ocultar eventos de bares", remembered in this browser (blocked storage: for this visit). */
const hideBarsSetting = storedSwitch(HIDE_BARS_KEY);
const state = createInitialState({ hideBars: hideBarsSetting.on() });
let events: DanceEvent[] = [];
/** The events by id, built once in start(): the data never changes while the page is open. */
let eventById = new Map<string, DanceEvent>();
const findEvent = (id: string): DanceEvent | undefined => eventById.get(id);

const { navigateView, revealDay, backToTop, currentScreen, applyScreen, openedOnCalendar } = viewNavigation(state, () =>
  render(),
);

/** Each view's section in the page (components/HomePage.astro). */
const VIEW_IDS: Record<View, string> = { upcoming: "view-upcoming", calendar: "view-calendar", saved: "view-saved" };

/** The number of events, said politely to screen readers after each change. */
function announce(count: number) {
  const label = eventCountLabel(count);
  const said: Record<View, string> = {
    upcoming: `${label} próximos`,
    calendar: `${formatLongDate(state.selectedDay)}: ${label}`,
    saved: `${label} guardados por venir`,
  };
  byId("results-status").textContent = said[state.view];
}

/** What the view on screen shows: how many events, and the list's periods (for the share buttons). */
function renderView(): { shown: number; groups: AgendaGroup[] } {
  const container = byId(VIEW_IDS[state.view]);
  if (state.view === "upcoming") return renderUpcomingView(container, events, state);
  if (state.view === "calendar") return { shown: renderCalendarView(events, state), groups: [] }; // no periods
  return { shown: renderSavedView(container, events, state), groups: [] }; // its plans are shared whole
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
  for (const [view, id] of Object.entries(VIEW_IDS)) byId(id).hidden = view !== state.view;
  // Guardados has no filters: the pinned bar and the toolbar's pills hide (CSS), their menus close. `data-screen`, never
  // `data-view`: that's a control's attribute (Eventos, the tabs), and every click inside the body would find it.
  document.body.dataset.screen = state.view;
  if (state.view === "saved") {
    closeWhenMenu();
    closePanel();
  }
  document.querySelectorAll<HTMLElement>('[role="tab"][data-view]').forEach((tab) => {
    tab.setAttribute("aria-selected", String(tab.dataset.view === state.view));
  });
  renderBottomNav({ view: state.view, query: state.query, active: model.active });

  const { shown, groups } = renderView();
  renderJumpBar();
  renderSavedCount();
  watchClips(byId(VIEW_IDS[state.view])); // the videos' clips, as a feed
  if (anchor) restoreListPosition(anchor);
  announce(shown);
  setShareSources(shareSources({ groups, state, plans: upcomingSaved(), planUrl: plansEventUrl }));
  syncWhenMenu(); // "Cuándo" was drawn again: its menu, if open, stays under it
  syncPanels(); // the same for the toolbar's pills and their panels (wide screens)
  highlightCurrentCard(); // the side panel's event, outlined again among the new cards
  armDetailsHint();

  // The first one on screen: the same choice can be in a closed panel and among the removable chips.
  if (focused) [...scope.querySelectorAll<HTMLElement>(focused)].find((element) => element.getClientRects().length)?.focus();
}

/** The saved events still to come, in the list's order (a series by its next session). */
function upcomingSaved(): DanceEvent[] {
  const now = nowInBogota();
  return listOrder(events.filter((event) => isUpcoming(event, now) && isSaved(event.id)), todayIso());
}

/** "Guardados 3": how many upcoming events are saved, on the bar's Guardados and the toolbar's tab. */
function renderSavedCount() {
  drawSavedCount(upcomingSaved().length);
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

/** No search anymore: the fields empty, the field at the bottom back into the bar. */
function clearSearch() {
  clearTimeout(searchTimer);
  state.query = "";
  document.querySelectorAll<HTMLInputElement>("[data-search]").forEach((field) => (field.value = ""));
  closeSearchField();
}

// ---------- the views' controls ----------

/** What a click on a control does: `value` is its data-* attribute's, `control` the element carrying it. */
type ControlHandler = (value: string, control: HTMLElement, domEvent: MouseEvent) => void;

const isDisabled = (control: HTMLElement) => control.getAttribute("aria-disabled") === "true";

/**
 * After a change of what the list or the calendar shows: draw it again, the calendar's day list on screen, and the
 * focus somewhere useful when the control clicked was drawn away (a filter's chip) or is "Limpiar", which never stays
 * usable. `filtered`: a filter changed, so the period being read stays in place (or the next one left, for a date).
 */
function redraw(control: HTMLElement, { filtered = false, cleared = false } = {}) {
  render({ keepPlace: filtered });
  revealDay({ smooth: true }); // the calendar: a day, ‹ ›, "Hoy" or a filter changed what the day lists
  const lost = document.activeElement === document.body || document.activeElement === control;
  if (lost && (cleared || (filtered && !control.isConnected))) focusAfterClearing(control);
}

/** "Cuándo" (phones): its chip opens the menu, or closes it (the focus back on the chip). */
const toggleWhenMenu: ControlHandler = () => {
  if (isWhenMenuOpen()) closeWhenMenu({ focusChip: true });
  else openWhenMenu();
};

/**
 * An option of "Cuándo" (the phone bar's menu, or the toolbar's on wide screens): that one date (or any, ""), then the
 * menu closes; one with nothing to show does nothing.
 */
const chooseWhen: ControlHandler = (when, control) => {
  if (isDisabled(control)) return;
  state.dates = when ? [when] : [];
  render({ keepPlace: true });
  closeWhenMenu({ focusChip: true });
  closePanel({ focusPill: true });
};

/** "Cuándo"'s ×: no date; the focus goes to the chip, drawn again. */
const clearWhen: ControlHandler = () => {
  state.dates = [];
  render({ keepPlace: true });
  document.querySelector<HTMLElement>("#jump-chips [data-when-open]")?.focus({ preventScroll: true });
};

const endSearch: ControlHandler = () => {
  clearSearch();
  render();
};

/** "Ver los 23 eventos" / "Ver 7 más": the period opens whole; focus moves to its first new event. */
const showPeriod: ControlHandler = (key, control) => {
  const section = control.closest<HTMLElement>(".agenda-group");
  const before = section?.querySelectorAll(".event-card").length ?? 0;
  goTo("period", () => {
    if (showWholePeriod(key)) render();
  });
  const cards = section?.isConnected
    ? section.querySelectorAll<HTMLElement>(".event-card__hit")
    : document.querySelector(`[data-period="${CSS.escape(key)}"]`)?.querySelectorAll<HTMLElement>(".event-card__hit");
  cards?.[before]?.focus({ preventScroll: true });
};

/** A card's "▦ 3": the event's posts. */
const openCardPosts: ControlHandler = (id) => {
  const event = findEvent(id);
  if (event) openEventPosts(event);
};

/** A card (its title is a link: the browser handles new-tab clicks; a plain click opens the details). */
const openCardEvent: ControlHandler = (id, control, domEvent) => {
  if (!isPlainClick(domEvent)) return;
  const event = findEvent(id);
  if (!event) return;
  domEvent.preventDefault();
  // Counted by where it was opened: the card itself or its "Detalles".
  const source = control.dataset.source === "boton" ? "boton" : "tarjeta";
  markDetailsHintSeen();
  openEventDrawer(event, { source });
};

/**
 * The bar's Eventos, Calendario and Guardados (links to the views' addresses: a new-tab click is the browser's), the
 * tabs (Próximos, Calendario, Guardados) on wide screens, and Guardados' "Ver eventos".
 */
const chooseView: ControlHandler = (view, control, domEvent) => {
  if (control instanceof HTMLAnchorElement) {
    if (!isPlainClick(domEvent)) return;
    domEvent.preventDefault();
  }
  if (isView(view)) navigateView(view);
};

/**
 * A filter chip: one tap chooses, another unchooses; a dimmed option (nothing to show with the others) does nothing.
 * "Ocultar eventos de bares" (the sheet's switch, the toolbar's chip, "Sin bares ×") turns on or off, and is remembered.
 */
const toggleFilter: ControlHandler = (group, control) => {
  const { value } = control.dataset;
  if (group === HIDE_BARS_FILTER.group) {
    state.hideBars = !state.hideBars;
    hideBarsSetting.set(state.hideBars);
    return redraw(control, { filtered: true });
  }
  if (value === undefined || isDisabled(control) || !isFilterGroup(group)) return;
  if (group === "types") state.types = toggled(state.types, value) as EventType[];
  else state[group] = toggled(state[group], value);
  redraw(control, { filtered: true });
};

/** "Limpiar": dates, rhythms and types, and the bars shown again (forgotten in storage too). Not the search. */
const clearAllFilters: ControlHandler = (_, control) => {
  const hidingBars = state.hideBars;
  clearFilters(state);
  if (hidingBars) hideBarsSetting.set(false); // only when it was on: storage is left alone otherwise
  redraw(control, { filtered: true, cleared: true });
};

/** A day of the calendar. */
const chooseDay: ControlHandler = (day, control) => {
  state.selectedDay = day;
  redraw(control);
};

/** The calendar's ‹ ›: the month before or after, on its first day with events. */
const stepMonth: ControlHandler = (step, control) => {
  state.month = addMonths(state.month, Number(step));
  state.selectedDay = defaultDayForMonth(events, state.month);
  redraw(control);
};

/** The calendar's "Hoy". */
const showToday: ControlHandler = (_, control) => {
  state.month = currentMonth();
  state.selectedDay = todayIso();
  redraw(control);
};

/** Every control by its data-* attribute (as in `dataset`), in the order they're tried. */
const CONTROLS: [attribute: string, handler: ControlHandler][] = [
  ["whenOpen", toggleWhenMenu],
  ["when", chooseWhen],
  ["whenClear", clearWhen],
  ["pill", (key) => togglePanel(key)],
  ["closeSearch", endSearch],
  ["clearSearch", endSearch],
  ["openFilters", (_, control) => !isDisabled(control) && openFilterSheet()], // off in Guardados
  ["showPeriod", showPeriod],
  ["cardPosts", openCardPosts],
  ["event", openCardEvent],
  ["view", chooseView],
  ["filter", toggleFilter],
  ["clearFilters", clearAllFilters],
  ["day", chooseDay],
  ["monthStep", stepMonth],
  ["today", showToday],
];

/** "monthStep" → "[data-month-step]" */
const CONTROLS_SELECTOR = CONTROLS.map(([attribute]) => `[data-${attribute.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}]`).join(",");

/** One delegated listener for every data-* control rendered by the views. */
function handleClick(domEvent: MouseEvent) {
  const control = (domEvent.target as HTMLElement).closest<HTMLElement>(CONTROLS_SELECTOR);
  if (!control) return;
  for (const [attribute, handle] of CONTROLS) {
    const value = control.dataset[attribute];
    if (value !== undefined) return handle(value, control, domEvent);
  }
}

/**
 * A shared link (/evento/<id>/, which forwards here as ?evento=<id>): the list opens at that event's card (its
 * period opened whole if it was summarized), with its details drawer at half height over it. The address goes
 * back to the home page first, so × or "back" leave the visitor on the list instead of leaving the site. An event
 * that isn't in the list (it already passed) goes back to its own page, which says so; a bar's, hidden by "Ocultar
 * eventos de bares", opens its details over the list all the same.
 */
function openSharedEvent() {
  const link = sharedEventLink(location);
  if (!link) return;
  const { id, params } = link;
  history.replaceState(null, "", link.address); // the list's entry, under the drawer's (pushed once it opens)
  const event = findEvent(id);
  if (!event) return;
  const entryWith = (shown: AppState) => sharedEventEntry(groupByPeriod(visibleEvents(events, shown), todayIso(), shown.dates), id);
  const entry = entryWith(state);
  // A bar's event while the bars are hidden (remembered from an earlier visit): its details open all the same, over
  // the list without its card, as for any filter; the setting stays as the visitor left it.
  const hiddenBar = !entry.listed && entryWith({ ...state, hideBars: false }).listed;
  if (!entry.listed && !hiddenBar) {
    params.set("pagina", "1"); // its page stays (it would forward here again otherwise)
    location.replace(`${eventPath(event)}?${params}`);
    return;
  }
  if (entry.listed && entry.open && showWholePeriod(entry.open)) render();
  // Once the page has settled (fonts in, layout measured): the card is found where it will stay.
  void document.fonts.ready.then(() =>
    requestAnimationFrame(() => requestAnimationFrame(() => openEventDrawer(event, { source: "enlace", shared: entry.listed }))),
  );
}

export function start() {
  events = JSON.parse(byId("events-data").textContent || "[]");
  eventById = new Map(events.map((event) => [event.id, event]));
  keepOnly(new Set(eventById.keys())); // saved events no longer in the data are forgotten
  initThemeToggle();
  initEventDrawer(findEvent);
  initPostsSheet();
  initPostViewer();
  initSharing(findEvent);
  initInstallPrompt();
  registerServiceWorker();
  initJumpBar();
  initFilterPanels();
  // × and back end the search (and Escape on a keyboard): cleared, the view drawn again.
  initBottomNav({
    dismiss: () => {
      clearSearch();
      render();
    },
  });
  initClickTracking();
  document.addEventListener("click", handleClick);
  document.addEventListener("input", handleSearchInput);
  // Saving changes the "Guardados" count. Guardados itself is drawn again right where the visitor was (never
  // jumping, e.g. to a period's heading): an event unsaved there leaves it.
  initSaveButtons(() => {
    offerAfterSaving(upcomingSaved().length);
    if (state.view !== "saved") return renderSavedCount();
    const scrollY = window.scrollY;
    render();
    returnToScroll(scrollY);
  });
  // The page's own address picks the view it opens on: /calendario/, /guardados/ (lib/links.ts viewOfPath).
  state.view = viewOfPath(location.pathname);
  render();
  if (state.view === "calendar") openedOnCalendar();
  openSharedEvent();
  initScreenHistory({ current: currentScreen, apply: applyScreen, address: (screen) => viewPath(screen.view) });
  watchDayChange(state, () => render()); // shown again on another day: today's events, or the latest ones
}
