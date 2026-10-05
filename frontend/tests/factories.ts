import type { DanceEvent, EventMedia, Session } from "../src/scripts/types";

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

/** A workshop series' sessions on these days, each from 14:00 to 17:00 unless given. */
export function sessionsOn(dates: string[], times: Partial<Session> = {}): Session[] {
  return dates.map((date) => ({ date, start_time: "14:00", end_time: "17:00", ...times }));
}

/**
 * A workshop series as the backend stores it (docs/DATA.md, "Workshop series"): an "intensivo" on Sundays 8, 22 and 29
 * November and 6 December, 2:00 to 5:00 p. m.; `date`, `end_date` and the times are its first and last sessions'.
 */
export function seriesEvent(overrides: Partial<DanceEvent> = {}): DanceEvent {
  const sessions = overrides.sessions ?? sessionsOn(["2026-11-08", "2026-11-22", "2026-11-29", "2026-12-06"]);
  return event({
    id: "programa-intensivo-de-bachata-8-nov",
    title: "Programa intensivo de bachata",
    event_type: "workshop",
    styles: ["bachata"],
    date: sessions[0]!.date,
    end_date: sessions.at(-1)!.date,
    weekday: "domingo",
    start_time: sessions[0]!.start_time,
    end_time: sessions[0]!.end_time,
    sessions,
    ...overrides,
  });
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
