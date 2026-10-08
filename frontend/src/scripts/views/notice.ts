// A short notice at the bottom of the screen, just above the bar there on phones, like Instagram's and Material's
// snackbars: what just happened, and one thing to do about it ("Guardado · Ver guardados": views/saveNotice.ts; the
// install reminder: installPrompt.ts). One at a time, a new one replacing the last. It goes after its seconds, but
// not while the mouse or the focus is on it (time to reach its button: WCAG 2.2.1), and at once when its button is
// used. An undo ("Deshacer") is also Ctrl+Z (⌘Z), the keyboard's way to it: the notice is far in Tab's order, and the
// focus stays where the visitor is (taking it to the notice would be a surprise, like Angular Material's advice).
// The element (#notice, Notice.astro: the home page and an event's own page) is a live region, always in the page
// and empty between notices, so screen readers hear each one. None over a modal (the details on phones, a sheet):
// the page under it is inert, so the notice couldn't be used, and it would sit behind them.

import { byId } from "../lib/dom";

export interface NoticeAction {
  label: string;
  run: () => void;
  /** Its clicks counted as "click-<track>" (lib/analytics.ts). */
  track?: string;
  /** An undo ("Deshacer"): Ctrl+Z (⌘Z on a Mac) does it too, while the notice is up. */
  undo?: boolean;
}

interface NoticeOptions {
  seconds?: number;
  /** A × to close it before its time (a long one, like the install reminder). */
  closable?: boolean;
}

const NOTICE_SECONDS = 4;
/** An undo's keys, as aria-keyshortcuts says them (Meta: ⌘ on a Mac). */
const UNDO_KEYS = "Control+Z Meta+Z";

let action: NoticeAction | undefined;
let seconds = NOTICE_SECONDS;
let timer = 0;
let mouseOn = false; // a finger's tap leaves no hover behind, so only the mouse holds the notice
let shown = 0; // the notice on screen, by number (0: none)
let count = 0;

const notice = () => byId("notice");

/** Hides the notice; given `which` (what showNotice returned), only if that one is still on screen. */
export function hideNotice(which?: number) {
  if (which !== undefined && which !== shown) return;
  window.clearTimeout(timer);
  action = undefined;
  shown = 0;
  // Empty, nothing of it is under the mouse (no pointer events: notice.css). WebKit sends no pointerleave when the
  // button under the mouse goes (its own click), and the next notices waited for the mouse forever (the bug hunt of 7
  // Oct 2026).
  mouseOn = false;
  notice().replaceChildren();
}

/** Hides it after its seconds, unless the mouse or the focus is on it: then when they leave. */
function countDown() {
  window.clearTimeout(timer);
  if (mouseOn || notice().contains(document.activeElement)) return;
  timer = window.setTimeout(() => hideNotice(), seconds * 1000);
}

function button(className: string, label: string, track?: string): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.className = className;
  element.textContent = label;
  if (track) element.dataset.track = track;
  return element;
}

/** Whether a notice can show now: not over a modal, whose page underneath is inert. */
export const canShowNotice = () => !document.querySelector("dialog:modal");

/** Says `text`, with `next` as its button. Returns its number (for hideNotice), or 0 if it can't show: over a modal. */
export function showNotice(text: string, next?: NoticeAction, options: NoticeOptions = {}): number {
  if (!canShowNotice()) return 0;
  const words = document.createElement("span");
  words.className = "notice__text";
  words.textContent = text;
  const parts: HTMLElement[] = [words];
  if (next) {
    const use = button("link-button notice__action", next.label, next.track);
    if (next.undo) use.setAttribute("aria-keyshortcuts", UNDO_KEYS);
    parts.push(use);
  }
  if (options.closable) {
    const close = button("icon-btn notice__close", "×");
    close.setAttribute("aria-label", "Cerrar");
    parts.push(close);
  }
  action = next;
  seconds = options.seconds ?? NOTICE_SECONDS;
  shown = ++count;
  notice().replaceChildren(...parts);
  countDown();
  return shown;
}

export function initNotice() {
  const element = notice();
  element.addEventListener("click", (domEvent) => {
    const target = domEvent.target as HTMLElement;
    if (target.closest(".notice__close")) return void hideNotice();
    if (!target.closest(".notice__action")) return;
    const chosen = action;
    hideNotice();
    chosen?.run();
  });
  element.addEventListener("pointerenter", (domEvent) => {
    if (domEvent.pointerType !== "mouse") return;
    mouseOn = true;
    window.clearTimeout(timer);
  });
  element.addEventListener("pointerleave", (domEvent) => {
    if (domEvent.pointerType !== "mouse") return;
    mouseOn = false;
    if (element.hasChildNodes()) countDown();
  });
  element.addEventListener("focusin", () => window.clearTimeout(timer));
  element.addEventListener("focusout", (domEvent) => {
    if (element.hasChildNodes() && !element.contains(domEvent.relatedTarget as Node | null)) countDown();
  });
  // Ctrl+Z (⌘Z) while an undo is up, as in Gmail or Drive: from the details' Guardado its button was 14 Shift+Tabs
  // away, and gone after 4 seconds (the bug hunt of 7 Oct 2026). As its click (counted, then gone). Not while typing
  // (the field's own undo), nor under a modal.
  document.addEventListener("keydown", (domEvent) => {
    const { ctrlKey, metaKey, shiftKey, altKey, key } = domEvent;
    const undoKeys = (ctrlKey || metaKey) && !shiftKey && !altKey && key.toLowerCase() === "z";
    const typing = (domEvent.target as Element | null)?.closest?.("input, textarea, select, [contenteditable='true']");
    if (!action?.undo || !undoKeys || typing || !canShowNotice()) return;
    domEvent.preventDefault();
    element.querySelector<HTMLButtonElement>(".notice__action")?.click();
  });
}
