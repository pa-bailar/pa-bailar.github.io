// Shape of data/events.json. Mirrors the backend's Pydantic models (StoredEvent in backend/pabailar/models.py).

export type EventType = "social" | "workshop" | "concert" | "festival" | "competition" | "show" | "other";

export interface Price {
  label: string;
  amount_cop: number;
  condition: string | null;
}

export type MediaType = "IMAGE" | "CAROUSEL_ALBUM" | "VIDEO";

/** One Instagram post announcing the event. */
export interface EventMedia {
  post_id: string;
  permalink: string;
  media_type: MediaType;
  published: string;
  flyer: string | null; // path relative to the site root, e.g. "flyers/123-0.webp"
  preview?: string | null; // videos: a short silent clip, e.g. "previews/123-0.mp4" (docs/DATA.md)
  slides?: number | null; // carousels: how many slides
  caption: string | null;
  width?: number; // the flyer's size in pixels, added at build time (src/data.ts)
  height?: number;
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
  date: string; // YYYY-MM-DD
  weekday: string | null;
  start_time: string | null; // HH:MM, 24-hour
  end_time: string | null;
  prices: Price[];
  artists: string[];
  activities: string[];
  contact: string | null;
  confidence: "high" | "medium" | "low";
  doubts: string[];
  account: string;
  media: [EventMedia, ...EventMedia[]]; // main post first (the latest flyer; videos after flyers); always at least one
}

/** data/meta.json */
export interface Meta {
  schema_version: number;
  generated_at: string; // ISO time of the last sweep that changed data (Bogotá)
  accounts?: string[]; // every account the sweep reads (docs/DATA.md); missing in data written before it existed
  stats?: unknown;
}

export type View = "upcoming" | "calendar";

export interface AppState {
  view: View;
  typeFilter: EventType | "all";
  styleFilter: string;
  accountFilter: string | null; // Instagram username, chosen by tapping it on a card
  query: string; // search text ("" = no search)
  savedOnly: boolean; // only the events the visitor saved ("Guardados")
  month: Date; // first day of the month shown in the calendar
  selectedDay: string; // YYYY-MM-DD
}
