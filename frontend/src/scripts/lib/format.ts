// Spanish (Colombia) display formatting.

import type { DanceEvent, EventType, MediaType } from "../types";
import { addDays, daysBetween, isMultiDay, lastDay, parseIsoDate, todayIso } from "./dates";
import { isHoliday } from "./holidays";

const LOCALE = "es-CO";

const TYPE_LABELS: Record<EventType, string> = {
  social: "Social",
  workshop: "Taller",
  concert: "Concierto",
  festival: "Festival",
  congress: "Congreso",
  competition: "Competencia",
  show: "Show",
  other: "Otro",
};

const money = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const longDay = new Intl.DateTimeFormat(LOCALE, { weekday: "long", day: "numeric", month: "long" });
const monthYear = new Intl.DateTimeFormat(LOCALE, { month: "long", year: "numeric" });
const shortMonth = new Intl.DateTimeFormat(LOCALE, { month: "short" });

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function typeLabel(type: EventType): string {
  return TYPE_LABELS[type] ?? type;
}

const MEDIA_LABELS: Record<MediaType, string> = {
  IMAGE: "Flyer",
  CAROUSEL_ALBUM: "Carrusel",
  VIDEO: "Video",
  STORY: "Historia",
};

export function mediaLabel(type: MediaType): string {
  return MEDIA_LABELS[type] ?? "Publicación";
}

/** The catch-all rhythm in the data ("otro"): "Otros ritmos" wherever it's shown. */
export const OTHER_STYLE = "otro";

/** A rhythm as shown: "Salsa", "Salsa caleña", "Otros ritmos" (the filters, the cards, the details). */
export function styleLabel(style: string): string {
  return style === OTHER_STYLE ? "Otros ritmos" : capitalize(style);
}

/**
 * "Salsa · Mambo · Otros ritmos". The no-break space glues each dot to the word before it, so a wrapped line
 * never starts with a dot.
 */
export function stylesLabel(styles: string[], max = styles.length): string {
  return styles.slice(0, max).map(styleLabel).join(" · ");
}

/** "1 evento" / "5 eventos" */
export function eventCountLabel(count: number): string {
  return `${count} ${count === 1 ? "evento" : "eventos"}`;
}

/** "1 publicación" / "2 publicaciones" */
export function postCountLabel(count: number): string {
  return `${count} ${count === 1 ? "publicación" : "publicaciones"}`;
}

export function formatMoney(amountCop: number): string {
  return amountCop === 0 ? "Gratis" : money.format(amountCop);
}

/** "21:00" -> "9:00 p. m." */
export function formatTime(time: string | null): string {
  if (!time) return "";
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  const suffix = hours >= 12 ? "p. m." : "a. m.";
  return `${((hours + 11) % 12) + 1}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

/** "Sábado, 3 de octubre" */
export function formatLongDate(iso: string): string {
  return capitalize(longDay.format(parseIsoDate(iso)));
}

/** "Hoy · Jueves, 1 de octubre", "Mañana · …" or just the long date; "· Festivo" on public holidays. */
export function formatDayHeading(iso: string): string {
  const label = formatLongDate(iso) + (isHoliday(iso) ? " · Festivo" : "");
  if (iso === todayIso()) return `Hoy · ${label}`;
  if (iso === addDays(todayIso(), 1)) return `Mañana · ${label}`;
  return label;
}

const weekdayName = new Intl.DateTimeFormat(LOCALE, { weekday: "long" });
const dayAndMonth = new Intl.DateTimeFormat(LOCALE, { weekday: "long", day: "numeric", month: "short" });
const shortWeekday = new Intl.DateTimeFormat(LOCALE, { weekday: "short" });

/** "domingo 15" */
function weekdayAndDay(iso: string): string {
  const date = parseIsoDate(iso);
  return `${weekdayName.format(date)} ${date.getDate()}`;
}

/** "nov" (Intl writes "nov."). */
function shortMonthName(iso: string): string {
  return shortMonth.format(parseIsoDate(iso)).replace(".", "");
}

/**
 * The days of an event over several days, short: "Vie 13 – dom 15 nov", or across months "Sáb 31 oct – lun
 * 2 nov". `withMonth` false leaves the month out when both days are in the same one ("Vie 13 – dom 15").
 */
export function shortRangeLabel(start: string, end: string, withMonth = true): string {
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  const day = (iso: string, month: boolean) => {
    const date = parseIsoDate(iso);
    return `${shortWeekday.format(date).replace(".", "")} ${date.getDate()}${month ? ` ${shortMonthName(iso)}` : ""}`;
  };
  return capitalize(`${day(start, !sameMonth)} – ${day(end, withMonth || !sameMonth)}`);
}

/**
 * The days a period covers, as the "Cuándo" menu's hint: "mié 7" (one day), "9–11 oct", "30 oct – 1 nov".
 */
export function spanLabel(start: string, end: string): string {
  const first = parseIsoDate(start);
  const last = parseIsoDate(end);
  if (start === end) return `${shortWeekday.format(first).replace(".", "")} ${first.getDate()}`;
  if (start.slice(0, 7) === end.slice(0, 7)) return `${first.getDate()}–${last.getDate()} ${shortMonthName(end)}`;
  return `${first.getDate()} ${shortMonthName(start)} – ${last.getDate()} ${shortMonthName(end)}`;
}

/** "viernes 2 de octubre" (Intl puts a comma after the weekday; this doesn't). */
function dayName(iso: string, withMonth: boolean): string {
  const date = parseIsoDate(iso);
  return `${weekdayAndDay(iso)}${withMonth ? ` de ${monthOnly.format(date)}` : ""}`;
}

/** "Viernes 2 al domingo 4 de octubre", "Viernes 30 de octubre al domingo 1 de noviembre", or one day. */
export function dateRangeLabel(start: string, end: string): string {
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  return capitalize(start === end ? dayName(end, true) : `${dayName(start, !sameMonth)} al ${dayName(end, true)}`);
}

/** An event's day in full: "Sábado, 3 de octubre", or its days: "Viernes 13 al domingo 15 de noviembre". */
export function eventDaysLabel(event: DanceEvent): string {
  return isMultiDay(event) ? dateRangeLabel(event.date, lastDay(event)) : formatLongDate(event.date);
}

/**
 * An event over several days on its card, by where today falls: "Vie 13 – dom 15 nov" (further away),
 * "Viernes 13 – domingo 15" (this week), "Mañana · hasta el domingo 15", "Hoy · hasta el domingo 15", then
 * while it goes on "En curso · hasta el domingo 15", "En curso · termina mañana", "En curso · último día".
 */
function multiDayWhenLabel(event: DanceEvent, today: string): string {
  const end = lastDay(event);
  const untilEnd = `hasta el ${weekdayAndDay(end)}`;
  const days = daysBetween(today, event.date);
  if (today > end) return shortRangeLabel(event.date, end);
  if (today === end) return "En curso · último día";
  if (days === 0) return `Hoy · ${untilEnd}`;
  if (days < 0) return today === addDays(end, -1) ? "En curso · termina mañana" : `En curso · ${untilEnd}`;
  if (days === 1) return `Mañana · ${untilEnd}`;
  if (days < 7) return capitalize(`${weekdayAndDay(event.date)} – ${weekdayAndDay(end)}`);
  return shortRangeLabel(event.date, end);
}

/**
 * When an event happens, as shown on its card: "Hoy · 8:00 p. m.", "Mañana · 6:00 p. m.",
 * "Sábado · 8:00 p. m." within a week, "Martes 20 oct. · 7:00 p. m." further away. An event over several
 * days shows its days instead (multiDayWhenLabel).
 */
export function cardWhenLabel(event: DanceEvent, today = todayIso()): string {
  if (isMultiDay(event)) return multiDayWhenLabel(event, today);
  const days = daysBetween(today, event.date);
  const date = parseIsoDate(event.date);
  let day: string;
  if (days === 0) day = "Hoy";
  else if (days === 1) day = "Mañana";
  else if (days > 1 && days < 7) day = capitalize(weekdayName.format(date));
  else day = capitalize(dayAndMonth.format(date).replace(",", ""));
  const time = formatTime(event.start_time);
  return time ? `${day} · ${time}` : day;
}

const monthOnly = new Intl.DateTimeFormat(LOCALE, { month: "long" });

/** "octubre", or "octubre de 2027" with the year. */
export function formatMonthName(iso: string, withYear = false): string {
  const date = parseIsoDate(iso);
  return withYear ? monthYear.format(date) : monthOnly.format(date);
}

/** "Octubre de 2026" */
export function formatMonthTitle(month: Date): string {
  return capitalize(monthYear.format(month));
}

/**
 * Parts for the round date sticker: { day: "03", month: "OCT" }. An event over several days in one month
 * shows its days ("13–15", `range`); across months, its first day (the card's text gives the range).
 */
export function stickerDate(event: Pick<DanceEvent, "date" | "end_date">): { day: string; month: string; range: boolean } {
  const day = (iso: string) => String(parseIsoDate(iso).getDate()).padStart(2, "0");
  const end = lastDay(event);
  const range = isMultiDay(event) && end.slice(0, 7) === event.date.slice(0, 7);
  return {
    day: range ? `${day(event.date)}–${day(end)}` : day(event.date),
    month: shortMonthName(event.date).toUpperCase(),
    range,
  };
}

/** "Desde $ 20.000", "$ 15.000", "Gratis" or "" when there are no prices. */
export function priceSummary(event: DanceEvent): string {
  if (!event.prices.length) return "";
  const lowest = Math.min(...event.prices.map((price) => price.amount_cop));
  const amount = formatMoney(lowest);
  return event.prices.length > 1 && lowest > 0 ? `Desde ${amount}` : amount;
}

/** Venue (when different from the organizer), address and area joined with dots. */
export function placeLabel(event: DanceEvent): string {
  const venue = event.venue && event.venue !== event.organizer ? event.venue : null;
  return [venue, event.address, event.area].filter(Boolean).join(" · ");
}
