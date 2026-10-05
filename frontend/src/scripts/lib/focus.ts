// Keeping the keyboard's focus through a redraw: the views draw their controls again as HTML strings (render() in
// main.ts), so the control that had the focus is a new element afterwards. It's found again by what it is.

/**
 * The control that had the focus, as a selector for the same control once it's drawn again: a filter chip, a
 * calendar day, Filtros, "Cuándo".
 */
export function focusSelector(element: Element | null): string | null {
  if (!(element instanceof HTMLElement)) return null;
  const { filter, value, day } = element.dataset;
  if (filter && value !== undefined) return `[data-filter="${CSS.escape(filter)}"][data-value="${CSS.escape(value)}"]`;
  if (day) return `[data-day="${CSS.escape(day)}"]`;
  if (element.matches("[data-open-filters]")) return "[data-open-filters]";
  if (element.matches("[data-when-open]")) return "[data-when-open]";
  return null;
}

/** Containers whose controls are re-rendered: focus goes back to the same control in the same one. */
const FOCUS_SCOPES = "#filter-sheet, #jump-bar, .toolbar, main";

/** Where to look for the re-rendered control: the open filter sheet, else where the focus was. */
export function focusScope(previous: Element | null): ParentNode {
  return document.querySelector("#filter-sheet[open]") ?? previous?.closest(FOCUS_SCOPES) ?? document;
}

/**
 * After "Limpiar": the control is gone (a chip, the empty list's button), hidden (the line under the bar, the
 * toolbar's status row) or disabled (the sheet's). The focus goes to the sheet's first chip, Filtros (in the bar at
 * the bottom), or the toolbar's first chip: controls that render() puts the focus back on when it draws them again
 * (focusSelector). The first one on screen: getClientRects, since the bar is fixed (no offsetParent).
 */
export function focusAfterClearing(control: HTMLElement) {
  const sheet = control.closest("#filter-sheet");
  const candidates = sheet
    ? [...sheet.querySelectorAll<HTMLElement>("[data-filter]")]
    : [...document.querySelectorAll<HTMLElement>("[data-open-filters], #date-filters [data-filter], #type-filters [data-filter]")];
  candidates.find((candidate) => candidate.getClientRects().length > 0)?.focus({ preventScroll: true });
}
