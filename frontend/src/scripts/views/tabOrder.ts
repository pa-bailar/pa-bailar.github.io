// Tab on the list: one stop per event (the owner, 6 Oct 2026; the whole keyboard model is in keyboardNav.ts's header).
//   - Each card is one Tab stop, its link: its own controls (Detalles, Compartir, Guardar, ‹ ›, its photos' strip, the
//     profile) leave the Tab order, again after every redraw. All of them are in the details, which Enter opens.
//   - The side panel follows the card Tab lands on, as with the arrows (a click doesn't count: its card was just
//     opened anyway).
//   - From outside the side panel and the image beside it, Tab never walks into them (Enter is the way in): they sit
//     at the page's end, and after the footer Tab went into the panel, back into the list, and round again.
//   - In the side panel: past its last control, on to the next stop in the list; Shift+Tab from its start, back to
//     the card it shows (gone from the list, unsaved in Guardados: from where it was). Option+Tab counts as Tab: it's
//     how Safari on a Mac reaches links (its plain Tab skips them, the cards included, unless "Press Tab to highlight
//     each item" is on). On Windows, Alt+Tab never reaches the page.
// Tried first and dropped: the list as one Tab stop (a roving tabindex: Tab skipped every other event, straight to the
// footer) and every control of every card (about 124 stops, and Tab disagreed with the arrows).

import { CARD_LINK, cardLink, cardOnScreen, VIEW_ON_SCREEN } from "../lib/cards";
import { settleGlides } from "../lib/glide";

interface TabHooks {
  /** The card Tab landed on shows in the side panel, where it fits (keyboardNav.ts). */
  follow: (card: HTMLElement) => void;
  /** The event the details show, if they're open. */
  openEventId: () => string | null;
  /** Its card left the list with a redraw (unsaved in Guardados): the cards that were around it (eventDrawer.ts). */
  openEventGap: () => { before?: HTMLElement; after?: HTMLElement } | null;
  /** Whether the details open as the side panel beside the list (not the phones' drawer over it). */
  readingPane: () => boolean;
}

/**
 * What in a card can take the focus besides its link: its photos' strip, ‹ ›, Detalles, Compartir, Guardar, the
 * profile. The strip has no tabindex, but Chrome lets Tab reach any box that scrolls: it's named here so it gets one.
 */
const controlsOf = (card: HTMLElement): HTMLElement[] =>
  [...card.querySelectorAll<HTMLElement>("button, a[href], [tabindex], [data-carousel]")].filter(
    (control) => !control.matches(CARD_LINK),
  );

/** What Tab can reach in `root`, in the page's order (a <details>' <summary> too: the caption's "Texto de la publicación"). */
const FOCUSABLE = "a[href], area[href], button, input, select, textarea, summary, iframe, audio[controls], video[controls], [contenteditable='true'], [tabindex]";
const focusables = (root: Element): HTMLElement[] =>
  [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (element) => element.tabIndex >= 0 && !element.matches(":disabled") && element.getClientRects().length > 0,
  );

/** The side panel, when it's open. */
const openPanel = () => document.querySelector<HTMLDialogElement>("dialog#event-drawer[open]");

export function initTabOrder(hooks: TabHooks) {
  /** Each card is one Tab stop: its own controls leave the Tab order. Again after every redraw (new cards). */
  function applyTabOrder() {
    for (const card of document.querySelectorAll<HTMLElement>(`${VIEW_ON_SCREEN} [data-event-card]`)) {
      for (const control of controlsOf(card)) control.tabIndex = -1;
    }
  }
  let pending = 0;
  const applySoon = () => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(applyTabOrder);
  };
  const redraws = new MutationObserver(applySoon);
  document.querySelectorAll('[role="tabpanel"]').forEach((view) => redraws.observe(view, { childList: true, subtree: true }));
  applyTabOrder();

  // The side panel follows the card Tab lands on.
  let tabbing = false;
  document.addEventListener(
    "keydown",
    (domEvent) => {
      tabbing = domEvent.key === "Tab";
      if (tabbing) settleGlides(); // the browser brings the next stop into view from its place, not its way there
    },
    true,
  );
  document.addEventListener("pointerdown", () => (tabbing = false), true);
  document.addEventListener("focusin", (domEvent) => {
    if (!tabbing) return;
    tabbing = false;
    const link = domEvent.target instanceof Element ? domEvent.target.closest(CARD_LINK) : null;
    const card = link?.closest<HTMLElement>(`${VIEW_ON_SCREEN} [data-event-card]`);
    if (card) hooks.follow(card);
  });

  // From outside the panel and the image beside it, Tab never walks into them: their controls leave the Tab order for
  // this one press (the browser picks the next stop after the keydown).
  document.addEventListener(
    "keydown",
    (domEvent) => {
      if (domEvent.key !== "Tab" || !hooks.readingPane()) return;
      const target = domEvent.target instanceof Element ? domEvent.target : null;
      const asides = [...document.querySelectorAll<HTMLDialogElement>("#event-drawer[open], #lightbox[open]")];
      if (!asides.length || asides.some((aside) => target && aside.contains(target))) return;
      const skipped = asides.flatMap((aside) => focusables(aside)).map((element) => [element, element.getAttribute("tabindex")] as const);
      for (const [element] of skipped) element.tabIndex = -1;
      setTimeout(() => {
        for (const [element, tabindex] of skipped) {
          if (tabindex === null) element.removeAttribute("tabindex");
          else element.setAttribute("tabindex", tabindex);
        }
      });
    },
    true,
  );

  // In the side panel: past its last control, on to the next stop in the list (the panel sits at the page's end);
  // Shift+Tab from its start, back to the card it shows. Its card gone from the list (unsaved in Guardados), from
  // where it was: on to the card that took its place, back to the stop before it (the bug hunt of 7 Oct 2026: Tab left
  // the page, and Shift+Tab walked the footer).
  document.addEventListener("keydown", (domEvent) => {
    if (domEvent.key !== "Tab" || domEvent.ctrlKey || domEvent.metaKey) return;
    const panel = openPanel();
    const target = domEvent.target instanceof HTMLElement ? domEvent.target : null;
    if (!panel || !target || !panel.contains(target) || !hooks.readingPane()) return;
    const inPanel = focusables(panel);
    const first = inPanel[0];
    const atStart = !first || first === target || Boolean(first.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_PRECEDING);
    if (domEvent.shiftKey ? !atStart : target !== inPanel.at(-1)) return;
    const openId = hooks.openEventId();
    const link = cardLink(openId ? cardOnScreen(openId) : null);
    const gap = link ? null : hooks.openEventGap();
    if (!link && !gap) return;
    const view = document.querySelector(VIEW_ON_SCREEN);
    const inList = view ? focusables(view) : [];
    // Where the event is among the list's stops: its card's link, or (its card gone) where that was, before the card
    // that took its place.
    const after = cardLink(gap?.after);
    const before = cardLink(gap?.before);
    const at = link ? inList.indexOf(link) : after ? inList.indexOf(after) : before ? inList.indexOf(before) + 1 : 0;
    const to = domEvent.shiftKey
      ? (link ?? inList[at - 1])
      : (inList[link ? at + 1 : at] ?? focusables(document.querySelector("footer") ?? document.body)[0]);
    if (!to) return;
    domEvent.preventDefault();
    to.focus();
  });
}
