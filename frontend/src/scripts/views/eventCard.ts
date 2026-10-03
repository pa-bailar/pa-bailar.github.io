// Event card used in the upcoming list and the calendar's day list.
// The title is a link to the event's page (open in a new tab, share, crawl); a plain click opens the
// viewer instead (main.ts). Its ::after stretches over the whole card, so the card is one big target.

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
import { eventPath, flyerUrl, mainMedia } from "../lib/links";
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

function flyerHtml(media: EventMedia, flyer: string): string {
  const src = escapeHtml(flyer);
  // Exactly 4:5 fills every frame: no blurred copy needed.
  const fillsFrame = media.width && media.height && Math.abs(media.width / media.height - TALLEST) < 0.01;
  return `
    <div class="event-card__frame">
      ${fillsFrame ? "" : `<img class="event-card__backdrop" src="${src}" alt="" loading="lazy" decoding="async" />`}
      <img class="event-card__flyer" src="${src}" alt="" loading="lazy" decoding="async" />
    </div>`;
}

function eventCardHtml(event: DanceEvent): string {
  const media = mainMedia(event);
  const flyer = flyerUrl(media);
  const ratio = flyer ? frameRatio(media) : null;
  const postCount =
    event.media.length > 1 ? `<span class="media-count">${postCountLabel(event.media.length)}</span>` : "";
  const image = flyer
    ? flyerHtml(media, flyer)
    : `<div class="no-flyer" aria-hidden="true">Pa'</div>`;
  const sticker = stickerDate(event.date);
  const when = cardWhenLabel(event);
  const place = placeLabel(event);
  const price = priceSummary(event);
  const styles = stylesLabel(event.styles, MAX_STYLES_ON_CARD);

  return `
    <article class="event-card">
      <div class="event-card__media"${ratio ? ` data-flyer-ratio="${ratio.toFixed(4)}"` : ""}>
        ${image}
        <span class="tag-type t-${escapeHtml(event.event_type)}">${typeLabel(event.event_type)}</span>
        ${postCount}
        ${isVideoCover(media) ? `<span class="play-mark" aria-hidden="true">${ICONS.play}</span>` : ""}
        <span class="date-sticker" aria-hidden="true"><b>${sticker.day}</b><small>${sticker.month}</small></span>
      </div>
      <div class="event-card__body">
        <p class="event-card__time">${escapeHtml(when)}</p>
        <h3 class="event-card__title">
          <a class="event-card__hit" href="${escapeHtml(eventPath(event))}" data-event="${escapeHtml(event.id)}">${escapeHtml(event.title)}</a>
        </h3>
        <p class="event-card__meta">
          <button class="event-card__account" data-account="${escapeHtml(event.account)}" aria-label="Ver solo eventos de @${escapeHtml(event.account)}">@${escapeHtml(event.account)}</button>
        </p>
        ${place ? `<p class="event-card__meta">${escapeHtml(place)}</p>` : ""}
        <div class="event-card__foot">
          ${price ? `<span class="event-card__price${isFree(event) ? " event-card__price--free" : ""}">${escapeHtml(price)}</span>` : ""}
          ${styles ? `<span class="style-list">${escapeHtml(styles)}</span>` : ""}
          ${saveButtonHtml(event)}
        </div>
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
