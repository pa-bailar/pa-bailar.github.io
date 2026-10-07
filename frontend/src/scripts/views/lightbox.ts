// Wide screens with a mouse: a card's image big next to its details, like Instagram's desktop view of a post (the owner,
// 5–6 October 2026: a flyer's fine print is too small on the card, and the details must stay usable beside it). The
// image on a dark stage over the list (components/Lightbox.astro), the side panel on the right, both usable: the stage
// isn't modal and stops where the panel starts.
//   - Opened together with the panel by a click on a card's image or Enter on a focused card, and next to an open panel
//     by Enter in it (main.ts, keyboardNav.ts): to press Enter, an event was almost always just clicked.
//   - Its event is the panel's. ← → go through its photos ("1/6"), then on to the event before or after, both changing
//     (keyboardNav.ts; the owner, 6 Oct 2026: with several photos, the arrows are expected to show them first); ↑ ↓ change
//     the event; ‹ › the photos with the mouse.
//   - It closes with the panel (Escape, back, the panel's ×, its own ×, a click on the dark area), whose history entry it
//     shares: no entry of its own. The focus goes back to the card, as when the panel closes.
// Phones and narrower screens never show it: the image opens the details, as before.

import type { DanceEvent, EventMedia } from "../types";
import { byId } from "../lib/dom";
import { flyerUrl } from "../lib/links";
import { PANEL_MIN_HEIGHT, PANEL_MIN_WIDTH } from "./drawerSheet";

/** Where a card's image opens the stage: a mouse (it can hover), and room for the side panel beside it. */
export const LIGHTBOX_QUERY = `(hover: hover) and (pointer: fine) and (min-width: ${PANEL_MIN_WIDTH}px) and (min-height: ${PANEL_MIN_HEIGHT}px)`;

export const lightboxMode = (): boolean => window.matchMedia(LIGHTBOX_QUERY).matches;

const stage = () => byId<HTMLDialogElement>("lightbox");

let current: { event: DanceEvent; slides: EventMedia[]; index: number } | null = null;

/** Whether the image is on show (keyboardNav.ts: its keys are the panel's). */
export const stageOpen = (): boolean => stage().open;

/** Show slide `index` (kept within the slides): its image, "2/6", the arrows at the ends hidden. */
function showSlide(index: number) {
  if (!current) return;
  const { event, slides } = current;
  current.index = Math.min(Math.max(index, 0), slides.length - 1);
  const media = slides[current.index]!;
  const image = byId<HTMLImageElement>("lightbox-image");
  image.src = flyerUrl(media) ?? "";
  image.alt = slides.length > 1 ? `${event.title}: publicación ${current.index + 1} de ${slides.length}` : event.title;
  byId("lightbox-count").textContent = slides.length > 1 ? `${current.index + 1}/${slides.length}` : "";
  stage()
    .querySelectorAll<HTMLButtonElement>("[data-lightbox-step]")
    .forEach((button) => {
      const step = Number(button.dataset.lightboxStep);
      button.hidden = slides.length < 2 || (step < 0 ? current!.index === 0 : current!.index === slides.length - 1);
    });
  const next = slides[current.index + 1];
  if (next) new Image().src = flyerUrl(next) ?? ""; // ready before it's asked for
}

/** Show `event`'s image at slide `index` (the one its card showed), opening the stage if it isn't. */
export function showStage(event: DanceEvent, index = 0) {
  const slides = event.media.filter((media) => flyerUrl(media));
  if (!slides.length) return closeStage();
  current = { event, slides, index };
  showSlide(index);
  if (stage().open) return;
  // The focus stays in the panel (its keys work there, and closing gives it back to the card): show() would move it to
  // the stage's first button.
  const active = document.activeElement;
  stage().show();
  if (active instanceof HTMLElement && active !== document.body) active.focus({ preventScroll: true });
}

/**
 * One photo on (`step` 1) or back (-1) on the stage, if it's open and has one that way: whether it moved. At the ends
 * the arrows go on to the next or previous event instead (keyboardNav.ts).
 */
export function stepStage(step: 1 | -1): boolean {
  if (!stage().open || !current) return false;
  const to = current.index + step;
  if (to < 0 || to >= current.slides.length) return false;
  showSlide(to);
  return true;
}

/** The panel moved to another event: the stage, if open, shows its image, its last photo when going back (←). */
export function followStage(event: DanceEvent, at: "first" | "last" = "first") {
  // The last of its media: showSlide keeps the index within the ones with a flyer.
  if (stage().open && current?.event.id !== event.id) showStage(event, at === "last" ? event.media.length - 1 : 0);
}

function closeStage() {
  if (stage().open) stage().close();
}

/** `closeDetails`: the stage's × and its dark area close the panel, which closes the stage (one view, one way out). */
export function initLightbox(closeDetails: () => void) {
  const element = stage();
  element.addEventListener("click", (domEvent) => {
    const target = domEvent.target as HTMLElement;
    const step = target.closest<HTMLElement>("[data-lightbox-step]");
    if (step && current) return showSlide(current.index + Number(step.dataset.lightboxStep));
    if (target.closest("[data-lightbox-close]") || target.matches("[data-lightbox-stage]")) closeDetails();
  });
  element.addEventListener("close", () => {
    current = null;
    byId<HTMLImageElement>("lightbox-image").removeAttribute("src"); // nothing of it stays in memory
  });
  // The panel closed (any way at all, or reopened as the phones' drawer on a narrower window): the stage goes with it.
  byId<HTMLDialogElement>("event-drawer").addEventListener("close", closeStage);
  window.matchMedia(LIGHTBOX_QUERY).addEventListener("change", (change) => !change.matches && closeStage());
}
