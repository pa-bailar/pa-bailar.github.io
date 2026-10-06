// Event detail: when and what, the quick actions, every detail, the prices and the media. Pure HTML strings, so
// the same markup is used by the details drawer (in the browser, eventDrawer.ts) and by each event's own page
// (pages/evento/[id].astro, at build time), which also shows the flyer on top, like the card. What their clicks open
// is in eventDetailActions.ts.

import type { DanceEvent, EventMedia } from "../types";
import { escapeHtml } from "../lib/dom";
import {
  capitalize,
  cardWhenLabel,
  eventDaysLabel,
  formatMoney,
  formatTime,
  placeLabel,
  priceSummary,
  sameSessionTimes,
  sessionDayLabel,
  stickerDate,
  stylesLabel,
  timeSpanLabel,
  typeLabel,
} from "../lib/format";
import { isSeries, nextSession, todayIso } from "../lib/dates";
import { contactLink, type ContactKind } from "../lib/contact";
import { ICONS } from "../lib/icons";
import { accountLinkHtml } from "../lib/accountLink";
import { attributesHtml, externalLinkHtml } from "../lib/externalLink";
import { feedbackUrl, flyerUrl, mapsUrl, previewUrl } from "../lib/links";
import { isStory, isVideoCover, mediaLabel, storyAccount, storySource } from "../lib/mediaLabel";
import { saveButtonHtml } from "./saveButton";

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
  if (link.kind === "instagram") {
    const content = `${CONTACT_ICONS.instagram}${escapeHtml(link.label)}`;
    return accountLinkHtml(link.label.slice(1), { className: "inline-link contact-link", track: "contacto-instagram", content });
  }
  const content = `${CONTACT_ICONS[link.kind]}${escapeHtml(link.label)}`;
  const className = "inline-link contact-link";
  const track = `contacto-${link.kind}`;
  // A call stays in this tab; WhatsApp and a website open a new one.
  if (link.kind === "phone") return `<a ${attributesHtml({ class: className, href: link.href, "data-track": track })}>${content}</a>`;
  return externalLinkHtml(link.href, content, { className, track });
}

/** A detail the post doesn't give: "Por confirmar", "hora por confirmar". */
function toConfirm(text = "Por confirmar"): string {
  return `<span class="to-confirm">${text}</span>`;
}

/** A note beside a detail, styled like the missing ones: "· 2 opciones", "horario de cada sesión abajo". */
function detailNote(text: string): string {
  return `<span class="detail-note">${text}</span>`;
}

/**
 * [term, HTML value] rows. Missing details say "Por confirmar" right where they belong. The place and the price
 * come right after the time, the price as one line ("Desde $ 25.000 · 2 opciones"): what people look for first.
 */
function detailRows(event: DanceEvent): [string, string][] {
  const time = [formatTime(event.start_time), formatTime(event.end_time)].filter(Boolean).join(" – ");
  // A series whose sessions have different times gives each its own, in the list of sessions.
  const perSession = isSeries(event) && !sameSessionTimes(event.sessions);
  const timeHtml = perSession
    ? detailNote("horario de cada sesión abajo")
    : time
      ? escapeHtml(time)
      : toConfirm("hora por confirmar");
  const when = `${escapeHtml(eventDaysLabel(event))} · ${timeHtml}`;
  // The venue may be the organizer's own place (placeLabel leaves it out then): still the place to go.
  const place = placeLabel(event) || event.venue || "";
  const maps = mapsUrl(event);
  const directions = maps
    ? ` ${externalLinkHtml(maps, `${ICONS.pin}Cómo llegar`, { className: "inline-link", track: "como-llegar" })}`
    : "";
  // The organizer is often the account itself ("@academia"): said once. The @ is the account's link, as everywhere.
  const named = event.organizer && event.organizer !== `@${event.account}` ? `${escapeHtml(event.organizer)} · ` : "";
  const organizer: [string, string] = [
    "Organiza",
    `${named}${accountLinkHtml(event.account, { className: "inline-link", track: "perfil-organiza" })}`,
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
  const options = event.prices.length > 1 ? ` ${detailNote(`· ${event.prices.length} opciones`)}` : "";
  return `${free ? "Gratis" : escapeHtml(summary)}${options}`;
}

/**
 * A workshop series' sessions, one per line: "Dom 8 nov", with its times when they differ between sessions. The next
 * one is marked "Próxima" (or "Hoy"), those past are dimmed with "Ya pasó". As of `today`: the drawer's is the
 * visitor's; an event's page is built hours earlier, so its script draws them again (eventPage.ts).
 */
export function sessionsHtml(event: DanceEvent, today = todayIso()): string {
  if (!isSeries(event)) return "";
  const next = nextSession(event, today);
  const withTimes = !sameSessionTimes(event.sessions);
  const items = event.sessions
    .map((session) => {
      const past = session.date < today;
      const isNext = session === next;
      const tag = past ? "Ya pasó" : isNext ? (session.date === today ? "Hoy" : "Próxima") : "";
      const time = withTimes ? timeSpanLabel(session.start_time, session.end_time) || "Hora por confirmar" : "";
      const state = past ? " is-past" : isNext ? " is-next" : "";
      return `<li class="session-list__item${state}">
        <span class="session-list__day">${escapeHtml(capitalize(sessionDayLabel(session.date)))}</span>
        ${time ? `<span class="session-list__time">${escapeHtml(time)}</span>` : ""}
        ${tag ? `<span class="session-list__tag">${tag}</span>` : ""}
      </li>`;
    })
    .join("");
  return `<h3 class="event-detail__subheading">Sesiones</h3><ol class="session-list">${items}</ol>`;
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
    : externalLinkHtml(media.permalink, `${picture}${labelHtml}`, {
        className: "event-detail__media",
        track: "ver-publicacion",
        // Named starting with the words it shows ("Ver las 19", "Ver con sonido": label in name, WCAG 2.5.3).
        attributes: {
          "data-view-post": String(selected),
          "aria-label": label ? `${label.text}, publicación de Instagram` : "Ver la publicación",
        },
      });
  return `
    <div class="event-detail__frame">
      ${shown}
      <span class="date-sticker${sticker.range ? " date-sticker--range" : ""}" aria-hidden="true"><b>${sticker.day}</b><small>${sticker.month}</small></span>
      ${postsBadgeHtml(event, selected)}
    </div>`;
}

/**
 * When, the title, the type tag and the account: the head of the drawer, and of the page under the flyer. The account
 * opens its Instagram profile inside the site, as every @ does (lib/accountLink.ts).
 */
function headHtml(event: DanceEvent, { heading, titleId }: { heading: "h1" | "h2"; titleId: string }): string {
  return `
    <p class="event-detail__when">${escapeHtml(cardWhenLabel(event))}</p>
    <${heading} class="event-detail__title" id="${titleId}" tabindex="-1">${escapeHtml(event.title)}</${heading}>
    <p class="event-detail__by"><span class="tag-type t-${escapeHtml(event.event_type)}">${typeLabel(event.event_type)}</span>${accountLinkHtml(event.account, { className: "event-detail__account", track: "perfil-detalle" })}</p>`;
}

/**
 * Beyond the text: the event's other posts, in the sheet of posts (postsSheet.ts). The details never show the flyer
 * again (the visitor is looking at it, on the card); the post itself is the main button (`instagramButtonHtml`).
 */
function mediaLinksHtml(event: DanceEvent, selected: number): string {
  if (event.media.length < 2) return "";
  return `<div class="media-links"><button class="media-link" type="button" data-media-link="publicaciones" data-post="${selected}"
    data-track="ver-publicaciones">${ICONS.gallery}<span>Ver las ${event.media.length} publicaciones</span></button></div>`;
}

/**
 * "Instagram", first of the quick actions: the post, watched inside the site (the media viewer, Instagram's player:
 * a video plays there with sound, a carousel swipes). The owner's call of 4 October 2026: Instagram itself leaves
 * the site and its back button doesn't come back, and one way in, at the top, instead of "Ver el video con sonido"
 * and "Ver en Instagram" both. "Abrir en Instagram ↗" stays in the viewer's bar, and the button is a link to the post
 * underneath, for a new tab. A story has no post: its account's profile, in the same viewer (`data-profile`,
 * postViewer.ts).
 */
function instagramButtonHtml(event: DanceEvent, media: EventMedia, selected: number): string {
  const label = `${ICONS.instagram}<span>Instagram</span>`;
  if (isStory(media)) {
    return accountLinkHtml(storyAccount(media) ?? event.account, { className: "btn", track: "perfil-historia", content: label });
  }
  const kind = isVideoCover(media) ? "video" : mediaLabel(media)?.icon === "carousel" ? "carrusel" : "publicacion";
  const spoken = { video: "Ver el video con sonido", carrusel: `Ver las ${media.slides} imágenes`, publicacion: "Ver la publicación" }[kind];
  return externalLinkHtml(media.permalink, label, {
    className: "btn",
    track: `ver-${kind}`,
    attributes: { "data-media-link": kind, "data-post": String(selected), "aria-label": `${spoken} de Instagram` },
  });
}

/**
 * Everything after the head, in the order people look for it: Instagram · Compartir · Guardar; the stripes; when,
 * where (with its "Cómo llegar"), the price (one line) and who organizes, then the rest; the prices; the rhythms; the
 * other posts (a story: where it came from); the post's text; "¿Algo está mal? Repórtalo". At the drawer's half
 * height, when, where and the price are on screen.
 */
function bodyHtml(event: DanceEvent, selected: number): string {
  const media = event.media[selected] ?? event.media[0];
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
      ${instagramButtonHtml(event, media, selected)}
      <button class="btn" type="button" data-share-event="${escapeHtml(event.id)}" data-track="compartir-evento">${ICONS.share}<span>Compartir</span></button>
      ${saveButtonHtml(event, { labeled: true, className: "btn" })}
    </div>
    <div class="stripes" aria-hidden="true"><i></i><i></i><i></i></div>
    <dl class="detail-list">${rows}</dl>
    ${sessionsHtml(event)}
    ${pricesHtml(event)}
    ${styles ? `<p class="style-list">${escapeHtml(styles)}</p>` : ""}
    ${lowConfidence}
    ${mediaLinksHtml(event, selected)}
    ${story ? `<p class="event-detail__source">${ICONS.story}<span>${escapeHtml(storySource(event, media))}</span></p>` : ""}
    ${media.caption ? `<details class="event-detail__caption"><summary>Texto de la publicación</summary><p>${escapeHtml(media.caption)}</p></details>` : ""}
    <p class="event-detail__report">${externalLinkHtml(feedbackUrl(event), "¿Algo está mal? Repórtalo", { className: "inline-link", track: "reportar-error" })}</p>`;
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
export function eventDrawerHtml(event: DanceEvent, { titleId, selected = 0 }: { titleId: string; selected?: number }): string {
  return `
    <div class="drawer__head">
      <div class="drawer__heading">${headHtml(event, { heading: "h2", titleId })}</div>
      <button class="drawer__close" type="button" data-close-drawer aria-label="Cerrar">${ICONS.close}</button>
    </div>
    <div class="drawer__body event-detail__info">${bodyHtml(event, selected)}</div>`;
}
