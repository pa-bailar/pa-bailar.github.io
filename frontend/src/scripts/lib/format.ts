// Spanish (Colombia) display formatting.

import type { DanceEvent, EventType, MediaType, Session } from "../types";
import {
  addDays,
  daysBetween,
  isMultiDay,
  isSeries,
  lastDay,
  nextSession,
  parseIsoDate,
  sameMonth,
  shownSession,
  todayIso,
} from "./dates";
import { isHoliday } from "./holidays";

/** Spanish as written in Colombia: every date, month and price on the site. */
export const LOCALE = "es-CO";

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

/** A post's kind, as said to screen readers in the posts sheet: "Video 2 de 3". */
export function mediaTypeLabel(type: MediaType): string {
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
export function shortMonthName(iso: string): string {
  return shortMonth.format(parseIsoDate(iso)).replace(".", "");
}

/** "dom" (Intl writes "dom."). */
export function shortWeekdayName(iso: string): string {
  return shortWeekday.format(parseIsoDate(iso)).replace(".", "");
}

/** "dom 15" */
export function shortWeekdayAndDay(iso: string): string {
  return `${shortWeekdayName(iso)} ${parseIsoDate(iso).getDate()}`;
}

/**
 * The days of an event over several days, short: "Vie 13 – dom 15 nov", or across months "Sáb 31 oct – lun
 * 2 nov". `withMonth` false leaves the month out when both days are in the same one ("Vie 13 – dom 15").
 */
export function shortRangeLabel(start: string, end: string, withMonth = true): string {
  const oneMonth = sameMonth(start, end);
  const day = (iso: string, month: boolean) => `${shortWeekdayAndDay(iso)}${month ? ` ${shortMonthName(iso)}` : ""}`;
  return capitalize(`${day(start, !oneMonth)} – ${day(end, withMonth || !oneMonth)}`);
}

/**
 * The days a period covers, as the "Cuándo" menu's hint: "mié 7" (one day), "9–11 oct", "30 oct – 1 nov".
 */
export function spanLabel(start: string, end: string): string {
  const first = parseIsoDate(start);
  const last = parseIsoDate(end);
  if (start === end) return shortWeekdayAndDay(start);
  if (sameMonth(start, end)) return `${first.getDate()}–${last.getDate()} ${shortMonthName(end)}`;
  return `${first.getDate()} ${shortMonthName(start)} – ${last.getDate()} ${shortMonthName(end)}`;
}

/** "viernes 2 de octubre" (Intl puts a comma after the weekday; this doesn't). */
function dayName(iso: string, withMonth: boolean): string {
  const date = parseIsoDate(iso);
  return `${weekdayAndDay(iso)}${withMonth ? ` de ${monthOnly.format(date)}` : ""}`;
}

/** "Viernes 2 al domingo 4 de octubre", "Viernes 30 de octubre al domingo 1 de noviembre", or one day. */
export function dateRangeLabel(start: string, end: string): string {
  return capitalize(start === end ? dayName(end, true) : `${dayName(start, !sameMonth(start, end))} al ${dayName(end, true)}`);
}

/** "dom 8 nov": a session's day, short. */
export function sessionDayLabel(iso: string): string {
  return `${shortWeekdayAndDay(iso)} ${shortMonthName(iso)}`;
}

/**
 * A workshop series' sessions: "4 sesiones: 8, 22, 29 nov y 6 dic" (the backend's admin answers say it the same way),
 * with the year after each month when they span two years ("2 sesiones: 29 dic 2026 y 5 ene 2027").
 */
export function sessionsLabel(sessions: Pick<Session, "date">[]): string {
  const twoYears = new Set(sessions.map((session) => session.date.slice(0, 4))).size > 1;
  const parts = sessions.map(({ date }, index) => {
    const following = sessions[index + 1]?.date;
    const lastOfMonth = !following || !sameMonth(following, date);
    const day = String(parseIsoDate(date).getDate());
    return lastOfMonth ? `${day} ${shortMonthName(date)}${twoYears ? ` ${date.slice(0, 4)}` : ""}` : day;
  });
  const listed = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} y ${parts.at(-1)}` : parts.join("");
  return `${sessions.length} sesiones: ${listed}`;
}

/** "2:00 p. m. – 5:00 p. m." (as the details' "Cuándo"), "2:00 p. m." or "" (no start time). Each time is kept on one
 * line (no-break spaces): a narrow row wraps between them, never inside "p. m.". */
export function timeSpanLabel(start: string | null, end: string | null): string {
  const time = (value: string | null) => formatTime(value).replaceAll(" ", "\u00a0");
  return start ? [time(start), time(end)].filter(Boolean).join(" – ") : "";
}

/** Whether every session of a series has the same times (then they're said once, not on each session). */
export function sameSessionTimes(sessions: Session[]): boolean {
  return sessions.every((session) => session.start_time === sessions[0]?.start_time && session.end_time === sessions[0]?.end_time);
}

/** An event's day in full: "Sábado, 3 de octubre", its days: "Viernes 13 al domingo 15 de noviembre", or a series'
 * sessions: "4 sesiones: 8, 22, 29 nov y 6 dic". */
export function eventDaysLabel(event: DanceEvent): string {
  if (isSeries(event)) return sessionsLabel(event.sessions);
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
 * A workshop series on its card, by its next session: within a week like any event, with which session it is ("Hoy ·
 * 2:00 p. m. · sesión 2 de 4", "Mañana · …", "Domingo · …"); further away, "4 sesiones · próxima: dom 22 nov"; once
 * every session has passed, "4 sesiones · 8 nov – 6 dic".
 */
function seriesWhenLabel(sessions: Session[], today: string): string {
  const first = sessions[0]!;
  const last = sessions.at(-1)!;
  const next = nextSession({ date: first.date, end_date: last.date, sessions }, today);
  const count = `${sessions.length} sesiones`;
  if (!next) return `${count} · ${spanLabel(first.date, last.date)}`;
  const days = daysBetween(today, next.date);
  if (days >= 7) return `${count} · próxima: ${sessionDayLabel(next.date)}`;
  const day = days === 0 ? "Hoy" : days === 1 ? "Mañana" : capitalize(weekdayName.format(parseIsoDate(next.date)));
  const which = `sesión ${sessions.indexOf(next) + 1} de ${sessions.length}`;
  return [day, formatTime(next.start_time), which].filter(Boolean).join(" · ");
}

/**
 * When an event happens, as shown on its card: "Hoy · 8:00 p. m.", "Mañana · 6:00 p. m.",
 * "Sábado · 8:00 p. m." within a week, "Martes 20 oct. · 7:00 p. m." further away. An event over several
 * days shows its days instead (multiDayWhenLabel); a workshop series, its next session (seriesWhenLabel).
 */
export function cardWhenLabel(event: DanceEvent, today = todayIso()): string {
  if (isSeries(event)) return seriesWhenLabel(event.sessions, today);
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
 * shows its days ("13–15", `range`); across months, its first day (the card's text gives the range). A workshop
 * series shows its next session as of `today` (the last once all have passed).
 */
export function stickerDate(
  event: Pick<DanceEvent, "date" | "end_date" | "sessions">,
  today = todayIso(),
): { day: string; month: string; range: boolean } {
  const day = (iso: string) => String(parseIsoDate(iso).getDate()).padStart(2, "0");
  if (isSeries(event)) {
    const shown = shownSession(event, today).date;
    return { day: day(shown), month: shortMonthName(shown).toUpperCase(), range: false };
  }
  const end = lastDay(event);
  const range = isMultiDay(event) && sameMonth(end, event.date);
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
