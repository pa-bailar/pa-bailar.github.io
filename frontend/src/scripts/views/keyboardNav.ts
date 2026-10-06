// Moving through the events with the keyboard, without clicking card after card (the owner, 5 October 2026):
//   - A card has the focus: ↑ ↓ ← → move it to the card above, below, before or after (the grid's rows on wide screens,
//     the feed's single column on phones). Enter opens its details, with its image big beside them where that works
//     (lightbox.ts); elsewhere the card's own link opens the details.
//   - A summarized period ("Ver los 23 eventos") and a busy one's "Ver 7 más" are stops too, in the grid's order (the
//     owner, 6 Oct 2026: the arrows go on through the whole list instead of scrolling past its end). Enter opens the
//     period whole and puts the focus on its first new event (main.ts showPeriod), and the arrows go on from there.
//   - Nothing has the focus yet: any arrow puts it on the first stop on screen, the first whose top shows below the
//     pinned bars (the owner, 6 Oct 2026: ↑ ↓ too; Page Up/Down, space and the wheel still scroll). With the details
//     open, it moves from their event instead, as in the details (a click on the page's margin drops the focus).
//   - The details are open (the side panel, or the drawer): ← → show the event before or after in the list on screen,
//     ↑ ↓ the one in the row above or below (the grid's, as from a card; the owner, 6 Oct 2026), the list following
//     (its card outlined and brought into view); Escape then leaves the focus on that card. The panel swaps events in
//     place (drawerHistory.ts), so back still returns to the list. Enter (on the panel itself, not on one of its
//     buttons or links) shows the image beside them: to press Enter an event was almost always just clicked.
//   - With the image beside the details, ← → go through its photos first, then on to the event before or after (its
//     last photo, going back), like one stream (the owner, 6 Oct 2026; lightbox.ts stepStage).
//   - From the details, a period's block on the way opens by itself and the details show its first new event (its
//     last, going back): moving onto a block the details can't show left the image unchanged (the owner, 6 Oct 2026).
//   - Where the side panel fits (wide screens), it shows the card the arrows move to, like an inbox's reading pane: an
//     arrow onto a card opens it, from a fresh page too (the owner, 6 Oct 2026), and the focus stays in the list (so
//     ↑ ↓ keep working there). Escape closes it; the next arrow opens it again. Not where the details are the phones'
//     drawer over the list. Before, after a look at another card's image (the lightbox) or Escape from it, the arrows
//     moved through the list and the panel stayed on the first event (the owner, 5 Oct 2026).
//   - Tab (initRovingTab): the list is one Tab stop, the selected card (the last one the arrows or a click left, else
//     the first). On it, Tab goes through that card's own controls (the card, Detalles, Compartir, Guardar, ‹ ›, the
//     profile), then into the side panel if it's open, then on out of the list; Shift+Tab walks back the same way.
//     Of the periods' headings, only the selected card's keeps its Compartir in the Tab order (just before it).
//     Every other card is out of the Tab order (tabindex -1; screen readers' reading still reaches them). Before, each
//     card was 5 to 7 stops (251 on the page) and Tab disagreed with the arrows and the panel (the owner, 6 Oct 2026).
// Never while typing (the search), in a menu (Cuándo, a pill's panel) or over something else (a sheet, the post viewer,
// the lightbox, which has ← → of its own). A card's ‹ › stay the mouse's and Tab's: ← → never mean two things.

import type { DanceEvent } from "../types";

type Box = { left: number; top: number; width: number; height: number };
type Direction = "left" | "right" | "up" | "down";

const STEPS: Record<string, Direction> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
};

/**
 * The stop a key moves to from stop `from` (null: none that way). ← → go by reading order (the page's); ↑ ↓ to the
 * nearest row above or below, the stop there closest to this one's middle. Pure, on the stops' boxes (tested).
 */
export function neighbor(boxes: Box[], from: number, direction: Direction): number | null {
  if (direction === "left") return from > 0 ? from - 1 : null;
  if (direction === "right") return from < boxes.length - 1 ? from + 1 : null;
  const here = boxes[from];
  if (!here) return null;
  const middle = here.left + here.width / 2;
  const below = direction === "down";
  const candidates = boxes
    .map((box, index) => ({ box, index }))
    .filter(({ box }) => (below ? box.top > here.top + here.height / 2 : box.top + box.height / 2 < here.top));
  if (!candidates.length) return null;
  const rowTop = below ? Math.min(...candidates.map(({ box }) => box.top)) : Math.max(...candidates.map(({ box }) => box.top));
  // The row is told by its own first box's height, not this one's: a short "Ver 10 más" just above the next period's
  // cards is a row of its own (measured by a 620-px card, it was grouped with them and skipped). rowTop is a
  // candidate's own top, so one is found.
  const nearest = candidates.find(({ box }) => box.top === rowTop)!.box;
  const row = candidates.filter(({ box }) => Math.abs(box.top - rowTop) < Math.min(here.height, nearest.height) / 2);
  row.sort((a, b) => Math.abs(a.box.left + a.box.width / 2 - middle) - Math.abs(b.box.left + b.box.width / 2 - middle));
  return row[0]?.index ?? null;
}

/**
 * The stop to start on when nothing has the focus: the first (reading order) whose top shows between `top` (below the
 * pinned bars) and `bottom`; else the first still partly below `top` (one taller than the room); null: no stops.
 * Pure, on the stops' boxes (tested). Before, a card scrolled almost out above, under the pinned bar, got the focus.
 */
export function firstInView(boxes: Box[], top: number, bottom: number): number | null {
  const shown = boxes.findIndex((box) => box.top >= top && box.top < bottom);
  if (shown >= 0) return shown;
  const partly = boxes.findIndex((box) => box.top + box.height > top);
  return partly >= 0 ? partly : boxes.length ? 0 : null;
}

/** The room the pinned bars leave on screen: scroll-padding (base.css) is what they cover. */
function room(): { top: number; bottom: number } {
  const style = getComputedStyle(document.documentElement);
  const pad = (value: string) => parseFloat(value) || 0;
  return { top: pad(style.scrollPaddingTop), bottom: innerHeight - pad(style.scrollPaddingBottom) };
}

const VIEW = '[role="tabpanel"]:not([hidden])';

/**
 * Where the arrows stop in the view on screen, in reading order, laid out: its cards, and the buttons that open a
 * period whole (a summarized period's "Ver los 23 eventos", a busy one's "Ver 7 más").
 */
function stops(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(`${VIEW} [data-event-card], ${VIEW} [data-show-period]`)].filter(
    (stop) => stop.getClientRects().length > 0,
  );
}

const linkOf = (card: Element | undefined) => card?.querySelector<HTMLAnchorElement>("a.event-card__hit") ?? null;

/** What gets the focus at a stop: a card's link, or the period's button itself. */
const focusOf = (stop: HTMLElement | undefined): HTMLElement | null =>
  stop?.matches("[data-show-period]") ? stop : linkOf(stop);

/**
 * Opens a period's block from the details (its button's own click: main.ts showPeriod) and returns the first card it
 * added, or the last one going back.
 */
function openPeriod(button: HTMLElement, backward: boolean): HTMLElement | undefined {
  const key = button.dataset.showPeriod ?? "";
  const section = () => document.querySelector(`${VIEW} [data-period="${CSS.escape(key)}"]`);
  const before = section()?.querySelectorAll("[data-event-card]").length ?? 0;
  button.click();
  const added = [...(section()?.querySelectorAll<HTMLElement>("[data-event-card]") ?? [])].slice(before);
  return backward ? added.at(-1) : added[0];
}

/** Whether the keys belong to something else: typing, a menu, a dialog over the page other than the details. */
function busy(target: Element): boolean {
  if (target.closest('input, textarea, select, [contenteditable="true"], [role="menu"], [role="dialog"]:not(#event-drawer)')) {
    return true;
  }
  // The image stage (lightbox.ts) goes with the panel: its keys are the panel's.
  return Boolean(document.querySelector("dialog[open]:not(#event-drawer):not(#lightbox)"));
}

/** Whether `stop`'s middle shows in the room the pinned bars leave (a sliver at the edge: the visitor looks elsewhere). */
function onScreen(stop: HTMLElement | undefined): boolean {
  if (!stop) return false;
  const { top, bottom } = room();
  const box = stop.getBoundingClientRect();
  const middle = box.top + box.height / 2;
  return middle > top && middle < bottom;
}

/**
 * The focus on `focus` (a card's link, or a period's button), and its whole stop in view, clear of the pinned bars: a
 * card's link is its title, under the image, so focusing it alone could leave the image under the toolbar.
 */
function focusStop(focus: HTMLElement) {
  focus.focus({ preventScroll: true });
  (focus.closest<HTMLElement>("[data-event-card]") ?? focus).scrollIntoView({ block: "nearest" });
}

/** In the details or the image beside them. */
const inDetails = (target: Element) => Boolean(target.closest("#event-drawer, #lightbox"));

/** A key pressed with a modifier is the browser's or the system's (Alt+← is back, Shift+↓ selects). */
const modified = (domEvent: KeyboardEvent) => domEvent.altKey || domEvent.ctrlKey || domEvent.metaKey || domEvent.shiftKey;

interface ShowOptions {
  /** The focus stays on the card (the panel follows it) instead of going to the details. */
  stayInList: boolean;
  /** The image beside the details shows the event's last photo (← from the next event's first). */
  lastPhoto?: boolean;
}

interface Hooks {
  findEvent: (id: string) => DanceEvent | undefined;
  /** The event the details show, if they're open. */
  openEventId: () => string | null;
  /** Show `event` in the open details; `card` gets the focus back when they close. */
  showEvent: (event: DanceEvent, card: HTMLAnchorElement, options: ShowOptions) => void;
  /** One photo on or back in the image beside the details, if there's one that way: whether it moved. */
  stepPhoto: (step: 1 | -1) => boolean;
  /** Whether the details open as the side panel beside the list: the card in focus shows there. */
  readingPane: () => boolean;
  /**
   * Enter on a card (`card`) or in the open details (`card` null: the open event): the details with the image beside
   * them, where that works (true); false: nothing done (on a card, its link then opens the details).
   */
  showImage: (event: DanceEvent, card: HTMLAnchorElement | null) => boolean;
}

/** A stop's identity across redraws: its event, or its period's button. */
const keyOf = (stop: HTMLElement): string => stop.dataset.eventCard ?? `period:${stop.dataset.showPeriod ?? ""}`;

/**
 * What in a card can take the focus besides its link, in the page's order: a carousel's strip and ‹ ›, Detalles,
 * Compartir, Guardar, the profile. The strip has no tabindex, but Chrome lets Tab reach any box that scrolls: it's
 * named here so it gets one (-1) like the rest.
 */
const controlsOf = (card: HTMLElement): HTMLElement[] =>
  [...card.querySelectorAll<HTMLElement>("button, a[href], [tabindex], [data-carousel]")].filter(
    (control) => !control.matches("a.event-card__hit") && control.getClientRects().length > 0,
  );

/** The Tab order inside the selected card: the card (its link) first, then its controls. */
const tabOrderOf = (card: HTMLElement): HTMLElement[] => {
  const link = linkOf(card);
  return [...(link ? [link] : []), ...controlsOf(card)];
};

/** What can take the focus in `root`, in the page's order. */
const focusables = (root: Element): HTMLElement[] =>
  [...root.querySelectorAll<HTMLElement>("a[href], button, input, select, textarea, [tabindex]")].filter(
    (element) => element.tabIndex >= 0 && !element.matches(":disabled") && element.getClientRects().length > 0,
  );

interface TabHooks {
  /** The event the details show, if they're open. */
  openEventId: () => string | null;
  /** The focus into the open details (their title). */
  focusDetails: () => void;
}

/**
 * The list as one Tab stop (a "roving tabindex"): see the header. The selected stop is kept by its key, so a redraw
 * (filters, a period opened) keeps it when it's still there.
 */
export function initRovingTab(hooks: TabHooks) {
  let selected: string | null = null;

  /** Only the selected stop can be reached with Tab; every other stop and every card's own controls can't. */
  function apply() {
    const list = stops();
    if (!list.length) return;
    const active = list.find((stop) => keyOf(stop) === selected) ?? list[0]!;
    selected = keyOf(active);
    for (const stop of list) {
      const focus = focusOf(stop);
      if (focus) focus.tabIndex = stop === active ? 0 : -1;
      if (stop.dataset.eventCard) for (const control of controlsOf(stop)) control.tabIndex = -1;
    }
    // The periods' own buttons (their heading's Compartir) belong to the list too: only the selected stop's period
    // keeps its in the Tab order, right before it. Each one left in made Tab jump down the page, period by period,
    // past the selected card (the owner, 6 Oct 2026).
    const period = active.closest("[data-period]");
    for (const section of document.querySelectorAll(`${VIEW} [data-period]`)) {
      for (const button of section.querySelectorAll<HTMLElement>(".agenda-group__header button, .agenda-group__header a[href]")) {
        button.tabIndex = section === period ? 0 : -1;
      }
    }
  }

  let pending = 0;
  const applySoon = () => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(apply);
  };

  // The selection follows the focus: the arrows, a click, Tab inside the selected card.
  document.addEventListener("focusin", (domEvent) => {
    const target = domEvent.target instanceof Element ? domEvent.target : null;
    const stop = target?.closest<HTMLElement>(`${VIEW} [data-event-card], ${VIEW} [data-show-period]`);
    if (!stop || keyOf(stop) === selected) return;
    selected = keyOf(stop);
    apply();
  });

  document.addEventListener("keydown", (domEvent) => {
    if (domEvent.key !== "Tab" || domEvent.altKey || domEvent.ctrlKey || domEvent.metaKey) return;
    const target = domEvent.target instanceof HTMLElement ? domEvent.target : null;
    if (!target) return;
    const back = domEvent.shiftKey;
    const panel = document.getElementById("event-drawer") as HTMLDialogElement | null;

    // Back out of the side panel from its start (its title, or its first control): to the last control of the card it
    // shows, which the arrows inside it may have changed since (the panel follows the list).
    const first = panel?.open ? focusables(panel)[0] : undefined;
    const atStart =
      first === target || (first && first.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_PRECEDING);
    if (back && panel?.open && panel.contains(target) && atStart) {
      const shown = hooks.openEventId() ?? selected ?? "";
      const card = document.querySelector<HTMLElement>(`${VIEW} [data-event-card="${CSS.escape(shown)}"]`);
      const last = card ? tabOrderOf(card).at(-1) : undefined;
      if (card && last) {
        domEvent.preventDefault();
        selected = keyOf(card);
        apply();
        last.focus();
      }
      return;
    }

    const card = target.closest<HTMLElement>(`${VIEW} [data-event-card]`);
    if (!card || keyOf(card) !== selected) return;
    const order = tabOrderOf(card);
    const at = order.indexOf(target);
    if (at < 0) return;
    const next = order[at + (back ? -1 : 1)];
    if (next) {
      domEvent.preventDefault();
      next.focus();
      return;
    }
    // Past the card's last control: into the open side panel; else the browser goes on (the rest of the list is out
    // of the Tab order). Back from the card itself: the browser goes on, out of the list.
    if (!back && hooks.openEventId() && panel?.open) {
      domEvent.preventDefault();
      hooks.focusDetails();
    }
  });

  // Every redraw of a view (filters, a period opened, another view) brings new cards: they get the same rules.
  const observer = new MutationObserver(applySoon);
  document.querySelectorAll('[role="tabpanel"]').forEach((view) => observer.observe(view, { childList: true, subtree: true }));
  new MutationObserver(applySoon).observe(document.body, { attributes: true, attributeFilter: ["data-screen"] });
  apply();
}

export function initKeyboardNav(hooks: Hooks) {
  /** Enter on a card, on the open details, or on a period's button. */
  function onEnter(domEvent: KeyboardEvent, target: Element) {
    const link = target.closest<HTMLAnchorElement>("a.event-card__hit");
    const openId = hooks.openEventId();
    // On a card; or on the open details themselves (their title, their text), not one of their buttons or links.
    const onDetails = !link && openId && inDetails(target) && !target.closest("a, button, input, select, textarea, summary");
    const event = link ? hooks.findEvent(link.dataset.event ?? "") : onDetails ? hooks.findEvent(openId) : undefined;
    if (event && hooks.showImage(event, link)) domEvent.preventDefault(); // otherwise a card's link opens the details
    // A period's button: it opens the period and focuses its first new event without scrolling (main.ts showPeriod,
    // so a click doesn't jump); from the keyboard that card must come into view, or the next arrow starts off screen.
    if (target.closest("[data-show-period]")) {
      requestAnimationFrame(() => document.activeElement?.closest("[data-event-card]")?.scrollIntoView({ block: "nearest" }));
    }
  }

  /**
   * From the details (`at`: their event's stop): a photo, or the event that way, opening a block on the way. `inPanel`:
   * the focus was in them (it stays there); else on nothing, and it goes to the card, as with the reading pane.
   */
  function fromDetails(domEvent: KeyboardEvent, direction: Direction, list: HTMLElement[], at: number, inPanel: boolean) {
    const backward = direction === "left" || direction === "up";
    if ((direction === "left" || direction === "right") && hooks.stepPhoto(backward ? -1 : 1)) {
      domEvent.preventDefault();
      return;
    }
    const to = at < 0 ? null : neighbor(list.map((item) => item.getBoundingClientRect()), at, direction);
    let next = to === null ? undefined : list[to];
    if (next?.dataset.showPeriod) {
      domEvent.preventDefault(); // even if it adds nothing to go to: no scrolling instead
      next = openPeriod(next, backward);
    }
    const event = next?.dataset.eventCard ? hooks.findEvent(next.dataset.eventCard) : undefined;
    const link = linkOf(next);
    if (!event || !link) return;
    domEvent.preventDefault();
    if (!inPanel) focusStop(link);
    hooks.showEvent(event, link, { stayInList: !inPanel, lastPhoto: direction === "left" });
  }

  /** The card that got the focus shows in the side panel, open or not, where it fits (the reading pane). */
  function showInPane(card: HTMLElement | undefined) {
    const event = card?.dataset.eventCard ? hooks.findEvent(card.dataset.eventCard) : undefined;
    const link = linkOf(card);
    if (event && link && (hooks.openEventId() || hooks.readingPane())) hooks.showEvent(event, link, { stayInList: true });
  }

  /** From a card or a period's button: the stop that way; the side panel follows a card. */
  function fromStop(domEvent: KeyboardEvent, direction: Direction, list: HTMLElement[], stop: HTMLElement) {
    const from = list.indexOf(stop);
    if (from < 0) return;
    const to = neighbor(list.map((item) => item.getBoundingClientRect()), from, direction);
    const next = to === null ? undefined : list[to];
    const focus = focusOf(next);
    if (!focus) return;
    domEvent.preventDefault();
    focusStop(focus); // scroll-padding keeps it clear of the pinned bars
    showInPane(next);
  }

  /** Nothing focused: the first stop on screen. */
  function fromNothing(domEvent: KeyboardEvent, list: HTMLElement[]) {
    const { top, bottom } = room();
    const boxes = list.map((item) => item.getBoundingClientRect());
    const first = firstInView(boxes, top, bottom);
    const box = first === null ? undefined : boxes[first];
    const focus = first === null ? null : focusOf(list[first]);
    if (!box || !focus) return;
    domEvent.preventDefault();
    // Already on screen: no scroll (the browser would push a tall card under the bar). Below the screen (the top of the
    // page, the header taking the room): the browser brings it in.
    focus.focus({ preventScroll: box.top >= top && box.top < bottom });
    showInPane(first === null ? undefined : list[first]);
  }

  document.addEventListener("keydown", (domEvent) => {
    if (domEvent.defaultPrevented || modified(domEvent)) return;
    const target = domEvent.target instanceof Element ? domEvent.target : document.body;
    if (domEvent.key === "Enter") return onEnter(domEvent, target);
    const direction = STEPS[domEvent.key];
    if (!direction || busy(target)) return;
    const list = stops();
    const openId = hooks.openEventId();
    const at = openId ? list.findIndex((stop) => stop.dataset.eventCard === openId) : -1;
    // The details, or nothing focused while they're open (a click on the page's margin): from their event, if its card
    // is still on screen; scrolled away from it, from the first card where the visitor is looking (fromNothing).
    if (openId && (inDetails(target) || (target === document.body && at >= 0 && onScreen(list[at])))) {
      return fromDetails(domEvent, direction, list, at, inDetails(target));
    }
    const stop = target.closest<HTMLElement>("[data-event-card], [data-show-period]");
    if (stop) return fromStop(domEvent, direction, list, stop);
    if (target === document.body) fromNothing(domEvent, list);
  });
}
