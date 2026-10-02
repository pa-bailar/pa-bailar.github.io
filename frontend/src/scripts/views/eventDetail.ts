// Event detail: the flyer of the selected post (thumbnails of every post when there are several), all
// details, prices and actions. Pure HTML strings, so the same markup is used by the dialog (in the browser) and by
// each event's own page (pages/evento/[id].astro, at build time).

import type { DanceEvent, EventMedia } from "../types";
import { escapeHtml } from "../lib/dom";
import {
  formatLongDate,
  formatMoney,
  formatTime,
  mediaLabel,
  placeLabel,
  postCountLabel,
  stylesLabel,
  typeLabel,
} from "../lib/format";
import { ICONS } from "../lib/icons";
import { flyerUrl, googleCalendarUrl, mapsUrl, whatsappShareUrl } from "../lib/links";

function toConfirm(text = "Por confirmar"): string {
  return `<span class="to-confirm">${text}</span>`;
}

/** [term, HTML value] rows. Missing details say "Por confirmar" right where they belong. */
function detailRows(event: DanceEvent): [string, string][] {
  const time = [formatTime(event.start_time), formatTime(event.end_time)].filter(Boolean).join(" – ");
  const when = `${escapeHtml(formatLongDate(event.date))} · ${time ? escapeHtml(time) : toConfirm("hora por confirmar")}`;
  const place = placeLabel(event);
  const maps = mapsUrl(event);
  const directions = maps
    ? ` <a class="inline-link" href="${escapeHtml(maps)}" target="_blank" rel="noopener" data-track="como-llegar">${ICONS.pin}Cómo llegar</a>`
    : "";

  const rows: [string, string][] = [
    ["Cuándo", when],
    ["Organiza", escapeHtml([event.organizer, `@${event.account}`].filter(Boolean).join(" · "))],
    ["Lugar", place ? `${escapeHtml(place)}${directions}` : toConfirm()],
  ];
  if (!event.prices.length) rows.push(["Precio", toConfirm()]);
  if (event.artists.length) rows.push(["Con", escapeHtml(event.artists.join(", "))]);
  if (event.activities.length) rows.push(["Incluye", escapeHtml(event.activities.join(" · "))]);
  if (event.contact) rows.push(["Contacto", escapeHtml(event.contact)]);
  return rows;
}

function pricesHtml(event: DanceEvent): string {
  if (!event.prices.length) return "";
  const items = event.prices
    .map((price) => {
      const condition = price.condition ? ` <small>(${escapeHtml(price.condition)})</small>` : "";
      return `<li><span>${escapeHtml(price.label)}${condition}</span><b>${formatMoney(price.amount_cop)}</b></li>`;
    })
    .join("");
  return `<h3 class="event-dialog__subheading">Precios</h3><ul class="price-list">${items}</ul>`;
}

/** Thumbnails in the row under the flyer; with more posts, the last place becomes "+N". */
const VISIBLE_POSTS = 5;

const POST_BADGES: Partial<Record<EventMedia["media_type"], string>> = {
  VIDEO: ICONS.play,
  CAROUSEL_ALBUM: ICONS.carousel,
};

function postThumbHtml(media: EventMedia, index: number, total: number, selected: boolean): string {
  const flyer = flyerUrl(media);
  const badge = POST_BADGES[media.media_type];
  return `
    <button class="post-thumb" type="button" data-media-index="${index}" aria-pressed="${selected}"
      aria-label="Publicación ${index + 1} de ${total} (${mediaLabel(media.media_type).toLowerCase()})">
      ${flyer ? `<img src="${escapeHtml(flyer)}" alt="" loading="lazy" decoding="async" />` : ""}
      ${badge ? `<span class="post-thumb__badge" aria-hidden="true">${badge}</span>` : ""}
    </button>`;
}

/**
 * Every post announcing the event (a flyer, then videos, reminders…), as square thumbnails under the
 * flyer, marked like Instagram's grid: ▶ for a video, stacked squares for a carousel. One row; with more
 * than VISIBLE_POSTS the last place is "+N", which shows them all (like WhatsApp's media grid). It never
 * scrolls sideways: the viewer itself swipes sideways between events. Hidden when there's only one post.
 */
function postsHtml(event: DanceEvent, selected: number, showAll: boolean): string {
  const total = event.media.length;
  if (total < 2) return "";
  const collapsed = total > VISIBLE_POSTS && !showAll && selected < VISIBLE_POSTS - 1;
  const shown = collapsed ? VISIBLE_POSTS - 1 : total;
  const thumbs = event.media
    .slice(0, shown)
    .map((media, index) => postThumbHtml(media, index, total, index === selected))
    .join("");
  const more = collapsed
    ? `<button class="post-thumbs__more" type="button" data-show-all-posts aria-label="Ver las ${total} publicaciones">+${total - shown}</button>`
    : "";
  return `
    <div class="post-thumbs${collapsed ? "" : " is-all"}">
      <p class="post-thumbs__label">${postCountLabel(total)} sobre este evento</p>
      <div class="post-thumbs__grid" role="group" aria-label="Publicaciones de este evento">${thumbs}${more}</div>
    </div>`;
}

function mediaHtml(event: DanceEvent, media: EventMedia): string {
  const flyer = flyerUrl(media);
  if (!flyer) return "";
  const isVideo = media.media_type === "VIDEO";
  return `
    <a class="event-dialog__media" href="${escapeHtml(media.permalink)}" target="_blank" rel="noopener">
      <img src="${escapeHtml(flyer)}" alt="${isVideo ? "Video" : "Flyer"} de ${escapeHtml(event.title)}" />
      ${isVideo ? `<span class="event-dialog__play">${ICONS.instagram}Ver video en Instagram</span>` : ""}
    </a>`;
}

/**
 * The detail's inner HTML. `selected` is the post shown; `showAllPosts` expands the thumbnails' "+N".
 * The title is an h1 on the event page and an h2 in the viewer, where each slide has its own `titleId`.
 */
export function eventDetailHtml(
  event: DanceEvent,
  selected: number,
  {
    headingLevel,
    titleId = "event-title",
    showAllPosts = false,
  }: { headingLevel: 1 | 2; titleId?: string; showAllPosts?: boolean },
): string {
  const media = event.media[selected] ?? event.media[0];
  const permalink = escapeHtml(media.permalink);
  const rows = detailRows(event)
    .map(([term, value]) => `<dt>${term}</dt><dd>${value}</dd>`)
    .join("");
  const styles = stylesLabel(event.styles);
  const heading = `h${headingLevel}`;
  const lowConfidence =
    event.confidence === "low"
      ? `<p class="callout">Algunos datos se leyeron del flyer con poca seguridad: confírmalos en la publicación.</p>`
      : "";

  return `
    <div class="event-dialog__visual">
      ${mediaHtml(event, media)}
      ${postsHtml(event, selected, showAllPosts)}
    </div>
    <div class="event-dialog__info">
      <div class="stripes" aria-hidden="true"><i></i><i></i><i></i></div>
      <span class="tag-type t-${escapeHtml(event.event_type)}">${typeLabel(event.event_type)}</span>
      <${heading} class="event-dialog__title" id="${titleId}">${escapeHtml(event.title)}</${heading}>
      <dl class="detail-list">${rows}</dl>
      ${pricesHtml(event)}
      ${styles ? `<p class="style-list">${escapeHtml(styles)}</p>` : ""}
      ${lowConfidence}
      <div class="event-dialog__actions">
        <a class="btn btn--primary" href="${permalink}" target="_blank" rel="noopener" data-track="instagram">${ICONS.instagram}Ver en Instagram</a>
        <a class="btn btn--whatsapp" href="${escapeHtml(whatsappShareUrl(event))}" target="_blank" rel="noopener" data-track="whatsapp">${ICONS.whatsapp}Compartir por WhatsApp</a>
        <a class="btn" href="${escapeHtml(googleCalendarUrl(event))}" target="_blank" rel="noopener" data-track="calendario">${ICONS.calendar}Agregar al calendario</a>
      </div>
      ${media.caption ? `<details class="event-dialog__caption"><summary>Texto de la publicación</summary><p>${escapeHtml(media.caption)}</p></details>` : ""}
    </div>`;
}

/**
 * Clicks on the post thumbnails: show another post (its image, "Ver en Instagram" link and caption), or
 * expand "+N". Re-renders the detail and keeps the focus on the thumbnail (the first new one after "+N").
 * False when the click wasn't on them.
 */
export function handlePostClick(
  container: HTMLElement,
  target: HTMLElement,
  render: (selected: number, showAllPosts: boolean) => void,
): boolean {
  const thumb = target.closest<HTMLElement>("[data-media-index]");
  const expand = target.closest<HTMLElement>("[data-show-all-posts]");
  if (!thumb && !expand) return false;
  const pressed = container.querySelector<HTMLElement>('[data-media-index][aria-pressed="true"]');
  const selected = Number((thumb ?? pressed)?.dataset.mediaIndex ?? 0);
  const showAll = Boolean(expand) || Boolean(container.querySelector(".post-thumbs.is-all"));
  render(selected, showAll);
  const focusIndex = expand ? VISIBLE_POSTS - 1 : selected;
  container.querySelector<HTMLElement>(`[data-media-index="${focusIndex}"]`)?.focus();
  return true;
}
