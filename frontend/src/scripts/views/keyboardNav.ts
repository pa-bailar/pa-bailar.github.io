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
//   - Tab: one stop per event (the owner, 6 Oct 2026). Tab walks the list in its reading order, the same as →: each
//     card once (the card itself), the periods' Compartir and "Ver N más" / month blocks where they are; Shift+Tab goes
//     back like ←. A card's own controls (Detalles, Compartir, Guardar, ‹ ›, its photos' strip, the profile) are out
//     of the Tab order: all of them are in the details, which Enter opens. The side panel follows the card Tab lands
//     on, as with the arrows; in it, Tab goes through its controls, and past the last one on to the next stop in the
//     list; Shift+Tab from its start goes back to the card it shows. Tried first and dropped: the list as one Tab stop
//     (a roving tabindex: Tab skipped every other event, straight to the footer) and every control of every card
//     (about 124 stops, and Tab disagreed with the arrows).
// Never while typing (the search), in a menu (Cuándo, a pill's panel) or over something else (a sheet, the post viewer,
// the lightbox, which has ← → of its own). A card's ‹ › stay the mouse's and Tab's: ← → never mean two things.

import { settleGlides } from "../lib/glide";
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

/** Whether any of `stop` shows in the room the pinned bars leave: a card in focus there is where the visitor is. */
function inSight(stop: HTMLElement): boolean {
  const { top, bottom } = room();
  const box = stop.getBoundingClientRect();
  return box.bottom > top && box.top < bottom;
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

/** What the keys can act on, when focused: anything else focused (a heading, <main>) is a place, not a control. */
const CONTROL = "a[href], button, input, select, textarea, summary, [contenteditable='true'], [role='button'], [role='tab']";

/**
 * Nothing focused that the keys belong to: the page itself, or a place the focus was moved to that isn't a control
 * (<main>, after "Saltar a los eventos"; a period's heading). The arrows then start where the visitor is looking, as
 * from the page (the bug-squash pass, 6 Oct 2026: with <main> focused they did nothing).
 */
const onNothing = (target: Element) => target === document.body || !target.matches(CONTROL);

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

/**
 * What in a card can take the focus besides its link: its photos' strip, ‹ ›, Detalles, Compartir, Guardar, the
 * profile. The strip has no tabindex, but Chrome lets Tab reach any box that scrolls: it's named here so it gets one.
 */
const controlsOf = (card: HTMLElement): HTMLElement[] =>
  [...card.querySelectorAll<HTMLElement>("button, a[href], [tabindex], [data-carousel]")].filter(
    (control) => !control.matches("a.event-card__hit"),
  );

/** What Tab can reach in `root`, in the page's order (a <details>' <summary> too: the caption's "Texto de la publicación"). */
const FOCUSABLE = "a[href], area[href], button, input, select, textarea, summary, iframe, audio[controls], video[controls], [contenteditable='true'], [tabindex]";
const focusables = (root: Element): HTMLElement[] =>
  [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (element) => element.tabIndex >= 0 && !element.matches(":disabled") && element.getClientRects().length > 0,
  );

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
    // The side panel follows it, as after an arrow: else it stayed on the event before, and the next → skipped the
    // first new one.
    if (target.closest("[data-show-period]")) {
      requestAnimationFrame(() => {
        const card = document.activeElement?.closest<HTMLElement>("[data-event-card]") ?? undefined;
        card?.scrollIntoView({ block: "nearest" });
        showInPane(card);
      });
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
    if (!event || !link || hooks.openEventId() === event.id) return;
    if (hooks.openEventId() || hooks.readingPane()) hooks.showEvent(event, link, { stayInList: true });
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
    // The page still gliding aside for the panel (its first arrow opened it): the cards' places, not their way there.
    settleGlides();
    const list = stops();
    const openId = hooks.openEventId();
    const at = openId ? list.findIndex((stop) => stop.dataset.eventCard === openId) : -1;
    // The details, or nothing focused while they're open (a click on the page's margin): from their event, if its card
    // is still on screen; scrolled away from it, from the first card where the visitor is looking (fromNothing).
    if (openId && (inDetails(target) || (onNothing(target) && at >= 0 && onScreen(list[at])))) {
      return fromDetails(domEvent, direction, list, at, inDetails(target));
    }
    // A card or a block in focus: from it, while any of it is in sight; scrolled away from it (the wheel, Page Down),
    // from the first one where the visitor is looking, as from the details (DESIGN.md, the keyboard).
    const stop = target.closest<HTMLElement>("[data-event-card], [data-show-period]");
    if (stop && inSight(stop)) return fromStop(domEvent, direction, list, stop);
    if (stop || onNothing(target)) fromNothing(domEvent, list);
  });

  // ---------- Tab: one stop per event (see the header) ----------

  /** Each card is one Tab stop: its own controls leave the Tab order. Again after every redraw (new cards). */
  function applyTabOrder() {
    for (const card of document.querySelectorAll<HTMLElement>(`${VIEW} [data-event-card]`)) {
      for (const control of controlsOf(card)) control.tabIndex = -1;
    }
  }
  let pending = 0;
  const applySoon = () => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(applyTabOrder);
  };
  const redraws = new MutationObserver(applySoon);
  document.querySelectorAll('[role="tabpanel"]').forEach((view) => redraws.observe(view, { childList: true, subtree: true }));
  applyTabOrder();

  // The side panel follows the card Tab lands on (a click doesn't count: its card was just opened anyway).
  let tabbing = false;
  document.addEventListener("keydown", (domEvent) => (tabbing = domEvent.key === "Tab"), true);
  document.addEventListener("pointerdown", () => (tabbing = false), true);
  document.addEventListener("focusin", (domEvent) => {
    if (!tabbing) return;
    tabbing = false;
    const link = domEvent.target instanceof Element ? domEvent.target.closest("a.event-card__hit") : null;
    const card = link?.closest<HTMLElement>(`${VIEW} [data-event-card]`);
    if (card) showInPane(card);
  });

  // The side panel and the image beside it sit at the page's end: from outside them, Tab never walks into them (Enter
  // is the way in), or after the footer Tab went into the panel, back into the list, and round again. Their controls
  // leave the Tab order for this one press (the browser picks the next stop after the keydown).
  document.addEventListener(
    "keydown",
    (domEvent) => {
      if (domEvent.key !== "Tab" || !hooks.readingPane()) return;
      const target = domEvent.target instanceof Element ? domEvent.target : null;
      const asides = [...document.querySelectorAll<HTMLDialogElement>("#event-drawer[open], #lightbox[open]")];
      if (!asides.length || asides.some((aside) => target && aside.contains(target))) return;
      const skipped = asides.flatMap((aside) => focusables(aside)).map((element) => [element, element.getAttribute("tabindex")] as const);
      for (const [element] of skipped) element.tabIndex = -1;
      setTimeout(() => {
        for (const [element, tabindex] of skipped) {
          if (tabindex === null) element.removeAttribute("tabindex");
          else element.setAttribute("tabindex", tabindex);
        }
      });
    },
    true,
  );

  // In the side panel: past its last control, on to the next stop in the list (the panel sits at the page's end);
  // Shift+Tab from its start, back to the card it shows.
  // Option+Tab counts as Tab: it's how Safari on a Mac reaches links (its plain Tab skips them, the cards included,
  // unless "Press Tab to highlight each item" is on). On Windows, Alt+Tab never reaches the page.
  document.addEventListener("keydown", (domEvent) => {
    if (domEvent.key !== "Tab" || domEvent.ctrlKey || domEvent.metaKey) return;
    const panel = document.getElementById("event-drawer") as HTMLDialogElement | null;
    const target = domEvent.target instanceof HTMLElement ? domEvent.target : null;
    if (!panel?.open || !target || !panel.contains(target) || !hooks.readingPane()) return;
    const shown = document.querySelector<HTMLElement>(`${VIEW} [data-event-card="${CSS.escape(hooks.openEventId() ?? "")}"]`);
    const link = linkOf(shown ?? undefined);
    if (!link) return;
    const inPanel = focusables(panel);
    if (domEvent.shiftKey) {
      const first = inPanel[0];
      const atStart = !first || first === target || Boolean(first.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_PRECEDING);
      if (!atStart) return;
      domEvent.preventDefault();
      link.focus();
      return;
    }
    if (target !== inPanel.at(-1)) return;
    const view = document.querySelector(VIEW);
    const inList = view ? focusables(view) : [];
    const next = inList[inList.indexOf(link) + 1] ?? focusables(document.querySelector("footer") ?? document.body)[0];
    if (!next) return;
    domEvent.preventDefault();
    next.focus();
  });
}
