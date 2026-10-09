// Keeping the keyboard's focus through a redraw: the views draw their controls again as HTML strings (render() in
// main.ts), so the control that had the focus is a new element afterwards. It's found again by what it is.

import { CARD_LINK } from "./cards";

/**
 * The control that had the focus, as a selector for the same control once it's drawn again: a filter chip, a
 * calendar day, Filtros, "Cuándo" (and its options), a pill of the toolbar, an event's card (its link, the card's
 * one Tab stop: Ctrl+Z in Guardados drew the cards again, and the focus fell to the page; the bug-squash pass of 8 Oct
 * 2026).
 */
export function focusSelector(element: Element | null): string | null {
  if (!(element instanceof HTMLElement)) return null;
  const { filter, value, day, pill, when, event } = element.dataset;
  if (filter && value !== undefined) return `[data-filter="${CSS.escape(filter)}"][data-value="${CSS.escape(value)}"]`;
  if (day) return `[data-day="${CSS.escape(day)}"]`;
  if (pill) return `[data-pill="${CSS.escape(pill)}"]`;
  if (when !== undefined) return `[data-when="${CSS.escape(when)}"]`;
  if (event && element.matches(CARD_LINK)) return `${CARD_LINK}[data-event="${CSS.escape(event)}"]`;
  if (element.matches("[data-open-filters]")) return "[data-open-filters]";
  if (element.matches("[data-when-open]")) return "[data-when-open]";
  if (element.matches("[data-saved-paste]")) return "[data-saved-paste]";
  if (element.matches("[data-saved-copy]")) return "[data-saved-copy]";
  return null;
}

/**
 * The control `selector` names (focusSelector), drawn again: the focus back on the first one laid out in `scope` (the
 * same choice can be in a closed panel and among the removable chips), without scrolling. Where the page stands is the
 * views' to keep (restoreListPosition, revealDay): a chip in a pinned bar sits under the scroll padding the bar keeps,
 * and focusing it scrolled the page up to the bar's own place, the list's top (the bug-squash pass of 8 Oct 2026: a
 * type chosen in the phone's bar mid-list, on Android, where a tapped button takes the focus).
 */
export function refocus(selector: string | null, scope: ParentNode) {
  if (!selector) return;
  const control = [...scope.querySelectorAll<HTMLElement>(selector)].find((element) => element.getClientRects().length);
  control?.focus({ preventScroll: true });
}

/**
 * Containers whose controls are re-rendered: focus goes back to the same control in the same one. A view is one (an
 * event's card only gets the focus back in the view it was in: back or forward to another view leaves it).
 */
const FOCUS_SCOPES = '#filter-sheet, #jump-bar, .toolbar, [role="tabpanel"], main';

/** Where to look for the re-rendered control: the open filter sheet, else where the focus was. */
export function focusScope(previous: Element | null): ParentNode {
  return document.querySelector("#filter-sheet[open]") ?? previous?.closest(FOCUS_SCOPES) ?? document;
}

/**
 * After "Limpiar": the control is gone (a chip, the empty list's button), hidden (the line under the bar, the
 * toolbar's status row) or disabled (the sheet's). The focus goes to the sheet's first control (the bars' switch),
 * Filtros (in the bar at the bottom), or the toolbar's first pill: controls that render() puts the focus back on when
 * it draws them again (focusSelector). The first one on screen: getClientRects, since the bar is fixed (no offsetParent).
 */
export function focusAfterClearing(control: HTMLElement) {
  const sheet = control.closest("#filter-sheet");
  const candidates = sheet
    ? [...sheet.querySelectorAll<HTMLElement>("[data-filter]")]
    : [...document.querySelectorAll<HTMLElement>("[data-open-filters], [data-pill]")];
  candidates.find((candidate) => candidate.getClientRects().length > 0)?.focus({ preventScroll: true });
}
