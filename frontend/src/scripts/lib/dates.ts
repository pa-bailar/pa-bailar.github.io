// Date helpers. Event dates are plain "YYYY-MM-DD" strings in Bogotá local time.

import type { DanceEvent } from "../types";

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

/** The first day of the current month in Bogotá. */
export function currentMonth(): Date {
  return startOfMonth(parseIsoDate(todayIso()));
}

/** Calendar days, not 24-hour steps: a day across a DST change (the visitor's timezone) is 23 or 25 hours. */
export function addDays(iso: string, days: number): string {
  const date = parseIsoDate(iso);
  return toIsoDate(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days));
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

// ---------- events over several days (end_date, docs/DATA.md) ----------

/** The event's last day: its end_date over several days, else its date. It's upcoming until then. */
export function lastDay(event: Pick<DanceEvent, "date" | "end_date">): string {
  return event.end_date ?? event.date;
}

/** Whether the event lasts several consecutive days (a congress, a festival weekend). */
export function isMultiDay(event: Pick<DanceEvent, "date" | "end_date">): boolean {
  return Boolean(event.end_date) && lastDay(event) > event.date;
}

/** Every day of the event, first to last ("2026-11-13", "2026-11-14", "2026-11-15"). */
export function daysOf(event: Pick<DanceEvent, "date" | "end_date">): string[] {
  const days: string[] = [];
  for (let day = event.date; day <= lastDay(event) && days.length < 31; day = addDays(day, 1)) days.push(day);
  return days;
}

/** The day the list shows the event under: its date, or today while it goes on (a congress since Friday is "Hoy"). */
export function shownDay(event: Pick<DanceEvent, "date" | "end_date">, today = todayIso()): string {
  return event.date < today && lastDay(event) >= today ? today : event.date;
}
