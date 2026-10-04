// The words of what's shared: a period of the list ("Este finde en Bogotá"), the visitor's saved events
// ("Mis planes para bailar") or one event. Written for WhatsApp (*bold*, one line per event), where most
// of it goes. Pure functions, so they're tested (tests/shareText.test.ts).

import type { DanceEvent } from "../types";
import { isMultiDay, lastDay, parseIsoDate } from "./dates";
import {
  capitalize,
  eventCountLabel,
  eventDaysLabel,
  formatTime,
  placeLabel,
  priceSummary,
  shortRangeLabel,
} from "./format";

const LOCALE = "es-CO";

const part = (iso: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(LOCALE, options).format(parseIsoDate(iso));

/** "Sáb 3", or "Vie 13 – dom 15" for an event over several days. */
function shortDays(event: DanceEvent): string {
  if (isMultiDay(event)) return shortRangeLabel(event.date, lastDay(event), false);
  return capitalize(part(event.date, { weekday: "short", day: "numeric" }).replace(".", ""));
}

/** "SÁB 3" or "VIE 13 – DOM 15": the day on a share card's row. */
export function shortDayLabel(event: DanceEvent): string {
  return shortDays(event).toUpperCase();
}

/** "Sáb 3 · 6:00 p. m.": a line's start in a shared list. */
function listDay(event: DanceEvent): string {
  const day = shortDays(event);
  const time = formatTime(event.start_time);
  return time ? `${day} · ${time}` : day;
}

/** One line per event: "• Sáb 3 · 6:00 p. m. — *Salsa Freestyle* (@madyumdance)". */
function listLines(events: DanceEvent[]): string[] {
  return events.map((event) => `• ${listDay(event)} — *${event.title}* (@${event.account})`);
}

/** A period of the list: its name, then its events. */
export function periodShareText(heading: string, events: DanceEvent[]): string {
  return [`*${heading}* 💃🕺`, ...listLines(events)].join("\n");
}

/** The visitor's saved events, each with its own link (each opens with its flyer in the chat). */
export function plansShareText(events: DanceEvent[], eventUrl: (event: DanceEvent) => string): string {
  const lines = events.flatMap((event) => [...listLines([event]), `  ${eventUrl(event)}`]);
  return [`*Mis planes para bailar* 💃🕺 (${eventCountLabel(events.length)})`, ...lines].join("\n");
}

/** One event: title, when, where and price (the link goes alongside, with the flyer as preview). */
export function eventShareText(event: DanceEvent): string {
  const time = event.start_time ? ` · ${formatTime(event.start_time)}` : "";
  return [`*${event.title}*`, `${eventDaysLabel(event)}${time}`, placeLabel(event), priceSummary(event)]
    .filter(Boolean)
    .join("\n");
}

/** The near periods of the list that can be shared, and the title of their image. */
export const PERIOD_SHARE_TITLES: Record<string, string> = {
  hoy: "Hoy en Bogotá",
  manana: "Mañana en Bogotá", // only when chosen in the date filter (state.ts, TOMORROW)
  "esta-semana": "Esta semana en Bogotá",
  "fin-de-semana": "Este finde en Bogotá",
  "proxima-semana": "La próxima semana en Bogotá",
};
