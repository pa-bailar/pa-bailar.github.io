import type { DanceEvent, EventMedia } from "../src/scripts/types";

/**
 * A screenshot of an Instagram story, as the backend stores it (docs/DATA.md): a "story-<hash>" id, the account's
 * profile as its link, no caption, the cropped flyer.
 */
export function storyMedia(overrides: Partial<EventMedia> = {}): EventMedia {
  return {
    post_id: "story-3f9a1c2b7d4e5f60",
    permalink: "https://www.instagram.com/academia/",
    media_type: "STORY",
    published: "2026-10-04T18:30:00+0000",
    flyer: "flyers/story-3f9a1c2b7d4e5f60-0.webp",
    caption: null,
    ...overrides,
  };
}

/** An event announced only by a story: most never get a post. */
export function storyEvent(overrides: Partial<DanceEvent> = {}): DanceEvent {
  return event({ id: "social-de-bachata-24-oct", title: "Social de bachata", media: [storyMedia()], ...overrides });
}

/** A complete event with sensible defaults; override what the test is about. */
export function event(overrides: Partial<DanceEvent> = {}): DanceEvent {
  return {
    id: "social-24-oct",
    title: "Social",
    event_type: "social",
    is_recurring: false,
    styles: ["salsa"],
    organizer: null,
    venue: null,
    address: null,
    area: null,
    date: "2026-10-24",
    weekday: null,
    start_time: null,
    end_time: null,
    prices: [],
    artists: [],
    activities: [],
    contact: null,
    confidence: "high",
    doubts: [],
    account: "academia",
    media: [
      {
        post_id: "p1",
        permalink: "https://www.instagram.com/p/p1/",
        media_type: "IMAGE",
        published: "2026-10-01T12:00:00+0000",
        flyer: "flyers/p1.webp",
        caption: null,
      },
    ],
    ...overrides,
  };
}
