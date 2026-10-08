// Finding the event cards on the page (eventCard.ts draws them): the view on screen (Próximos, Calendario or
// Guardados; the hidden ones keep their old cards), a card's link (its title: it opens the details, and it's the
// card's one Tab stop), an event's card where the visitor sees it, and where a card was once a redraw took it away.

/** The view on screen. The others are only hidden, cards and all: a search that skips this finds those. */
export const VIEW_ON_SCREEN = '[role="tabpanel"]:not([hidden])';

/** A card's link: its title. */
export const CARD_LINK = "a.event-card__hit";

/** The link of the card `element` is in (or is), if any. */
export function cardLink(element: Element | null | undefined): HTMLAnchorElement | null {
  return element?.closest("[data-event-card]")?.querySelector<HTMLAnchorElement>(CARD_LINK) ?? null;
}

/** The event's card in the view on screen, laid out (a period folded away hides it). */
export function cardOnScreen(id: string): HTMLElement | undefined {
  const cards = document.querySelectorAll<HTMLElement>(`${VIEW_ON_SCREEN} [data-event-card="${CSS.escape(id)}"]`);
  return [...cards].find((card) => card.getClientRects().length > 0);
}

/** The cards of the view on screen, laid out, in reading order. */
export function cardsOnScreen(): HTMLElement[] {
  const cards = document.querySelectorAll<HTMLElement>(`${VIEW_ON_SCREEN} [data-event-card]`);
  return [...cards].filter((card) => card.getClientRects().length > 0);
}

/** Where a card is in the list, by the events of the cards around it (the views draw new cards: ids last). */
export interface CardPlace {
  before: string | null;
  after: string | null;
}

/** Where the event `id` is among the list's events `ids`, in order; null if it isn't there. Pure (tested). */
export function placeAmong(ids: string[], id: string): CardPlace | null {
  const at = ids.indexOf(id);
  return at < 0 ? null : { before: ids[at - 1] ?? null, after: ids[at + 1] ?? null };
}

/**
 * The event whose card stands in for one that left the list (unsaved in Guardados) at `place`: the one that took its
 * place, or the one before it at the list's end; null if neither is still on screen (`shown`). Pure (tested).
 */
export function standIn(place: CardPlace | null, shown: (id: string) => boolean): string | null {
  for (const id of [place?.after, place?.before]) if (id && shown(id)) return id;
  return null;
}
