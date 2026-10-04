// Event detail: when and what, the quick actions, every detail, the prices and the media. Pure HTML strings, so
// the same markup is used by the details drawer (in the browser, eventDrawer.ts) and by each event's own page
// (pages/evento/[id].astro, at build time), which also shows the flyer on top, like the card.

import type { DanceEvent, EventMedia } from "../types";
import { byId, escapeHtml } from "../lib/dom";
import {
  cardWhenLabel,
  eventDaysLabel,
  formatMoney,
  formatTime,
  placeLabel,
  priceSummary,
  stickerDate,
  stylesLabel,
  typeLabel,
} from "../lib/format";
import { contactLink, type ContactKind } from "../lib/contact";
import { ICONS } from "../lib/icons";
import { feedbackUrl, flyerUrl, mapsUrl, previewUrl } from "../lib/links";
import { isStory, isVideoCover, mediaLabel, storySource } from "../lib/mediaLabel";
import { playInline } from "./inlinePlayer";
import { openPostViewer } from "./postViewer";
import { saveButtonHtml } from "./saveButton";
import { openPostsSheet } from "./postsSheet";

const CONTACT_ICONS: Record<ContactKind, string> = {
  instagram: ICONS.instagram,
  whatsapp: ICONS.whatsapp,
  phone: "",
  web: "",
};

/** The contact as a link when it can be one (lib/contact.ts): Instagram, a WhatsApp chat, a call, a website. */
function contactHtml(contact: string): string {
  const link = contactLink(contact);
  if (!link) return escapeHtml(contact);
  const external = link.kind === "phone" ? "" : ` target="_blank" rel="noopener"`;
  return `<a class="inline-link contact-link" href="${escapeHtml(link.href)}"${external} data-track="contacto-${link.kind}">${CONTACT_ICONS[link.kind]}${escapeHtml(link.label)}</a>`;
}

function toConfirm(text = "Por confirmar"): string {
  return `<span class="to-confirm">${text}</span>`;
}

/**
 * [term, HTML value] rows. Missing details say "Por confirmar" right where they belong. The place and the price
 * come right after the time, the price as one line ("Desde $ 25.000 · 2 opciones"): what people look for first.
 */
function detailRows(event: DanceEvent): [string, string][] {
  const time = [formatTime(event.start_time), formatTime(event.end_time)].filter(Boolean).join(" – ");
  const when = `${escapeHtml(eventDaysLabel(event))} · ${time ? escapeHtml(time) : toConfirm("hora por confirmar")}`;
  // The venue may be the organizer's own place (placeLabel leaves it out then): still the place to go.
  const place = placeLabel(event) || event.venue || "";
  const maps = mapsUrl(event);
  const directions = maps
    ? ` <a class="inline-link" href="${escapeHtml(maps)}" target="_blank" rel="noopener" data-track="como-llegar">${ICONS.pin}Cómo llegar</a>`
    : "";
  const organizer: [string, string] = [
    "Organiza",
    // The organizer is often the account itself ("@academia"): said once.
    escapeHtml([...new Set([event.organizer, `@${event.account}`].filter(Boolean))].join(" · ")),
  ];
  const where: [string, string] = ["Lugar", place ? `${escapeHtml(place)}${directions}` : toConfirm()];

  const rows: [string, string][] = [["Cuándo", when], where, ["Precio", sheetPrice(event)], organizer];
  if (event.artists.length) rows.push(["Con", escapeHtml(event.artists.join(", "))]);
  if (event.activities.length) rows.push(["Incluye", escapeHtml(event.activities.join(" · "))]);
  if (event.contact) rows.push(["Contacto", contactHtml(event.contact)]);
  return rows;
}

/** The price line: "Gratis", "$ 30.000", "Desde $ 25.000 · 3 opciones", or "Por confirmar". */
export function sheetPrice(event: DanceEvent): string {
  const summary = priceSummary(event);
  if (!summary) return toConfirm();
  const free = event.prices.every((price) => price.amount_cop === 0);
  const options = event.prices.length > 1 ? ` <span class="to-confirm">· ${event.prices.length} opciones</span>` : "";
  return `${free ? "Gratis" : escapeHtml(summary)}${options}`;
}

function pricesHtml(event: DanceEvent): string {
  // A single price without conditions is already its "Precio" line.
  if (!event.prices.length || (event.prices.length === 1 && !event.prices[0]?.condition)) return "";
  const items = event.prices
    .map((price) => {
      const condition = price.condition ? ` <small>(${escapeHtml(price.condition)})</small>` : "";
      return `<li><span>${escapeHtml(price.label)}${condition}</span><b>${formatMoney(price.amount_cop)}</b></li>`;
    })
    .join("");
  return `<h3 class="event-detail__subheading">Precios</h3><ul class="price-list">${items}</ul>`;
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
 * (postViewer.ts); it's still a link to the post, for a new tab or a page without scripts. A story's flyer is a plain
 * image, labeled "Historia": there's nothing more to see (its link is the account's profile, under the details).
 */
function mediaHtml(event: DanceEvent, media: EventMedia, selected: number): string {
  const flyer = flyerUrl(media);
  if (!flyer) return "";
  const isVideo = media.media_type === "VIDEO";
  // Its real size (read at build time) reserves its space before it loads: switching posts never
  // collapses the image to nothing and shifts everything below it.
  const size = media.width && media.height ? ` width="${media.width}" height="${media.height}"` : "";
  const sticker = stickerDate(event);
  const clip = previewUrl(media);
  // A video with a clip plays it here, silent and looping (views/clips.ts); tapping opens it with sound.
  const picture = clip
    ? `<video class="event-detail__clip" src="${escapeHtml(clip)}" poster="${escapeHtml(flyer)}"${size}
        muted loop playsinline preload="none" data-clip aria-label="Video de ${escapeHtml(event.title)}"></video>`
    : `<img src="${escapeHtml(flyer)}"${size} decoding="async" alt="${isVideo ? "Video" : "Flyer"} de ${escapeHtml(event.title)}" />`;
  // What tapping shows beyond this image (lib/mediaLabel.ts): the video with sound, or the carousel's slides; on a
  // story, where it came from.
  const label = mediaLabel(media);
  const labelHtml = label
    ? `<span class="event-detail__play${isStory(media) ? " event-detail__play--story" : ""}">${ICONS[label.icon]}${label.text}</span>`
    : "";
  const shown = isStory(media)
    ? `<div class="event-detail__media">${picture}${labelHtml}</div>`
    : `<a class="event-detail__media" href="${escapeHtml(media.permalink)}" target="_blank" rel="noopener"
        data-view-post="${selected}" data-track="ver-publicacion" aria-label="Ver la publicación">
        ${picture}
        ${labelHtml}
      </a>`;
  return `
    <div class="event-detail__frame">
      ${shown}
      <span class="date-sticker${sticker.range ? " date-sticker--range" : ""}" aria-hidden="true"><b>${sticker.day}</b><small>${sticker.month}</small></span>
      ${postsBadgeHtml(event, selected)}
    </div>`;
}

/** When, the title, the type tag and the account: the head of the drawer, and of the page under the flyer. */
function headHtml(event: DanceEvent, { heading, titleId }: { heading: "h1" | "h2"; titleId: string }): string {
  return `
    <p class="event-detail__when">${escapeHtml(cardWhenLabel(event))}</p>
    <${heading} class="event-detail__title" id="${titleId}" tabindex="-1">${escapeHtml(event.title)}</${heading}>
    <p class="event-detail__by"><span class="tag-type t-${escapeHtml(event.event_type)}">${typeLabel(event.event_type)}</span><span>@${escapeHtml(event.account)}</span></p>`;
}

/**
 * Beyond the text: the post's video with sound, a carousel's images, the event's other posts. Each opens in the
 * full-screen media viewer (postViewer.ts) or the sheet of posts (postsSheet.ts): the details never show the
 * flyer again (the visitor is looking at it, on the card).
 */
function mediaLinksHtml(event: DanceEvent, selected: number): string {
  const media = event.media[selected] ?? event.media[0];
  const link = (kind: string, icon: string, text: string) =>
    `<button class="media-link" type="button" data-media-link="${kind}" data-post="${selected}" data-track="ver-${kind}">${icon}<span>${text}</span></button>`;
  const label = mediaLabel(media);
  const links = [
    isVideoCover(media) ? link("video", ICONS.play, "Ver el video con sonido") : "",
    !isVideoCover(media) && label?.icon === "carousel" ? link("carrusel", ICONS.carousel, `Ver las ${media.slides} imágenes`) : "",
    event.media.length > 1 ? link("publicaciones", ICONS.gallery, `Ver las ${event.media.length} publicaciones`) : "",
  ].filter(Boolean);
  return links.length ? `<div class="media-links">${links.join("")}</div>` : "";
}

/**
 * Everything after the head, in the order people look for it: Cómo llegar · Compartir · Guardar; the stripes;
 * when, where, the price (one line) and who organizes, then the rest; the prices; the rhythms; the media; "Ver en
 * Instagram" (a story: where it came from, and "Ver perfil en Instagram"); the post's text; "¿Algo está mal?
 * Repórtalo". At the drawer's half height, when, where and the price are on screen.
 */
function bodyHtml(event: DanceEvent, selected: number): string {
  const media = event.media[selected] ?? event.media[0];
  const maps = mapsUrl(event);
  const rows = detailRows(event)
    .map(([term, value]) => `<dt>${term}</dt><dd>${value}</dd>`)
    .join("");
  const styles = stylesLabel(event.styles);
  const story = isStory(media);
  const lowConfidence =
    event.confidence === "low"
      ? `<p class="callout">Algunos datos se leyeron del flyer con poca seguridad: confírmalos ${story ? "con la cuenta" : "en la publicación"}.</p>`
      : "";
  return `
    <div class="quick-actions">
      ${maps ? `<a class="btn" href="${escapeHtml(maps)}" target="_blank" rel="noopener" data-track="como-llegar">${ICONS.pin}<span>Cómo llegar</span></a>` : ""}
      <button class="btn" type="button" data-share-event="${escapeHtml(event.id)}" data-track="compartir-evento">${ICONS.share}<span>Compartir</span></button>
      ${saveButtonHtml(event, { labeled: true, className: "btn" })}
    </div>
    <div class="stripes" aria-hidden="true"><i></i><i></i><i></i></div>
    <dl class="detail-list">${rows}</dl>
    ${pricesHtml(event)}
    ${styles ? `<p class="style-list">${escapeHtml(styles)}</p>` : ""}
    ${lowConfidence}
    ${mediaLinksHtml(event, selected)}
    ${story ? `<p class="event-detail__source">${ICONS.story}<span>${escapeHtml(storySource(event, media))}</span></p>` : ""}
    <div class="event-detail__actions">
      ${
        story
          ? `<a class="btn btn--primary" href="${escapeHtml(media.permalink)}" target="_blank" rel="noopener" data-track="instagram-perfil">${ICONS.instagram}Ver perfil en Instagram ↗</a>`
          : `<a class="btn btn--primary" href="${escapeHtml(media.permalink)}" target="_blank" rel="noopener" data-track="instagram">${ICONS.instagram}Ver en Instagram ↗</a>`
      }
    </div>
    ${media.caption ? `<details class="event-detail__caption"><summary>Texto de la publicación</summary><p>${escapeHtml(media.caption)}</p></details>` : ""}
    <p class="event-detail__report"><a class="inline-link" href="${escapeHtml(feedbackUrl(event))}" target="_blank" rel="noopener" data-track="reportar-error">¿Algo está mal? Repórtalo</a></p>`;
}

/**
 * An event's own page (pages/evento/[id].astro, at build time; eventPage.ts when another post is chosen): the
 * flyer on top, as on its card, then the same details as the drawer. `selected` is the post shown.
 */
export function eventDetailHtml(event: DanceEvent, selected: number, { titleId = "event-title" }: { titleId?: string } = {}): string {
  const media = event.media[selected] ?? event.media[0];
  return `
    <div class="event-detail__visual">
      ${mediaHtml(event, media, selected)}
    </div>
    <div class="event-detail__info">
      <div class="event-detail__head">${headHtml(event, { heading: "h1", titleId })}</div>
      ${bodyHtml(event, selected)}
    </div>`;
}

/**
 * The drawer's content (eventDrawer.ts): its head (when, title, type and account, ×) stays in place while the
 * body scrolls. No flyer and no thumbnail: the card is right there (above it on phones, in the list on wide
 * screens). Only the main post: the others are a link away ("Ver las 3 publicaciones").
 */
export function eventDrawerHtml(event: DanceEvent, { titleId }: { titleId: string }): string {
  return `
    <header class="drawer__head">
      <div class="drawer__heading">${headHtml(event, { heading: "h2", titleId })}</div>
      <button class="drawer__close" type="button" data-close-drawer aria-label="Cerrar">${ICONS.close}</button>
    </header>
    <div class="drawer__body event-detail__info">${bodyHtml(event, 0)}</div>`;
}

/** An event's posts in their sheet; the one chosen opens in the media viewer, in the sheet's place. */
export function openEventPosts(event: DanceEvent, selected = 0) {
  openPostsSheet(event, selected, (index) => {
    const media = event.media[index];
    if (media) openPostViewer(event, media, { replacing: byId<HTMLDialogElement>("posts-sheet") });
  });
}

/**
 * A media link of the details (`[data-media-link]`): the video (or the carousel) in the media viewer, or the
 * event's posts. False for any other click.
 */
export function handleMediaLinkClick(domEvent: MouseEvent, event: DanceEvent): boolean {
  const link = (domEvent.target as HTMLElement).closest<HTMLElement>("[data-media-link]");
  if (!link) return false;
  const selected = Number(link.dataset.post ?? 0);
  if (link.dataset.mediaLink === "publicaciones") openEventPosts(event, selected);
  else openPostViewer(event, event.media[selected] ?? event.media[0]);
  return true;
}

/**
 * Clicks on an event's page that open something, false for any other:
 *   - the flyer: watch the post here (a video in place, inlinePlayer.ts; else the media viewer, postViewer.ts).
 *     A new-tab click follows the link to Instagram. A story's flyer is a plain image, not a link: nothing happens;
 *   - the posts badge: every post in a sheet; choosing one shows it on the page (its image, "Ver en Instagram"
 *     link and caption);
 *   - the media links, as in the drawer.
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
    const frame = flyer.closest<HTMLElement>(".event-detail__frame");
    if (isVideoCover(media) && frame) playInline(frame, media.permalink);
    else openPostViewer(event, media);
    return true;
  }
  const badge = target.closest<HTMLElement>("[data-open-posts]");
  if (!badge) return handleMediaLinkClick(domEvent, event);
  openPostsSheet(event, Number(badge.dataset.selected ?? 0), (index) => {
    render(index);
    container.querySelector<HTMLElement>("[data-open-posts]")?.focus({ preventScroll: true });
  });
  return true;
}
