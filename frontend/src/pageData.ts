// The events as the home page embeds them (<script type="application/json" id="events-data">, HomePage.astro), which
// main.ts reads. Build time only.

import type { DanceEvent, EventMedia } from "./scripts/types";
import { jsValue } from "./csp";

/**
 * The posts the site shows for an event: a story's screenshot only while the event has no post with a flyer. Once
 * the organizer posts it, the post's flyer is the event's image; the story repeated it, cropped another way and with
 * Instagram's stickers over it (the owner, 7 Oct 2026: Frank de la Torre's intensive showed its flyer twice, the
 * story added by hand and then his post). data/events.json keeps the story: it's still where the event was first
 * seen. Build time (src/data.ts), so every card, carousel, sheet and preview agrees.
 */
export function shownMedia(media: EventMedia[]): EventMedia[] {
  const posts = media.filter((item) => item.media_type !== "STORY");
  return posts.some((item) => item.flyer) ? posts : media;
}

/**
 * The events as JSON for the page: without `doubts` (the extraction's notes on what it assumed, which the site never
 * shows: data/events.json keeps them), and with "<" escaped so a caption can never end the script block early
 * (`jsValue`).
 */
export function pageEventsJson(events: DanceEvent[]): string {
  return jsValue(events.map(({ doubts: _doubts, ...event }) => event));
}
