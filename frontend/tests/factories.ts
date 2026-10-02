import type { DanceEvent } from "../src/scripts/types";

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
