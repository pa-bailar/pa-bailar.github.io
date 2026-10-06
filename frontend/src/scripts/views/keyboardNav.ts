// Moving through the events with the keyboard, without clicking card after card (the owner, 5 October 2026):
//   - A card has the focus: ↑ ↓ ← → move it to the card above, below, before or after (the grid's rows on wide screens,
//     the feed's single column on phones); Enter opens its details (the card's own link).
//   - Nothing has the focus yet: ← → put it on the first card on screen (↑ ↓ still scroll the page).
//   - The details are open (the side panel, or the drawer): ← → show the event before or after in the list on screen,
//     the list following (its card outlined and brought into view); Escape then leaves the focus on that card. The
//     panel swaps events in place (drawerHistory.ts), so back still returns to the list.
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
  return Boolean(document.querySelector("dialog[open]:not(#event-drawer)"));
}

interface Hooks {
  findEvent: (id: string) => DanceEvent | undefined;
  /** The event the details show, if they're open. */
  openEventId: () => string | null;
  /** Show `event` in the open details; `card` gets the focus back when they close. */
  showEvent: (event: DanceEvent, card: HTMLAnchorElement) => void;
}

export function initKeyboardNav(hooks: Hooks) {
  document.addEventListener("keydown", (domEvent) => {
    const direction = STEPS[domEvent.key];
    if (!direction || domEvent.defaultPrevented || domEvent.altKey || domEvent.ctrlKey || domEvent.metaKey || domEvent.shiftKey) {
      return;
    }
    const target = domEvent.target instanceof Element ? domEvent.target : document.body;
    if (busy(target)) return;
    const list = cards();
    const openId = hooks.openEventId();

    // The details: the event before or after, in the list's order.
    if (openId && target.closest("#event-drawer") && (direction === "left" || direction === "right")) {
      const at = list.findIndex((card) => card.dataset.eventCard === openId);
      const next = at < 0 ? null : list[at + (direction === "left" ? -1 : 1)];
      const event = next && hooks.findEvent(next.dataset.eventCard ?? "");
      const link = linkOf(next ?? undefined);
      if (!event || !link) return;
      domEvent.preventDefault();
      hooks.showEvent(event, link);
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
      return;
    }

    // Nothing focused yet: ← → start on the first card on screen.
    if (target === document.body && (direction === "left" || direction === "right")) {
      const first = list.find((item) => item.getBoundingClientRect().bottom > 0) ?? list[0];
      const link = linkOf(first);
      if (!link) return;
      domEvent.preventDefault();
      link.focus();
    }
  });
}
