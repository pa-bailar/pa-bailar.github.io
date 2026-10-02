// Event detail: the flyer of the selected post, then when and what (so swiping between events that share
// a flyer still shows which is which), all details, prices and actions. Pure HTML strings, so the same
// markup is used by the dialog (in the browser) and by each event's own page (pages/evento/[id].astro,
// at build time).

import type { DanceEvent, EventMedia } from "../types";
import { escapeHtml } from "../lib/dom";
import {
  cardWhenLabel,
  formatLongDate,
  formatMoney,
  formatTime,
  placeLabel,
  stickerDate,
  stylesLabel,
  typeLabel,
} from "../lib/format";
import { ICONS } from "../lib/icons";
import { flyerUrl, googleCalendarUrl, mapsUrl, whatsappShareUrl } from "../lib/links";
import { openPostViewer } from "./postViewer";
import { saveButtonHtml } from "./saveButton";
import { openPostsSheet } from "./postsSheet";

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

/**
 * "▦ 16" over the flyer when several posts announce the event: opens them all in a sheet (postsSheet.ts),
 * like Airbnb's photo count. The gallery takes no room in the detail itself.
 */
function postsBadgeHtml(event: DanceEvent, selected: number): string {
  const count = event.media.length;
  if (count < 2) return "";
  return `
    <button class="posts-badge" type="button" data-open-posts data-selected="${selected}"
      aria-label="Ver las ${count} publicaciones de este evento">${ICONS.gallery}<span>${count}</span></button>`;
}

/**
 * The flyer, with the date sticker (as on the cards, so two events sharing a flyer still look different)
 * and the posts badge over it. Tapping the flyer shows the post here, with Instagram's player
 * (postViewer.ts); it's still a link to the post, for a new tab or a page without scripts.
 */
function mediaHtml(event: DanceEvent, media: EventMedia, selected: number): string {
  const flyer = flyerUrl(media);
  if (!flyer) return "";
  const isVideo = media.media_type === "VIDEO";
  // Its real size (read at build time) reserves its space before it loads: switching posts never
  // collapses the image to nothing and shifts everything below it.
  const size = media.width && media.height ? ` width="${media.width}" height="${media.height}"` : "";
  const sticker = stickerDate(event.date);
  return `
    <div class="event-dialog__frame">
      <a class="event-dialog__media" href="${escapeHtml(media.permalink)}" target="_blank" rel="noopener"
        data-view-post="${selected}" data-track="ver-publicacion" aria-label="Ver la publicación">
        <img src="${escapeHtml(flyer)}"${size} alt="${isVideo ? "Video" : "Flyer"} de ${escapeHtml(event.title)}" />
        ${isVideo ? `<span class="event-dialog__play">${ICONS.play}Ver video</span>` : ""}
      </a>
      <span class="date-sticker" aria-hidden="true"><b>${sticker.day}</b><small>${sticker.month}</small></span>
      ${postsBadgeHtml(event, selected)}
    </div>`;
}

/**
 * The detail's inner HTML. `selected` is the post shown. The title is an h1 on the event page and an h2
 * in the viewer, where each slide has its own `titleId`. Right under the flyer: when ("Domingo · 8:00
 * p. m.") and the title, so they're on screen without scrolling.
 */
export function eventDetailHtml(
  event: DanceEvent,
  selected: number,
  { headingLevel, titleId = "event-title" }: { headingLevel: 1 | 2; titleId?: string },
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
      ${mediaHtml(event, media, selected)}
    </div>
    <div class="event-dialog__info">
      <div class="event-dialog__top">
        <p class="event-dialog__when">${escapeHtml(cardWhenLabel(event))}</p>
        ${saveButtonHtml(event)}
      </div>
      <${heading} class="event-dialog__title" id="${titleId}">${escapeHtml(event.title)}</${heading}>
      <span class="tag-type t-${escapeHtml(event.event_type)}">${typeLabel(event.event_type)}</span>
      <div class="stripes" aria-hidden="true"><i></i><i></i><i></i></div>
      <dl class="detail-list">${rows}</dl>
      ${pricesHtml(event)}
      ${styles ? `<p class="style-list">${escapeHtml(styles)}</p>` : ""}
      ${lowConfidence}
      <div class="event-dialog__actions">
        <a class="btn btn--primary" href="${permalink}" target="_blank" rel="noopener" data-track="instagram">${ICONS.instagram}Ver en Instagram ↗</a>
        <a class="btn btn--whatsapp" href="${escapeHtml(whatsappShareUrl(event))}" target="_blank" rel="noopener" data-track="whatsapp">${ICONS.whatsapp}Compartir por WhatsApp</a>
        <a class="btn" href="${escapeHtml(googleCalendarUrl(event))}" target="_blank" rel="noopener" data-track="calendario">${ICONS.calendar}Agregar al calendario</a>
      </div>
      ${media.caption ? `<details class="event-dialog__caption"><summary>Texto de la publicación</summary><p>${escapeHtml(media.caption)}</p></details>` : ""}
    </div>`;
}

/**
 * Clicks in the detail that open a sheet, false for any other:
 *   - the flyer: watch the post here (postViewer.ts). A new-tab click follows the link to Instagram;
 *   - the posts badge: every post in a sheet; choosing one re-renders the detail with it (its image,
 *     "Ver en Instagram" link and caption), without moving.
 */
export function handleDetailClick(
  container: HTMLElement,
  domEvent: MouseEvent,
  event: DanceEvent,
  render: (selected: number) => void,
): boolean {
  const target = domEvent.target as HTMLElement;
  const flyer = target.closest<HTMLElement>("[data-view-post]");
  if (flyer) {
    const media = event.media[Number(flyer.dataset.viewPost)];
    const newTab = domEvent.button !== 0 || domEvent.metaKey || domEvent.ctrlKey || domEvent.shiftKey || domEvent.altKey;
    if (!media || newTab) return false;
    domEvent.preventDefault();
    openPostViewer(event, media);
    return true;
  }
  const badge = target.closest<HTMLElement>("[data-open-posts]");
  if (!badge) return false;
  openPostsSheet(event, Number(badge.dataset.selected ?? 0), (index) => {
    keepingScroll(container, () => render(index));
    container.querySelector<HTMLElement>("[data-open-posts]")?.focus({ preventScroll: true });
  });
  return true;
}

/**
 * Re-render without moving: the viewer's slide (phones) and its details column (wide screens) scroll on
 * their own, and replacing their content would send them back to the top. Their positions are put back
 * right after the new content is in.
 */
function keepingScroll(container: HTMLElement, render: () => void) {
  const scrollers = () => [container, container.querySelector<HTMLElement>(".event-dialog__info")];
  const positions = scrollers().map((element) => element?.scrollTop ?? 0);
  render();
  scrollers().forEach((element, index) => {
    if (element) element.scrollTop = positions[index] ?? 0;
  });
}
