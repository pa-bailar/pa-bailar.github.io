// A card's image, bigger (components/Lightbox.astro): only on wide screens with a mouse (`lightboxMode`), where a
// click on a card's image opens it (main.ts); elsewhere that click opens the details, as before. The event's posts with
// a flyer, one at a time: ‹ › and ← → between them, "1/6". "Detalles" opens the side panel on the post on screen. It's
// a panel sheet for the history and the ways out (lib/sheet.ts): back, Escape, ×, a click outside the image; the page
// stays where it was and the focus goes back to the card.

import type { DanceEvent, EventMedia } from "../types";
import { byId } from "../lib/dom";
import { flyerUrl } from "../lib/links";
import { dismissSheet, initPanelSheet, openPanelSheet } from "../lib/sheet";

/** Where a click on a card's image opens the lightbox: a mouse (it can hover), and room for the side panel. */
const LIGHTBOX_QUERY = "(hover: hover) and (pointer: fine) and (min-width: 900px) and (min-height: 600px)";

export const lightboxMode = (): boolean => window.matchMedia(LIGHTBOX_QUERY).matches;

const dialog = () => byId<HTMLDialogElement>("lightbox");

let current: { event: DanceEvent; slides: EventMedia[]; index: number; card: HTMLElement | null } | null = null;

/** Show slide `index` (kept within the slides): its image, "2/6", the arrows at the ends hidden. */
function show(index: number) {
  if (!current) return;
  const { event, slides } = current;
  current.index = Math.min(Math.max(index, 0), slides.length - 1);
  const media = slides[current.index]!;
  const image = byId<HTMLImageElement>("lightbox-image");
  image.src = flyerUrl(media) ?? "";
  image.alt = slides.length > 1 ? `${event.title}: publicación ${current.index + 1} de ${slides.length}` : event.title;
  byId("lightbox-count").textContent = slides.length > 1 ? `${current.index + 1}/${slides.length}` : "";
  dialog().querySelectorAll<HTMLButtonElement>("[data-lightbox-step]").forEach((button) => {
    const step = Number(button.dataset.lightboxStep);
    button.hidden = slides.length < 2 || (step < 0 ? current!.index === 0 : current!.index === slides.length - 1);
  });
  // The next one is ready before it's asked for.
  const next = slides[current.index + 1];
  if (next) new Image().src = flyerUrl(next) ?? "";
}

/** Open `event`'s posts at slide `index` (the one its card showed). `card`: the focus goes back to it. */
export function openLightbox(event: DanceEvent, index: number, card: HTMLElement | null) {
  const slides = event.media.filter((media) => flyerUrl(media));
  if (!slides.length) return;
  current = { event, slides, index, card };
  byId("lightbox-title").textContent = event.title;
  show(index);
  openPanelSheet(dialog());
}

/**
 * `openDetails(event, selected, card)`: "Detalles" opens the side panel on the post on screen; it opens first, then the
 * lightbox closes at once (its entry stays under the details', a dead step that back passes over: lib/sheet.ts).
 */
export function initLightbox(openDetails: (event: DanceEvent, selected: number, card: HTMLElement | null) => void) {
  const element = dialog();
  initPanelSheet(element, (target) => {
    if (!current) return;
    const step = target.closest<HTMLElement>("[data-lightbox-step]");
    if (step) return show(current.index + Number(step.dataset.lightboxStep));
    if (target.closest("[data-lightbox-details]")) {
      const { event, slides, index, card } = current;
      openDetails(event, event.media.indexOf(slides[index]!), card);
      dismissSheet(element, { instant: true });
      return;
    }
    if (target.matches("[data-lightbox-stage]")) dismissSheet(element); // the dark area around the image
  });
  element.addEventListener("keydown", (domEvent) => {
    if (!current || (domEvent.key !== "ArrowLeft" && domEvent.key !== "ArrowRight")) return;
    domEvent.preventDefault();
    show(current.index + (domEvent.key === "ArrowLeft" ? -1 : 1));
  });
  element.addEventListener("close", () => {
    const card = current?.card;
    current = null;
    byId<HTMLImageElement>("lightbox-image").removeAttribute("src"); // nothing of it stays in memory
    // After the browser's own focus handling: the focus is then nowhere, or still on a button of the closed lightbox.
    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (card?.isConnected && (!active || active === document.body || element.contains(active))) {
        card.focus({ preventScroll: true });
      }
    });
  });
}
