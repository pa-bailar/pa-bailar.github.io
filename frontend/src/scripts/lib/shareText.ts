// The words of what's shared: a period of the list ("Este finde en Bogotá"), the visitor's saved events
// ("Mis planes para bailar") or one event. Written for WhatsApp (*bold*, one line per event), where most
// of it goes. Pure functions, so they're tested (tests/shareText.test.ts).

import type { DanceEvent } from "../types";
import { isMultiDay, isSeries, lastDay, shownSession, todayIso } from "./dates";
import { PUENTE } from "./holidays";
import {
  capitalize,
  eventCountLabel,
  eventDaysLabel,
  formatTime,
  placeLabel,
  priceSummary,
  sameSessionTimes,
  shortRangeLabel,
  shortWeekdayAndDay,
} from "./format";

/** The day an event is shared on, and its start time: its date, or a series' next session (as listed). */
function sharedDay(event: DanceEvent, today: string): { day: string; time: string | null } {
  if (!isSeries(event)) return { day: event.date, time: event.start_time };
  const session = shownSession(event, today);
  return { day: session.date, time: session.start_time };
}

/** "Sáb 3", "Vie 13 – dom 15" for an event over several days, or a series' next session. */
function shortDays(event: DanceEvent, today = todayIso()): string {
  if (isMultiDay(event)) return shortRangeLabel(event.date, lastDay(event), false);
  return capitalize(shortWeekdayAndDay(sharedDay(event, today).day));
}

/** "Sáb 3 · 6:00 p. m.": a line's start in a shared list (a series: its next session's day and time). */
function listDay(event: DanceEvent, today = todayIso()): string {
  const day = shortDays(event, today);
  const time = formatTime(sharedDay(event, today).time);
  return time ? `${day} · ${time}` : day;
}

/** "SÁB 3 · 6:00 p. m." or "VIE 13 – DOM 15": when, on a shared list's image (lib/shareCard.ts); a series: its next
 * session's day and time, as in the list's text. */
export function shareRowWhen(event: DanceEvent, today = todayIso()): string {
  return [shortDays(event, today).toUpperCase(), formatTime(sharedDay(event, today).time)].filter(Boolean).join(" · ");
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

/** One event: title, when, where and price (the link goes alongside, with the flyer as preview). A series: its
 * sessions ("4 sesiones: 8, 22, 29 nov y 6 dic"), with the time when every session has the same. */
export function eventShareText(event: DanceEvent): string {
  const start = isSeries(event) && !sameSessionTimes(event.sessions) ? null : event.start_time;
  const time = start ? ` · ${formatTime(start)}` : "";
  return [`*${event.title}*`, `${eventDaysLabel(event)}${time}`, placeLabel(event), priceSummary(event)]
    .filter(Boolean)
    .join("\n");
}

/** The near periods of the list that can be shared, and the title of their image (the weekend's when it's a puente:
 * periodShareTitle). */
export const PERIOD_SHARE_TITLES: Record<string, string> = {
  hoy: "Hoy en Bogotá",
  manana: "Mañana en Bogotá", // only when chosen in the date filter (state.ts, TOMORROW)
  "esta-semana": "Esta semana en Bogotá",
  "fin-de-semana": "Este finde en Bogotá",
  "proxima-semana": "La próxima semana en Bogotá",
};

/** A period's share title, as its group is named: the weekend's reads "Este puente en Bogotá" when it's one. */
export function periodShareTitle(group: { key: string; label: string }): string | undefined {
  return group.key === "fin-de-semana" && group.label === PUENTE.label ? PUENTE.share : PERIOD_SHARE_TITLES[group.key];
}
