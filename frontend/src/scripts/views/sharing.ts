// Sharing, through the phone's own menu (lib/share.ts):
//   - an event ("Compartir" on its card or in its details): its details, and its page's link, whose preview is its
//     link-preview image (/og/<id>.jpg, pages/og/[id].jpg.ts);
//   - a near period of the list (the share icon on "Hoy", "Esta semana", "Este finde", "Próxima semana"):
//     an image of its events (lib/shareCard.ts) and a list for WhatsApp, as filtered on screen;
//   - the visitor's plans ("Compartir mis planes" in Guardados): an image and the list, each with its link.
// A list's image is drawn ahead of time, when its button comes into view, because phones only allow
// sharing right at the tap: drawing it then would lose the tap. If it isn't ready, the text goes alone.

import type { DanceEvent } from "../types";
import { eventPageUrl, BASE_URL } from "../lib/links";
import { shareContent } from "../lib/share";
import { drawShareCard } from "../lib/shareCard";
import { eventShareText } from "../lib/shareText";

/** What a list's share button shares (data-share="<key>"). */
export interface ShareSource {
  title: string; // the image's title: "Este finde en Bogotá"
  subtitle: string; // "Viernes 2 al domingo 4 de octubre · Salsa"
  text: string; // the message
  events: DanceEvent[];
}

// Tagged so visits from shared links count as such (messaging apps hide where a visit came from).
const shareUrl = (url: string) => `${url}${url.includes("?") ? "&" : "?"}utm_source=compartido`;
const SITE_URL = new URL(BASE_URL, import.meta.env.SITE).href;

const sources = new Map<string, ShareSource>();
const images = new Map<string, File | null>(); // drawn images, by what they show
const drawing = new Set<string>();
let observer: IntersectionObserver | null = null;

const imageKey = (source: ShareSource) =>
  [source.title, source.subtitle, ...source.events.map((event) => event.id)].join("|");

function prepare(key: string) {
  const source = sources.get(key);
  if (!source) return;
  const id = imageKey(source);
  if (images.has(id) || drawing.has(id)) return;
  drawing.add(id);
  void drawShareCard(source)
    .catch(() => null)
    .then((file) => {
      images.set(id, file);
      drawing.delete(id);
    });
}

/** After every render: what each list's share button shares; images are drawn as buttons come into view. */
export function setShareSources(next: Map<string, ShareSource>) {
  sources.clear();
  next.forEach((source, key) => sources.set(key, source));
  observer?.disconnect();
  observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        const key = (entry.target as HTMLElement).dataset.share;
        if (entry.isIntersecting && key !== undefined) prepare(key);
      }),
    { rootMargin: "300px" },
  );
  document.querySelectorAll<HTMLElement>("[data-share]").forEach((button) => observer!.observe(button));
}

function shareSource(key: string) {
  const source = sources.get(key);
  if (!source) return;
  void shareContent({
    title: source.title,
    text: source.text,
    url: shareUrl(SITE_URL),
    file: images.get(imageKey(source)) ?? null,
  });
}

function shareEvent(event: DanceEvent) {
  void shareContent({ title: event.title, text: eventShareText(event), url: shareUrl(eventPageUrl(event)) });
}

/** Share buttons anywhere on the page: lists (data-share) and events (data-share-event, found by id). */
export function initSharing(findEvent: (id: string) => DanceEvent | undefined) {
  document.addEventListener("click", (domEvent) => {
    const target = domEvent.target as HTMLElement;
    const list = target.closest<HTMLElement>("[data-share]")?.dataset.share;
    const single = target.closest<HTMLElement>("[data-share-event]")?.dataset.shareEvent;
    if (list !== undefined) shareSource(list);
    else if (single !== undefined) {
      const event = findEvent(single);
      if (event) shareEvent(event);
    }
  });
}

/** The link of a saved event in "Mis planes", tagged like any shared link. */
export const plansEventUrl = (event: DanceEvent) => shareUrl(eventPageUrl(event));
