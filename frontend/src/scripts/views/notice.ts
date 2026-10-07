// A short notice at the bottom of the screen, just above the bar there on phones, like Instagram's and Material's
// snackbars: what just happened, and one thing to do about it ("Guardado · Ver guardados": views/saveNotice.ts; the
// install reminder: installPrompt.ts). One at a time, a new one replacing the last. It goes after its seconds, but
// not while the mouse or the focus is on it (time to reach its button: WCAG 2.2.1), and at once when its button is
// used.
// The element (#notice, HomePage.astro) is a live region, always in the page and empty between notices, so screen
// readers hear each one. None over a modal (the details on phones, a sheet): the page under it is inert, so the
// notice couldn't be used, and it would sit behind them.

import { byId } from "../lib/dom";

export interface NoticeAction {
  label: string;
  run: () => void;
  /** Its clicks counted as "click-<track>" (lib/analytics.ts). */
  track?: string;
}

interface NoticeOptions {
  seconds?: number;
  /** A × to close it before its time (a long one, like the install reminder). */
  closable?: boolean;
}

const NOTICE_SECONDS = 4;

let action: NoticeAction | undefined;
let seconds = NOTICE_SECONDS;
let timer = 0;
let mouseOn = false; // a finger's tap leaves no hover behind, so only the mouse holds the notice

const notice = () => byId("notice");

export function hideNotice() {
  window.clearTimeout(timer);
  action = undefined;
  notice().replaceChildren();
}

/** Hides it after its seconds, unless the mouse or the focus is on it: then when they leave. */
function countDown() {
  window.clearTimeout(timer);
  if (mouseOn || notice().contains(document.activeElement)) return;
  timer = window.setTimeout(hideNotice, seconds * 1000);
}

function button(className: string, label: string, track?: string): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.className = className;
  element.textContent = label;
  if (track) element.dataset.track = track;
  return element;
}

/** Says `text`, with `next` as its button. Returns whether it shows: not over a modal. */
export function showNotice(text: string, next?: NoticeAction, options: NoticeOptions = {}): boolean {
  if (document.querySelector("dialog:modal")) return false;
  const words = document.createElement("span");
  words.className = "notice__text";
  words.textContent = text;
  const parts: HTMLElement[] = [words];
  if (next) parts.push(button("link-button notice__action", next.label, next.track));
  if (options.closable) {
    const close = button("icon-btn notice__close", "×");
    close.setAttribute("aria-label", "Cerrar");
    parts.push(close);
  }
  action = next;
  seconds = options.seconds ?? NOTICE_SECONDS;
  notice().replaceChildren(...parts);
  countDown();
  return true;
}

export function initNotice() {
  const element = notice();
  element.addEventListener("click", (domEvent) => {
    const target = domEvent.target as HTMLElement;
    if (target.closest(".notice__close")) return hideNotice();
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
}
