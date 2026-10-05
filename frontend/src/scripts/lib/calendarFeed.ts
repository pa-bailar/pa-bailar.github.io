// The calendar feed (/calendario.ics, iCalendar RFC 5545), written by pages/calendario.ics.ts. Pure, so it's tested
// (tests/calendarFeed.test.ts).
//
// A workshop series is one VEVENT per session, each with its own times and its own UID (the event's id and the
// session's date, so a session keeps its entry when the others change). Not one VEVENT with RDATEs: an RDATE can't
// give each session its own times, and Google Calendar ignores RDATE in imported feeds.

import type { DanceEvent } from "../types";
import { isSeries } from "./dates";
import { calendarDescription, eventPageUrl, eventTimes, locationText, sessionTimes, type EventTimes } from "./links";

/** Escape text values (backslash, semicolon, comma, newline). */
function text(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Fold lines longer than 75 bytes, as the format requires (continuation lines start with a space). */
function fold(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let size = 0;
  for (const char of line) {
    const charSize = encoder.encode(char).length;
    if (size + charSize > (parts.length ? 74 : 75)) {
      parts.push(current);
      current = "";
      size = 0;
    }
    current += char;
    size += charSize;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

interface Entry {
  uid: string;
  times: EventTimes;
  summary: string;
  description: string[];
}

/** The feed's entries for one event: one, or a series' one per session. */
export function calendarEntries(event: DanceEvent, host: string): Entry[] {
  if (!isSeries(event)) {
    return [{ uid: `${event.id}@${host}`, times: eventTimes(event), summary: event.title, description: calendarDescription(event) }];
  }
  const times = sessionTimes(event);
  return event.sessions.map((session, index) => ({
    uid: `${event.id}-${session.date.replaceAll("-", "")}@${host}`,
    times: times[index]!,
    summary: `${event.title} (sesión ${index + 1} de ${event.sessions.length})`,
    description: calendarDescription(event, session),
  }));
}

function entryLines(event: DanceEvent, entry: Entry, stamp: string): string[] {
  const { start, end, allDay } = entry.times;
  const when = allDay ? `;VALUE=DATE:` : `;TZID=America/Bogota:`;
  return [
    "BEGIN:VEVENT",
    `UID:${entry.uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART${when}${start}`,
    `DTEND${when}${end}`,
    `SUMMARY:${text(entry.summary)}`,
    `LOCATION:${text(locationText(event))}`,
    `DESCRIPTION:${text(entry.description.join("\n"))}`,
    `URL:${eventPageUrl(event)}`,
    "END:VEVENT",
  ];
}

/** The whole feed. `stamp`: when it was made, "20261002T110000Z"; `host`: the site's, for the UIDs. */
export function calendarFeed(events: DanceEvent[], stamp: string, host: string): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//Pa' Bailar//${host}//ES`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Pa' Bailar · Bogotá",
    "X-WR-CALDESC:Sociales y talleres de baile en Bogotá",
    "X-WR-TIMEZONE:America/Bogota",
    "REFRESH-INTERVAL;VALUE=DURATION:PT12H",
    "X-PUBLISHED-TTL:PT12H",
    // Bogotá: UTC−5 all year, no daylight saving time.
    "BEGIN:VTIMEZONE",
    "TZID:America/Bogota",
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:-0500",
    "TZOFFSETTO:-0500",
    "TZNAME:-05",
    "END:STANDARD",
    "END:VTIMEZONE",
    ...events.flatMap((event) => calendarEntries(event, host).flatMap((entry) => entryLines(event, entry, stamp))),
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
