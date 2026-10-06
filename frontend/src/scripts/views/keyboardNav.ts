// Moving through the events with the keyboard, without clicking card after card (the owner, 5 October 2026):
//   - A card has the focus: ↑ ↓ ← → move it to the card above, below, before or after (the grid's rows on wide screens,
//     the feed's single column on phones). Enter opens its details, with its image big beside them where that works
//     (lightbox.ts); elsewhere the card's own link opens the details.
//   - The details open: Enter (on the panel itself, not on one of its buttons or links) shows the image beside them:
//     to press Enter an event was almost always just clicked (the owner, 6 Oct 2026).
//   - Nothing has the focus yet: any arrow puts it on the first card on screen, the first whose top shows below the
//     pinned bars (the owner, 6 Oct 2026: ↑ ↓ too; Page Up/Down, space and the wheel still scroll). With the details
//     open, it moves from their event instead, as in the details (a click on the page's margin drops the focus).
//   - The details are open (the side panel, or the drawer): ← → show the event before or after in the list on screen,
//     ↑ ↓ the one in the row above or below (the grid's, as from a card; the owner, 6 Oct 2026),
//     the list following (its card outlined and brought into view); Escape then leaves the focus on that card. The
//     panel swaps events in place (drawerHistory.ts), so back still returns to the list.
//   - While the side panel is open it shows the card the arrows move to, like an inbox's reading pane: the focus stays
//     in the list (so ↑ ↓ keep working there). Before, after a look at another card's image (the lightbox) or Escape
//     from it, the arrows moved through the list and the panel stayed on the first event (the owner, 5 Oct 2026).
//   - A summarized period ("Ver los 23 eventos") and a busy one's "Ver 7 más" are stops too, in the grid's order (the
//     owner, 6 Oct 2026: the arrows go on through the whole list instead of scrolling past its end). Enter opens the
//     period whole and puts the focus on its first new event (main.ts showPeriod), and the arrows go on from there.
// Never while typing (the search), in a menu (Cuándo, a pill's panel) or over something else (a sheet, the post viewer,
// the lightbox, which has ← → of its own). A card's ‹ › stay the mouse's and Tab's: ← → never mean two things.

import type { DanceEvent } from "../types";

type Box = { left: number; top: number; width: number; height: number };

const STEPS: Record<string, "left" | "right" | "up" | "down"> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
};

/**
 * The card a key moves to from card `from` (null: none that way). ← → go by reading order (the page's); ↑ ↓ to the
 * nearest row above or below, the card there closest to this one's middle. Pure, on the cards' boxes (tested).
 */
export function neighbor(boxes: Box[], from: number, direction: "left" | "right" | "up" | "down"): number | null {
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
  const row = candidates.filter(({ box }) => Math.abs(box.top - rowTop) < here.height / 2);
  row.sort((a, b) => Math.abs(a.box.left + a.box.width / 2 - middle) - Math.abs(b.box.left + b.box.width / 2 - middle));
  return row[0]?.index ?? null;
}

/**
 * The card to start on when nothing has the focus: the first (reading order) whose top shows between `top` (below the
 * pinned bars) and `bottom`; else the first still partly below `top` (a card taller than the room); null: no cards.
 * Pure, on the cards' boxes (tested). Before, a card scrolled almost out above, under the pinned bar, got the focus.
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

/** Whether the keys belong to something else: typing, a menu, a dialog over the page other than the details. */
function busy(target: Element): boolean {
  if (target.closest('input, textarea, select, [contenteditable="true"], [role="menu"], [role="dialog"]:not(#event-drawer)')) {
    return true;
  }
  // The image stage (lightbox.ts) goes with the panel: its keys are the panel's.
  return Boolean(document.querySelector("dialog[open]:not(#event-drawer):not(#lightbox)"));
}

/** In the details or the image beside them. */
const inDetails = (target: Element) => Boolean(target.closest("#event-drawer, #lightbox"));

interface Hooks {
  findEvent: (id: string) => DanceEvent | undefined;
  /** The event the details show, if they're open. */
  openEventId: () => string | null;
  /**
   * Show `event` in the open details; `card` gets the focus back when they close. `stayInList`: the focus stays on the
   * card (the panel follows it) instead of going to the details.
   */
  showEvent: (event: DanceEvent, card: HTMLAnchorElement, stayInList: boolean) => void;
  /**
   * Enter on a card (`card`) or in the open details (`card` null: the open event): the details with the image beside
   * them, where that works (true); false: nothing done (on a card, its link then opens the details).
   */
  showImage: (event: DanceEvent, card: HTMLAnchorElement | null) => boolean;
}

export function initKeyboardNav(hooks: Hooks) {
  document.addEventListener("keydown", (domEvent) => {
    if (domEvent.key === "Enter" && !domEvent.defaultPrevented && !domEvent.altKey && !domEvent.ctrlKey && !domEvent.metaKey && !domEvent.shiftKey) {
      const target = domEvent.target instanceof Element ? domEvent.target : document.body;
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
      return;
    }
    const direction = STEPS[domEvent.key];
    if (!direction || domEvent.defaultPrevented || domEvent.altKey || domEvent.ctrlKey || domEvent.metaKey || domEvent.shiftKey) {
      return;
    }
    const target = domEvent.target instanceof Element ? domEvent.target : document.body;
    if (busy(target)) return;
    const list = stops();
    const boxes = () => list.map((item) => item.getBoundingClientRect());
    const openId = hooks.openEventId();

    // The details: the event that way in the list (before or after; the row above or below). Also with nothing focused
    // while they're open (a click on the page's margin): from their event, not from the top of the screen. A period's
    // button that way gets the focus (the panel keeps its event until a card has it).
    const at = openId ? list.findIndex((stop) => stop.dataset.eventCard === openId) : -1;
    if (openId && (inDetails(target) || (target === document.body && at >= 0))) {
      const to = at < 0 ? null : neighbor(boxes(), at, direction);
      const next = to === null ? undefined : list[to];
      const event = next?.dataset.eventCard ? hooks.findEvent(next.dataset.eventCard) : undefined;
      const focus = focusOf(next);
      if (!focus || (!event && next?.dataset.eventCard)) return;
      domEvent.preventDefault();
      if (event) hooks.showEvent(event, focus as HTMLAnchorElement, false);
      else focus.focus();
      return;
    }

    // A card or a period's button: the stop that way.
    const stop = target.closest<HTMLElement>("[data-event-card], [data-show-period]");
    if (stop) {
      const from = list.indexOf(stop);
      if (from < 0) return;
      const to = neighbor(boxes(), from, direction);
      const next = to === null ? undefined : list[to];
      const focus = focusOf(next);
      if (!focus) return;
      domEvent.preventDefault();
      focus.focus(); // the browser brings it into view (scroll-padding keeps it clear of the pinned bars)
      const event = openId && next?.dataset.eventCard ? hooks.findEvent(next.dataset.eventCard) : undefined;
      if (event) hooks.showEvent(event, focus as HTMLAnchorElement, true); // the open panel follows the card
      return;
    }

    // Nothing focused yet: any arrow starts on the first stop on screen.
    if (target === document.body) {
      const { top, bottom } = room();
      const all = boxes();
      const first = firstInView(all, top, bottom);
      const focus = first === null ? null : focusOf(list[first]);
      if (!focus) return;
      domEvent.preventDefault();
      // Already on screen: no scroll (the browser would push a tall card under the bar). Below the screen (the top of
      // the page, the header taking the room): the browser brings it in.
      const shown = all[first!]!.top >= top && all[first!]!.top < bottom;
      focus.focus({ preventScroll: shown });
    }
  });
}
