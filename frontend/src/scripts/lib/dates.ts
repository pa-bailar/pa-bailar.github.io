// Date helpers. Event dates are plain "YYYY-MM-DD" strings in Bogotá local time.

import type { DanceEvent, Session } from "../types";

const DAY_MS = 24 * 60 * 60 * 1000;

export function parseIsoDate(iso: string): Date {
  const [year = 1970, month = 1, day = 1] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

const bogotaDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }); // "YYYY-MM-DD"

/** Today in Bogotá, whatever the visitor's (or the build machine's) timezone: events are Bogotá dates. */
export function todayIso(): string {
  return bogotaDate.format(new Date());
}

const bogotaClock = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Bogota",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Now in Bogotá, "YYYY-MM-DD HH:MM": compared with when an event is over (endsAt). */
export function nowInBogota(): string {
  const part = Object.fromEntries(bogotaClock.formatToParts(new Date()).map(({ type, value }) => [type, value]));
  return `${part.year}-${part.month}-${part.day} ${part.hour}:${part.minute}`;
}

/** The first day of the current month in Bogotá. */
export function currentMonth(): Date {
  return startOfMonth(parseIsoDate(todayIso()));
}

/** Calendar days, not 24-hour steps: a day across a DST change (the visitor's timezone) is 23 or 25 hours. */
export function addDays(iso: string, days: number): string {
  const date = parseIsoDate(iso);
  return toIsoDate(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days));
}

/** Whether two dates ("YYYY-MM-DD") are in the same month of the same year. */
export function sameMonth(a: string, b: string): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function daysInMonth(month: Date): number {
  return new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
}

/** Sunday that ends the (Monday-first) week containing `iso`. */
export function endOfWeek(iso: string): string {
  const date = parseIsoDate(iso);
  const daysToSunday = (7 - date.getDay()) % 7;
  return addDays(iso, daysToSunday);
}

/** Whole days from `fromIso` to `toIso` (0 = same day). */
export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((parseIsoDate(toIso).getTime() - parseIsoDate(fromIso).getTime()) / DAY_MS);
}

/** Column of the month's first day in a Monday-first week (0 = Monday). */
export function mondayOffset(month: Date): number {
  return (month.getDay() + 6) % 7;
}

// ---------- events over several days (end_date) and workshop series (sessions), docs/DATA.md ----------

/** What the day helpers read of an event. */
type EventDays = Pick<DanceEvent, "date" | "end_date" | "sessions">;

/** The event's last day: its end_date over several days (a series: its last session), else its date. It's upcoming
 * until then. */
export function lastDay(event: Pick<DanceEvent, "date" | "end_date">): string {
  return event.end_date ?? event.date;
}

/** Whether the event is a workshop series: one program on several separate, dated sessions. */
export function isSeries(event: EventDays): event is EventDays & { sessions: [Session, Session, ...Session[]] } {
  return (event.sessions?.length ?? 0) > 1;
}

/** Whether the event lasts several consecutive days (a congress, a festival weekend). A series isn't: it's only on
 * its sessions' days. */
export function isMultiDay(event: EventDays): boolean {
  return !isSeries(event) && Boolean(event.end_date) && lastDay(event) > event.date;
}

/** Every day the event is on: its date, every day from the first to the last ("2026-11-13", "2026-11-14",
 * "2026-11-15"), or a series' session days (not the days between them). */
export function daysOf(event: EventDays): string[] {
  if (isSeries(event)) return event.sessions.map((session) => session.date);
  const days: string[] = [];
  for (let day = event.date; day <= lastDay(event) && days.length < 31; day = addDays(day, 1)) days.push(day);
  return days;
}

/** A series' next session: the first on or after today; null once every one has passed (or for any other event). */
export function nextSession(event: EventDays, today = todayIso()): Session | null {
  return isSeries(event) ? (event.sessions.find((session) => session.date >= today) ?? null) : null;
}

/** The session a series shows (its card's date, the list's day): the next one, or the last once all have passed. */
export function shownSession(event: EventDays & { sessions: Session[] }, today = todayIso()): Session {
  return nextSession(event, today) ?? event.sessions.at(-1)!;
}

/** What endsAt reads of an event. */
type EventEnd = EventDays & Pick<DanceEvent, "start_time" | "end_time">;

/**
 * When the event is over, "YYYY-MM-DD HH:MM" in Bogotá: the end of its last day ("24:00"), or, for a night past
 * midnight (a one-day event, or a series' last session, ending before it starts: 21:00–03:00; end_date stays null,
 * docs/DATA.md), its end time the morning after. Over several days the times are the first day's start and the last
 * day's end, so they don't say that.
 */
export function endsAt(event: EventEnd): string {
  const last = lastDay(event);
  const times = isSeries(event) ? event.sessions.at(-1)! : isMultiDay(event) ? null : event;
  const { start_time: start, end_time: end } = times ?? {};
  return start && end && end > "00:00" && end < start ? `${addDays(last, 1)} ${end}` : `${last} 24:00`;
}

/**
 * Whether the event is still to come or on: before endsAt. The one rule for the list, "Guardados", the event page's
 * "Este evento ya pasó", a shared link and the 404 page. `now`: Bogotá's "YYYY-MM-DD HH:MM" (nowInBogota), or a day
 * alone, which means its start (anything still on that morning counts).
 */
export function isUpcoming(event: EventEnd, now = nowInBogota()): boolean {
  return now < endsAt(event);
}

/** The days the event is on from today: an event over several days counts on every day it runs through, a series on
 * every session to come; last night's social still on after midnight, today. ("Cuándo" and the search's days.) */
export function daysFrom(event: EventEnd & EventDays, today: string): string[] {
  const days = daysOf(event).filter((day) => day >= today);
  return days.length || !isUpcoming(event, today) ? days : [today];
}

/**
 * The day the list shows the event under: its date (a series: its next session's); today while it goes on after
 * starting on an earlier day (a congress since Friday is "Hoy", and so is last night's social still on at 1 a. m.).
 */
export function shownDay(event: EventEnd, today = todayIso()): string {
  const day = isSeries(event) ? shownSession(event, today).date : event.date;
  return day < today && isUpcoming(event, today) ? today : day;
}

/**
 * When the event starts on `day` ("HH:MM", or "" when it isn't known or the event began on an earlier day): a series'
 * session time, else its start time on its first day. Orders the events listed on one day.
 */
export function startOn(event: EventDays & Pick<DanceEvent, "start_time">, day: string): string {
  if (isSeries(event)) return event.sessions.find((session) => session.date === day)?.start_time ?? "";
  return day === event.date ? (event.start_time ?? "") : "";
}
