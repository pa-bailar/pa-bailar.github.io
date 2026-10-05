// Event card used in the upcoming list and the calendar's day list.
// The title is a link to the event's page (open in a new tab, share, crawl); a plain click opens the details
// drawer instead (main.ts). Its ::after stretches over the whole card, so the card is one big target, its photo
// flyer included.
// Under the flyer, a row of actions like Instagram's says that it opens: "Detalles ›", Compartir and, on the
// right, Guardar. The buttons sit above the stretched link; "Detalles" opens the drawer like the card does, but
// is counted apart (data-source, lib/analytics.ts).
// A video's flyer with a clip plays it, silent, like a feed (clips.ts); a tap there turns its sound on or off
// instead of opening the details. The posts' badge ("▦ 3") opens every post announcing the event.

import type { DanceEvent, EventMedia } from "../types";
import { isVideoCover } from "../lib/mediaLabel";
import { ICONS } from "../lib/icons";
import { escapeHtml } from "../lib/dom";
import {
  cardWhenLabel,
  placeLabel,
  postCountLabel,
  priceSummary,
  stickerDate,
  stylesLabel,
  typeLabel,
} from "../lib/format";
import { eventPath, flyerUrl, mainMedia, previewUrl } from "../lib/links";
import { saveButtonHtml } from "./saveButton";

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

/** The flyer, or a video's clip over its frame (`clip`: silent, looping, loaded only when it plays: clips.ts). */
function flyerHtml(media: EventMedia, flyer: string, clip: string | null, title: string): string {
  const src = escapeHtml(flyer);
  // Exactly 4:5 fills every frame: no blurred copy needed.
  const fillsFrame = media.width && media.height && Math.abs(media.width / media.height - TALLEST) < 0.01;
  const picture = clip
    ? `<video class="event-card__flyer" src="${escapeHtml(clip)}" poster="${src}" muted loop playsinline preload="none"
        data-clip aria-label="Video de ${escapeHtml(title)}"></video>`
    : `<img class="event-card__flyer" src="${src}" alt="" loading="lazy" decoding="async" />`;
  return `
    <div class="event-card__frame">
      ${fillsFrame ? "" : `<img class="event-card__backdrop" src="${src}" alt="" loading="lazy" decoding="async" />`}
      ${picture}
    </div>`;
}

/** A clip's sound, off until tapped (clips.ts). */
const SOUND_BUTTON = `<button class="event-card__sound" type="button" data-sound aria-pressed="false"
  aria-label="Activar el sonido">${ICONS.soundOff}<span>Sin sonido</span></button>`;

/** "Detalles ›" · Compartir · · · Guardar, under the flyer. */
function actionsHtml(event: DanceEvent): string {
  const id = escapeHtml(event.id);
  const title = escapeHtml(event.title);
  return `
    <div class="event-card__actions">
      <button class="event-card__details" type="button" data-event="${id}" data-source="boton"
        aria-label="Detalles: ${title}">Detalles${ICONS.chevronRight}</button>
      <button class="event-card__share" type="button" data-share-event="${id}" data-track="compartir-tarjeta"
        aria-label="Compartir: ${title}">${ICONS.share}</button>
      ${saveButtonHtml(event)}
    </div>`;
}

function eventCardHtml(event: DanceEvent): string {
  const media = mainMedia(event);
  const flyer = flyerUrl(media);
  const ratio = flyer ? frameRatio(media) : null;
  const clip = flyer ? previewUrl(media) : null;
  const count = event.media.length;
  const postCount =
    count > 1
      ? `<button class="media-count" type="button" data-card-posts="${escapeHtml(event.id)}"
          aria-label="Ver las ${postCountLabel(count)} de este evento">${ICONS.gallery}<span>${count}</span></button>`
      : "";
  const image = flyer
    ? flyerHtml(media, flyer, clip, event.title)
    : `<div class="no-flyer" aria-hidden="true">Pa'</div>`;
  const sticker = stickerDate(event);
  const when = cardWhenLabel(event);
  const place = placeLabel(event);
  const price = priceSummary(event);
  const styles = stylesLabel(event.styles, MAX_STYLES_ON_CARD);

  return `
    <article class="event-card" data-event-card="${escapeHtml(event.id)}">
      <div class="event-card__media${clip ? " event-card__media--clip" : ""}"${ratio ? ` data-flyer-ratio="${ratio.toFixed(4)}"` : ""}>
        ${image}
        <span class="tag-type t-${escapeHtml(event.event_type)}">${typeLabel(event.event_type)}</span>
        ${postCount}
        ${clip ? SOUND_BUTTON : isVideoCover(media) ? `<span class="play-mark" aria-hidden="true">${ICONS.play}</span>` : ""}
        <span class="date-sticker${sticker.range ? " date-sticker--range" : ""}" aria-hidden="true"><b>${sticker.day}</b><small>${sticker.month}</small></span>
      </div>
      ${actionsHtml(event)}
      <div class="event-card__body">
        <p class="event-card__time">${escapeHtml(when)}</p>
        <h3 class="event-card__title">
          <a class="event-card__hit" href="${escapeHtml(eventPath(event))}" data-event="${escapeHtml(event.id)}">${escapeHtml(event.title)}</a>
        </h3>
        <p class="event-card__meta">
          <button class="event-card__account" data-account="${escapeHtml(event.account)}" aria-label="Ver solo eventos de @${escapeHtml(event.account)}">@${escapeHtml(event.account)}</button>
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
    media.style.setProperty("--flyer-ratio", media.dataset.flyerRatio!);
  });
}
