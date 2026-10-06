// Event card used in the upcoming list and the calendar's day list.
// The title is a link to the event's page (open in a new tab, share, crawl); a plain click opens the details
// drawer instead (main.ts). Its ::after stretches over the whole card, so the card is one big target, its photo
// flyer included.
// Under the flyer, a row of actions like Instagram's says that it opens: "Detalles ›", Compartir and, on the
// right, Guardar. The buttons sit above the stretched link; "Detalles" opens the drawer like the card does, but
// is counted apart (data-source, lib/analytics.ts).
// A video's flyer with a clip plays it, silent, like a feed (clips.ts): the clips have no sound, so a tap there opens
// the details like the rest of the card. Every video says "Video" in a corner, clip or not (the details play it).
// An event announced by several posts shows them as a carousel: swiped on phones, ‹ › with a mouse, "1/6" on the image
// and dots in the action row (carousel.ts). Its strip sits above the stretched link (a swipe must reach it) and opens
// the details itself (`data-event`).

import type { DanceEvent, EventMedia } from "../types";
import { isVideoCover } from "../lib/mediaLabel";
import { ICONS } from "../lib/icons";
import { escapeHtml } from "../lib/dom";
import {
  cardWhenLabel,
  placeLabel,
  priceSummary,
  stickerDate,
  stylesLabel,
  typeLabel,
} from "../lib/format";
import { accountLinkHtml } from "../lib/accountLink";
import { eventPath, flyerUrl, mainMedia, previewUrl } from "../lib/links";
import { saveButtonHtml } from "./saveButton";
import { dotStates } from "./carousel";

const MAX_STYLES_ON_CARD = 3;

function isFree(event: DanceEvent): boolean {
  return event.prices.length > 0 && event.prices.every((price) => price.amount_cop === 0);
}

// Flyers keep their shape, like Instagram's feed: anything from 4:5 (portrait) to 1.91:1 (landscape) is
// shown whole at its own shape on phones. Taller ones (stories) get a 4:5 frame, and on wider screens every
// card has the 4:5 frame so rows line up; then the flyer is fitted whole over a blurred copy of itself.
const TALLEST = 4 / 5;
const WIDEST = 1.91;

/** The flyer's frame shape (width / height) on phones, or null when its size isn't known. */
function frameRatio(media: EventMedia): number | null {
  if (!media.width || !media.height) return null;
  return Math.min(Math.max(media.width / media.height, TALLEST), WIDEST);
}

/** Whether the flyer is exactly 4:5: it fills every frame, so no blurred copy is needed around it. */
function fillsFrame(media: EventMedia): boolean {
  return Boolean(media.width && media.height && Math.abs(media.width / media.height - TALLEST) < 0.01);
}

/** The flyer, or a video's clip, over its blurred copy (`clip`: silent, looping, loaded only when it plays: clips.ts). */
function pictureHtml(flyer: string, clip: string | null, title: string, backdrop: boolean): string {
  const src = escapeHtml(flyer);
  const picture = clip
    ? `<video class="event-card__flyer" src="${escapeHtml(clip)}" poster="${src}" muted loop playsinline preload="none"
        data-clip aria-label="Video de ${escapeHtml(title)}"></video>`
    : `<img class="event-card__flyer" src="${src}" alt="" loading="lazy" decoding="async" />`;
  return `${backdrop ? `<img class="event-card__backdrop" src="${src}" alt="" loading="lazy" decoding="async" />` : ""}${picture}`;
}

function flyerHtml(media: EventMedia, flyer: string, clip: string | null, title: string): string {
  return `<div class="event-card__frame">${pictureHtml(flyer, clip, title, !fillsFrame(media))}</div>`;
}

/** The event's posts that have a flyer: the carousel's slides, in the data's order (the main post first). */
function slidesOf(event: DanceEvent): { media: EventMedia; flyer: string }[] {
  return event.media.flatMap((media) => {
    const flyer = flyerUrl(media);
    return flyer ? [{ media, flyer }] : [];
  });
}

/**
 * Several posts: a strip of slides that scrolls sideways (carousel.ts), each with its blurred copy unless it fills the
 * frame (a frame of the main post's shape on phones, 4:5 on wider screens: only a 4:5 flyer fills both), and its own
 * "Video" label. The strip opens the details (`data-event`); ‹ › for mice, "1/6" over the image.
 */
function carouselHtml(event: DanceEvent, slides: { media: EventMedia; flyer: string }[]): string {
  const id = escapeHtml(event.id);
  const title = escapeHtml(event.title);
  const count = slides.length;
  const items = slides
    .map(({ media, flyer }, index) => {
      const backdrop = !fillsFrame(media) || !fillsFrame(slides[0]!.media);
      return `<div class="carousel__slide" role="group" aria-roledescription="diapositiva" aria-label="${index + 1} de ${count}">
          ${pictureHtml(flyer, previewUrl(media), event.title, backdrop)}
          ${isVideoCover(media) ? VIDEO_MARK : ""}
        </div>`;
    })
    .join("");
  return `
    <div class="event-card__frame carousel" data-carousel data-count="${count}" data-index="0" data-event="${id}"
      role="group" aria-roledescription="carrusel" aria-label="${count} publicaciones de ${title}">${items}</div>
    <span class="carousel__count" data-carousel-count aria-hidden="true">1/${count}</span>
    <button class="carousel__step carousel__step--prev" type="button" data-carousel-step="-1" data-track="carrusel"
      aria-label="Publicación anterior" hidden>${ICONS.chevronLeft}</button>
    <button class="carousel__step carousel__step--next" type="button" data-carousel-step="1" data-track="carrusel"
      aria-label="Publicación siguiente">${ICONS.chevronRight}</button>`;
}

/** The dots in the action row: which slide is on screen (carousel.ts moves them). */
function dotsHtml(count: number): string {
  const dots = dotStates(count, 0)
    .map((state) => `<i${state === "normal" ? "" : ` class="is-${state}"`}></i>`)
    .join("");
  return `<span class="carousel__dots" data-carousel-dots aria-hidden="true">${dots}</span>`;
}

/**
 * Every video's card, playing its clip or not: a label, not a ▶ (a tap opens the details, whose Instagram button plays
 * it). The owner's call of 4 October 2026: on some videos and not others, it was confusing.
 */
const VIDEO_MARK = `<span class="video-mark" aria-hidden="true">${ICONS.video}<span>Video</span></span>`;

/** "Detalles ›" · Compartir · (the carousel's dots) · Guardar, under the flyer. */
function actionsHtml(event: DanceEvent, slides: number): string {
  const id = escapeHtml(event.id);
  const title = escapeHtml(event.title);
  return `
    <div class="event-card__actions">
      <button class="event-card__details" type="button" data-event="${id}" data-source="boton"
        aria-label="Detalles: ${title}">Detalles${ICONS.chevronRight}</button>
      <button class="event-card__share" type="button" data-share-event="${id}" data-track="compartir-tarjeta"
        aria-label="Compartir: ${title}">${ICONS.share}</button>
      ${slides > 1 ? dotsHtml(slides) : ""}
      ${saveButtonHtml(event)}
    </div>`;
}

function eventCardHtml(event: DanceEvent): string {
  const media = mainMedia(event);
  const flyer = flyerUrl(media);
  const ratio = flyer ? frameRatio(media) : null;
  const clip = flyer ? previewUrl(media) : null;
  const slides = flyer ? slidesOf(event) : [];
  const image =
    slides.length > 1
      ? carouselHtml(event, slides)
      : flyer
        ? flyerHtml(media, flyer, clip, event.title)
        : `<div class="no-flyer" aria-hidden="true">Pa'</div>`;
  const sticker = stickerDate(event);
  const when = cardWhenLabel(event);
  const place = placeLabel(event);
  const price = priceSummary(event);
  const styles = stylesLabel(event.styles, MAX_STYLES_ON_CARD);

  return `
    <article class="event-card" data-event-card="${escapeHtml(event.id)}">
      <div class="event-card__media"${ratio ? ` data-flyer-ratio="${ratio.toFixed(4)}"` : ""}>
        ${image}
        <span class="tag-type t-${escapeHtml(event.event_type)}">${typeLabel(event.event_type)}</span>
        ${slides.length <= 1 && isVideoCover(media) ? VIDEO_MARK : ""}
        <span class="date-sticker${sticker.range ? " date-sticker--range" : ""}" aria-hidden="true"><b>${sticker.day}</b><small>${sticker.month}</small></span>
      </div>
      ${actionsHtml(event, slides.length)}
      <div class="event-card__body">
        <p class="event-card__time">${escapeHtml(when)}</p>
        <h3 class="event-card__title">
          <a class="event-card__hit" href="${escapeHtml(eventPath(event))}" data-event="${escapeHtml(event.id)}">${escapeHtml(event.title)}</a>
        </h3>
        <p class="event-card__meta">
          ${accountLinkHtml(event.account, { className: "event-card__account", track: "perfil-tarjeta" })}
        </p>
        ${place ? `<p class="event-card__meta">${escapeHtml(place)}</p>` : ""}
        ${
          price || styles
            ? `<div class="event-card__foot">
          ${price ? `<span class="event-card__price${isFree(event) ? " event-card__price--free" : ""}">${escapeHtml(price)}</span>` : ""}
          ${styles ? `<span class="style-list">${escapeHtml(styles)}</span>` : ""}
        </div>`
            : ""
        }
      </div>
    </article>`;
}

export function eventCardGridHtml(events: DanceEvent[]): string {
  return `<div class="card-grid">${events.map(eventCardHtml).join("")}</div>`;
}

/**
 * Gives the cards under `root` their flyer's shape (data-flyer-ratio → --flyer-ratio), once they're in the page.
 * Set from here, not as a style="" in the HTML: the Content Security Policy blocks style attributes.
 */
export function applyFlyerRatios(root: ParentNode) {
  root.querySelectorAll<HTMLElement>("[data-flyer-ratio]").forEach((media) => {
    media.style.setProperty("--flyer-ratio", media.dataset.flyerRatio ?? "");
  });
}
