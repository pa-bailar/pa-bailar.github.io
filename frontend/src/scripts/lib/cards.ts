// Finding the event cards on the page (eventCard.ts draws them): the view on screen (Próximos, Calendario or
// Guardados; the hidden ones keep their old cards), a card's link (its title: it opens the details, and it's the
// card's one Tab stop), and an event's card where the visitor sees it.

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
