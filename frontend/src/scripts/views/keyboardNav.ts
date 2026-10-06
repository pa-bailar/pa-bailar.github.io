// Moving through the events with the keyboard, without clicking card after card (the owner, 5 October 2026):
//   - A card has the focus: ↑ ↓ ← → move it to the card above, below, before or after (the grid's rows on wide screens,
//     the feed's single column on phones). Enter opens its details, with its image big beside them where that works
//     (lightbox.ts); elsewhere the card's own link opens the details.
//   - The details open: Enter (on the panel itself, not on one of its buttons or links) shows the image beside them:
//     to press Enter an event was almost always just clicked (the owner, 6 Oct 2026).
//   - Nothing has the focus yet: any arrow puts it on the first card on screen (the owner, 6 Oct 2026: ↑ ↓ too; Page
//     Up/Down, space and the wheel still scroll).
//   - The details are open (the side panel, or the drawer): ← → show the event before or after in the list on screen,
//     ↑ ↓ the one in the row above or below (the grid's, as from a card; the owner, 6 Oct 2026),
//     the list following (its card outlined and brought into view); Escape then leaves the focus on that card. The
//     panel swaps events in place (drawerHistory.ts), so back still returns to the list.
//   - While the side panel is open it shows the card the arrows move to, like an inbox's reading pane: the focus stays
//     in the list (so ↑ ↓ keep working there). Before, after a look at another card's image (the lightbox) or Escape
//     from it, the arrows moved through the list and the panel stayed on the first event (the owner, 5 Oct 2026).
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

/** The cards of the view on screen, in reading order, that are laid out (a summarized period has none). */
function cards(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[role="tabpanel"]:not([hidden]) [data-event-card]')].filter(
    (card) => card.getClientRects().length > 0,
  );
}

const linkOf = (card: Element | undefined) => card?.querySelector<HTMLAnchorElement>("a.event-card__hit") ?? null;

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
      return;
    }
    const direction = STEPS[domEvent.key];
    if (!direction || domEvent.defaultPrevented || domEvent.altKey || domEvent.ctrlKey || domEvent.metaKey || domEvent.shiftKey) {
      return;
    }
    const target = domEvent.target instanceof Element ? domEvent.target : document.body;
    if (busy(target)) return;
    const list = cards();
    const openId = hooks.openEventId();

    // The details: the event that way in the list (before or after; the row above or below).
    if (openId && inDetails(target)) {
      const at = list.findIndex((card) => card.dataset.eventCard === openId);
      const to = at < 0 ? null : neighbor(list.map((item) => item.getBoundingClientRect()), at, direction);
      const next = to === null ? null : list[to];
      const event = next && hooks.findEvent(next.dataset.eventCard ?? "");
      const link = linkOf(next ?? undefined);
      if (!event || !link) return;
      domEvent.preventDefault();
      hooks.showEvent(event, link, false);
      return;
    }

    // A card: the one that way.
    const card = target.closest<HTMLElement>("[data-event-card]");
    if (card) {
      const from = list.indexOf(card);
      if (from < 0) return;
      const to = neighbor(list.map((item) => item.getBoundingClientRect()), from, direction);
      const link = to === null ? null : linkOf(list[to]);
      if (!link) return;
      domEvent.preventDefault();
      link.focus(); // the browser brings it into view (scroll-padding keeps it clear of the pinned bars)
      const event = openId && hooks.findEvent(list[to!]?.dataset.eventCard ?? "");
      if (event) hooks.showEvent(event, link, true); // the open panel follows the card
      return;
    }

    // Nothing focused yet: any arrow starts on the first card on screen.
    if (target === document.body) {
      const first = list.find((item) => item.getBoundingClientRect().bottom > 0) ?? list[0];
      const link = linkOf(first);
      if (!link) return;
      domEvent.preventDefault();
      link.focus();
    }
  });
}
