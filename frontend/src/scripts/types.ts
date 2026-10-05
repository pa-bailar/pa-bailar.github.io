// Shape of data/events.json. Mirrors the backend's Pydantic models (StoredEvent in the backend's pa_bailar/models.py).

export type EventType =
  | "social"
  | "workshop"
  | "concert"
  | "festival"
  | "congress"
  | "competition"
  | "show"
  | "other";

export interface Price {
  label: string;
  amount_cop: number;
  condition: string | null;
}

// STORY: a screenshot of an Instagram story, added by hand (docs/DATA.md). Stories disappear after 24 hours, so its
// permalink is the account's profile and its flyer is the only copy of it.
export type MediaType = "IMAGE" | "CAROUSEL_ALBUM" | "VIDEO" | "STORY";

/** One Instagram post (or story) announcing the event. */
export interface EventMedia {
  post_id: string; // a story: "story-<hash>"
  permalink: string; // the post's link; a story: the account's profile, "https://www.instagram.com/<account>/"
  media_type: MediaType;
  published: string;
  flyer: string | null; // path relative to the site root, e.g. "flyers/123-0.webp"
  preview?: string | null; // videos: a short silent clip, e.g. "previews/123-0.mp4" (docs/DATA.md)
  slides?: number | null; // carousels: how many slides
  caption: string | null;
  width?: number; // the flyer's size in pixels, added at build time (src/data.ts)
  height?: number;
  version?: string; // a short hash of the flyer's file, added at build time (src/data.ts): its URL's ?v= (src/images.ts)
}

/** One dated session of a workshop series (docs/DATA.md, "Workshop series"). */
export interface Session {
  date: string; // YYYY-MM-DD
  start_time: string | null; // HH:MM, 24-hour
  end_time: string | null;
}

export interface DanceEvent {
  id: string;
  title: string;
  event_type: EventType;
  is_recurring: boolean;
  styles: string[];
  organizer: string | null;
  venue: string | null;
  address: string | null;
  area: string | null;
  date: string; // YYYY-MM-DD; over several days, the first one; a series, its first session's
  end_date?: string | null; // the last day of an event over several consecutive days, or a series' last session (docs/DATA.md); absent in older data
  sessions?: Session[] | null; // a workshop series: its 2 to 12 dated sessions, in order; null for any other event, absent in older data
  weekday: string | null;
  start_time: string | null; // HH:MM, 24-hour; a series: its first session's
  end_time: string | null;
  prices: Price[];
  artists: string[];
  activities: string[];
  contact: string | null;
  confidence: "high" | "medium" | "low";
  doubts: string[]; // build time only: the home page's JSON leaves them out (src/pageData.ts); no script reads them
  account: string;
  media: [EventMedia, ...EventMedia[]]; // main post first (the latest flyer; videos after flyers, stories last); always at least one
  bar?: boolean; // its account is a bar or club, open every week (docs/DATA.md); absent in older data
}

/** data/meta.json */
export interface Meta {
  schema_version: number;
  generated_at: string; // ISO time of the last sweep that changed data (Bogotá)
  accounts?: string[]; // every account the sweep reads (docs/DATA.md); missing in data written before it existed
  stats?: unknown;
}

/** The list ("Próximos", /), the calendar (/calendario/) and the visitor's saved events ("Guardados", /guardados/). */
export type View = "upcoming" | "calendar" | "saved";

export interface AppState {
  view: View;
  types: EventType[]; // event types chosen (none = every type): an event of any of them matches
  styles: string[]; // rhythms chosen (none = every rhythm): an event with any of them matches
  dates: string[]; // periods chosen in the list ("hoy", "manana", "fin-de-semana", "2026-11"…; none = every date)
  query: string; // search text ("" = no search)
  hideBars: boolean; // "Ocultar eventos de bares": no event with `bar: true` (remembered in this browser: state.ts, HIDE_BARS_KEY)
  month: Date; // first day of the month shown in the calendar
  selectedDay: string; // YYYY-MM-DD
}
