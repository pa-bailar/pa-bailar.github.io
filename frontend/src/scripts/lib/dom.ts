// Tiny DOM helpers.

export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
}

/** True when the visitor asked for less motion: animations and smooth scrolling are skipped. */
/** iOS Safari shows a control's :active look (its press, base.css) only where a touchstart listener exists. */
export function allowPressedLook() {
  document.addEventListener("touchstart", () => {}, { passive: true });
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * A plain click: the main button, no modifier key. Anything else (a middle click, ⌘ or Ctrl, Shift, Alt) asks the
 * browser for a new tab or window, so a link is left to do just that.
 */
export function isPlainClick(domEvent: MouseEvent): boolean {
  return domEvent.button === 0 && !domEvent.metaKey && !domEvent.ctrlKey && !domEvent.shiftKey && !domEvent.altKey;
}

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Escape text before putting it inside an HTML template string. */
export function escapeHtml(text: string | null | undefined): string {
  return (text ?? "").replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}
