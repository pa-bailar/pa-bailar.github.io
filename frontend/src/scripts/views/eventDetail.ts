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
import { flyerUrl, googleCalendarUrl, mapsUrl, thumbUrl, whatsappShareUrl } from "../lib/links";

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

/** Posts are split into flyers (photos and carousels) and videos, each kind under its own small tab. */
type PostKind = "flyers" | "videos";

const POST_KINDS: { kind: PostKind; label: string }[] = [
  { kind: "flyers", label: "Flyers" },
  { kind: "videos", label: "Videos" },
];

function postKind(media: EventMedia): PostKind {
  return media.media_type === "VIDEO" ? "videos" : "flyers";
}

const POST_BADGES: Partial<Record<EventMedia["media_type"], string>> = {
  VIDEO: ICONS.play,
  CAROUSEL_ALBUM: ICONS.carousel,
};

/** `index` is the post's place in the event; `position` and `count`, its place within its kind. */
function postThumbHtml(media: EventMedia, index: number, position: number, count: number, selected: boolean): string {
  const thumb = thumbUrl(media);
  const badge = POST_BADGES[media.media_type];
  return `
    <button class="post-thumb" type="button" data-media-index="${index}" aria-pressed="${selected}"
      aria-label="${mediaLabel(media.media_type)} ${position + 1} de ${count}">
      ${thumb ? `<img src="${escapeHtml(thumb)}" alt="" width="160" height="160" />` : ""}
      ${badge ? `<span class="post-thumb__badge" aria-hidden="true">${badge}</span>` : ""}
    </button>`;
}

/**
 * Every post announcing the event (a flyer, then videos, reminders…), as square thumbnails under the
 * flyer, marked like Instagram's grid: ▶ for a video, stacked squares for a carousel.
 *   - Flyers and videos are separated by two small tabs ("Flyers 9", "Videos 7"); the tab shown is the
 *     selected post's kind. With only one kind there are no tabs, just "N publicaciones sobre este evento".
 *   - Each kind shows one row; with more than VISIBLE_POSTS the last place is "+N", which shows them all
 *     (like WhatsApp's media grid).
 *   - Nothing scrolls sideways: the viewer itself swipes sideways between events.
 * Hidden when there's only one post.
 */
function postsHtml(event: DanceEvent, selected: number, showAll: boolean): string {
  if (event.media.length < 2) return "";
  const kind = postKind(event.media[selected] ?? event.media[0]);
  const groups = POST_KINDS.map((group) => ({
    ...group,
    indexes: event.media.flatMap((media, index) => (postKind(media) === group.kind ? [index] : [])),
  })).filter((group) => group.indexes.length > 0);
  const current = groups.find((group) => group.kind === kind) ?? groups[0]!;
  const items = current.indexes;
  const collapsed = items.length > VISIBLE_POSTS && !showAll && items.indexOf(selected) < VISIBLE_POSTS - 1;
  const shown = collapsed ? items.slice(0, VISIBLE_POSTS - 1) : items;
  const thumbs = shown
    .map((index, position) => postThumbHtml(event.media[index]!, index, position, items.length, index === selected))
    .join("");
  const more = collapsed
    ? `<button class="post-thumbs__more" type="button" data-show-all-posts
        aria-label="Ver los ${items.length} ${current.label.toLowerCase()}">+${items.length - shown.length}</button>`
    : "";
  const header =
    groups.length > 1
      ? `<div class="post-tabs" role="group" aria-label="Publicaciones de este evento">${groups
          .map(
            (group) => `
              <button class="post-tabs__tab" type="button" data-post-kind="${group.kind}"
                data-first-post="${group.indexes[0]}" aria-pressed="${group.kind === current.kind}">
                ${group.label} <span class="post-tabs__count">${group.indexes.length}</span>
              </button>`,
          )
          .join("")}</div>`
      : `<p class="post-thumbs__label">${postCountLabel(items.length)} sobre este evento</p>`;
  return `
    <div class="post-thumbs${collapsed ? "" : " is-all"}">
      ${header}
      <div class="post-thumbs__grid" role="group" aria-label="${groups.length > 1 ? current.label : "Publicaciones de este evento"}">${thumbs}${more}</div>
    </div>`;
}

function mediaHtml(event: DanceEvent, media: EventMedia): string {
  const flyer = flyerUrl(media);
  if (!flyer) return "";
  const isVideo = media.media_type === "VIDEO";
  // Its real size (read at build time) reserves its space before it loads: switching posts never
  // collapses the image to nothing and shifts everything below it.
  const size = media.width && media.height ? ` width="${media.width}" height="${media.height}"` : "";
  return `
    <a class="event-dialog__media" href="${escapeHtml(media.permalink)}" target="_blank" rel="noopener">
      <img src="${escapeHtml(flyer)}"${size} alt="${isVideo ? "Video" : "Flyer"} de ${escapeHtml(event.title)}" />
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
 * Clicks on the posts: a thumbnail shows that post (its image, "Ver en Instagram" link and caption), a
 * tab (Flyers / Videos) shows the first post of its kind, "+N" shows every post of the kind. Re-renders
 * the detail and keeps the focus where the visitor was (the first new thumbnail after "+N"). False when
 * the click wasn't on them.
 */
export function handlePostClick(
  container: HTMLElement,
  target: HTMLElement,
  render: (selected: number, showAllPosts: boolean) => void,
): boolean {
  const tab = target.closest<HTMLElement>("[data-post-kind]");
  if (tab) {
    if (tab.getAttribute("aria-pressed") !== "true") keepingScroll(container, () => render(Number(tab.dataset.firstPost ?? 0), false));
    container.querySelector<HTMLElement>(`[data-post-kind="${tab.dataset.postKind}"]`)?.focus({ preventScroll: true });
    return true;
  }
  const thumb = target.closest<HTMLElement>("[data-media-index]");
  const expand = target.closest<HTMLElement>("[data-show-all-posts]");
  if (!thumb && !expand) return false;
  const pressed = container.querySelector<HTMLElement>('[data-media-index][aria-pressed="true"]');
  const selected = Number((thumb ?? pressed)?.dataset.mediaIndex ?? 0);
  const showAll = Boolean(expand) || Boolean(container.querySelector(".post-thumbs.is-all"));
  keepingScroll(container, () => render(selected, showAll));
  const thumbs = [...container.querySelectorAll<HTMLElement>(".post-thumb")];
  const focus = expand ? thumbs[VISIBLE_POSTS - 1] : thumbs.find((item) => item.dataset.mediaIndex === String(selected));
  focus?.focus({ preventScroll: true });
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
