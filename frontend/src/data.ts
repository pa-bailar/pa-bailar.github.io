// The data the backend publishes (../data), typed once for every page. CI checks the files against the
// contract (scripts/check-data.mjs) before this cast is trusted. Typed even when events.json is empty: an
// empty list would otherwise be inferred as never[] and fail the type check.
// Build time only (Node): pages embed or render it; the browser gets it inside the page.
import path from "node:path";
import sharp from "sharp";
import rawEvents from "../../data/events.json";
import rawMeta from "../../data/meta.json";
import type { DanceEvent, EventMedia, Meta } from "./scripts/types";

export const DATA_DIR = import.meta.env.DATA_DIR; // the site's public folder (astro.config.mjs)

/** Each flyer's size in pixels, so cards show it at its own shape without the page jumping as images load. */
async function withFlyerSize(media: EventMedia): Promise<EventMedia> {
  if (!media.flyer) return media;
  try {
    const { width, height } = await sharp(path.join(DATA_DIR, media.flyer)).metadata();
    return width && height ? { ...media, width, height } : media;
  } catch {
    return media; // unreadable: the card falls back to the 4:5 frame
  }
}

export const events: DanceEvent[] = await Promise.all(
  (rawEvents as unknown as DanceEvent[]).map(async (event) => ({
    ...event,
    media: (await Promise.all(event.media.map(withFlyerSize))) as DanceEvent["media"],
  })),
);
export const meta = rawMeta as Meta;

/** Every account the sweep reads, for the footer's source list, with or without upcoming events. Data
 * written before meta.json listed them falls back to the accounts that have events. */
export const accounts = [...new Set([...(meta.accounts ?? []), ...events.map((event) => event.account)])].sort();
