// Days in the search (the owner, 7 Oct 2026): "hoy", "mañana", "sábado", "este finde", "próxima semana", "octubre",
// "15 de octubre", "festivo" name days, in Bogotá (lib/search.ts), and the filters' model shows each event on the days
// named, as "Cuándo" does (state.ts shownDays). Several are any of them ("viernes sábado"); the search's other words
// still all apply ("salsa sábado"). Calendar days, not the "Cuándo" menu's periods (state.ts periodDays, where today is
// only "Hoy"): "finde" is Friday to Sunday. What's named isn't only the days to come: each view shows its own (the
// list from today, the calendar its month, Guardados the past too; the bug hunt of 7 Oct 2026). So a weekday is every
// one ("sábado": in the list, this one first, as it goes by date), and a date without its year every year's ("3 de
// octubre": in Guardados the one just past, in the list the next). Words folded (no accents).
// With words around a day (the same hunt: "sábado en la mañana" was read as tomorrow, "sábado 10" as every Saturday):
// a time of day keeps the day, the search has no hours ("sábado en la noche", "mañana por la tarde"); a weekday with a
// number is that day ("sábado 10": a Saturday the 10th; with a month, the date); "que viene" or "entrante" after a day
// is "próximo" before it; "el otro sábado", "el otro finde" are the ones after the coming one; a month written short
// counts beside a number ("17 de oct"), and a year after a month ("octubre de 2026").

import { addDays, addMonths, endOfWeek, parseIsoDate, toIsoDate } from "./dates";
import { isHoliday } from "./holidays";

/** Whether a day ("2026-10-10") is one the search names. */
export type DayTest = (day: string) => boolean;

const WEEKDAYS = new Map(
  Object.entries({ domingo: 0, domingos: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6, sabados: 6 }),
);

const MONTHS = new Map(
  Object.entries({
    enero: 1,
    febrero: 2,
    marzo: 3,
    abril: 4,
    mayo: 5,
    junio: 6,
    julio: 7,
    agosto: 8,
    septiembre: 9,
    setiembre: 9,
    octubre: 10,
    noviembre: 11,
    diciembre: 12,
  }),
);

/**
 * Day words that are also first names (Julio, Abril, Domingo Quiñones): said alone, they're also a name, found in the
 * events that have it (lib/search.ts searchedDays). The bug hunt of 7 Oct 2026; none in the data that day.
 */
export const DAY_NAMES = new Set(["julio", "abril", "domingo"]);

/** Months written short, read only right after a day's number ("17 de oct", "3 nov"): alone, "mar" is the sea. */
const SHORT_MONTHS = new Map(
  Object.entries({ ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, sept: 9, set: 9, oct: 10, nov: 11, dic: 12 }),
);

/** Said after a day, "próximo" said after it: "el sábado que viene", "el finde que viene", "el sábado entrante". */
const COMING = ["que viene", "entrante"];

/** The parts of a day: beside a day they keep it ("sábado en la noche"); alone they're left out (lib/search.ts). */
const TIMES = ["manana", "tarde", "noche", "madrugada"];

const between =
  (from: string, to: string): DayTest =>
  (day) =>
    day >= from && day <= to;
const on = (date: string) => between(date, date);
const both =
  (a: DayTest, b: DayTest): DayTest =>
  (day) =>
    a(day) && b(day);
const startsWith =
  (prefix: string): DayTest =>
  (day) =>
    day.startsWith(prefix);
const onWeekday =
  (weekday: number): DayTest =>
  (day) =>
    parseIsoDate(day).getDay() === weekday;
const pad = (n: number) => String(n).padStart(2, "0");

/** "15 de octubre", every year's: in the list the next one, in Guardados also the one just past. */
const onDate =
  (day: number, month: number): DayTest =>
  (iso) =>
    iso.slice(5) === `${pad(month)}-${pad(day)}`;

/** The `n`th `weekday` (0 is Sunday) from `today`, today counting: the second is "el otro sábado". */
function nthWeekday(today: string, weekday: number, n: number): string {
  return addDays(today, ((weekday - parseIsoDate(today).getDay() + 7) % 7) + 7 * (n - 1));
}

/** The phrases that name a stretch of days around `today`, as [words, test]. Whole: the views keep their own days. */
function stretches(today: string): [string, DayTest][] {
  const sunday = endOfWeek(today);
  const weekend = between(addDays(sunday, -2), sunday); // Friday to Sunday
  const nextWeek = between(addDays(sunday, 1), addDays(sunday, 7));
  const nextMonth = startsWith(toIsoDate(addMonths(parseIsoDate(today), 1)).slice(0, 7));
  return [
    ["otro fin de semana", between(addDays(sunday, 5), addDays(sunday, 7))], // the weekend after the coming one
    ["otro finde", between(addDays(sunday, 5), addDays(sunday, 7))],
    ["fin de semana", weekend],
    ["finde", weekend],
    ["weekend", weekend],
    ["pasado manana", on(addDays(today, 2))],
    ["esta noche", on(today)],
    ["esta tarde", on(today)],
    ["esta manana", on(today)], // this morning
    ["hoy", on(today)],
    ["manana", on(addDays(today, 1))],
    ["esta semana", between(addDays(sunday, -6), sunday)], // Monday to Sunday
    ["proxima semana", nextWeek],
    ["semana que viene", nextWeek],
    ["semana entrante", nextWeek],
    ["otra semana", nextWeek], // "la otra semana", in Colombia
    ["este mes", startsWith(today.slice(0, 7))],
    ["proximo mes", nextMonth],
    ["mes que viene", nextMonth],
    ["mes entrante", nextMonth],
    ["otro mes", nextMonth],
    ["festivo", isHoliday],
    ["festivos", isHoliday],
  ];
}

/** Whether `words` from `at` are `phrase`. */
const saysAt = (words: string[], at: number, phrase: string) =>
  words.slice(at, at + phrase.split(" ").length).join(" ") === phrase;

/** A day of the month written as a number, 1 to 31; else 0. */
function dayNumber(word: string | undefined): number {
  const number = word && /^\d{1,2}$/.test(word) ? Number(word) : 0;
  return number <= 31 ? number : 0;
}

/** A year said after a month or a date ("de 2026", "del 2026", "2026") and how many words, or null. */
function yearAt(words: string[], at: number): [string, number] | null {
  const skip = words[at] === "de" || words[at] === "del" ? 1 : 0;
  const word = words[at + skip];
  return word && /^20\d\d$/.test(word) ? [word, skip + 1] : null;
}

/** A date: "15 de octubre", "15 oct", "17 de oct" (short only after the number), "octubre 15"; a year may follow. */
function dateAt(words: string[], at: number): [DayTest, number] | null {
  const number = dayNumber(words[at]);
  const skip = words[at + 1] === "de" ? 1 : 0;
  const after = words[at + 1 + skip] ?? "";
  const [day, month, length] = number
    ? [number, MONTHS.get(after) ?? SHORT_MONTHS.get(after), 2 + skip]
    : [dayNumber(words[at + 1]), MONTHS.get(words[at] ?? ""), 2];
  if (!day || !month) return null;
  const year = yearAt(words, at + length);
  return year ? [both(onDate(day, month), startsWith(year[0])), length + year[1]] : [onDate(day, month), length];
}

/** The day phrase at `at`, without what may follow it (daysAt). */
function dayAt(words: string[], at: number, today: string): [DayTest, number] | null {
  const stretch = stretches(today).find(([phrase]) => saysAt(words, at, phrase));
  if (stretch) return [stretch[1], stretch[0].split(" ").length];
  const date = dateAt(words, at);
  if (date) return date;
  const word = words[at]!;
  const next = WEEKDAYS.get(words[at + 1] ?? "");
  if ((word === "otro" || word === "otra") && next !== undefined) return [on(nthWeekday(today, next, 2)), 2];
  const weekday = WEEKDAYS.get(word);
  if (weekday !== undefined) {
    const dated = dateAt(words, at + 1); // "sábado 10 de octubre": the date, its weekday only said
    if (dated) return [dated[0], 1 + dated[1]];
    const number = dayNumber(words[at + 1]); // "sábado 10": a Saturday the 10th
    if (number) return [both(onWeekday(weekday), (day) => Number(day.slice(8)) === number), 2];
    return [onWeekday(weekday), 1];
  }
  const month = MONTHS.get(word);
  if (month === undefined) return null;
  const inMonth: DayTest = (day) => Number(day.slice(5, 7)) === month;
  const year = yearAt(words, at + 1);
  return year ? [both(inMonth, startsWith(year[0])), 1 + year[1]] : [inMonth, 1];
}

/**
 * How many words from `at` say a part of the day ("en la noche", "por la tarde", "de noche", "al mediodía"), or 0.
 * "la mañana" is the morning, never tomorrow. `afterDay`: right after a day, the part alone too ("sábado noche"),
 * except "mañana", a day of its own ("hoy, mañana").
 */
export function timeOfDayAt(words: string[], at: number, { afterDay = false } = {}): number {
  const [first = "", second = "", third = ""] = words.slice(at, at + 3);
  if (["en", "por", "de", "a"].includes(first) && second === "la" && TIMES.includes(third)) return 3;
  if (first === "la" && (second === "manana" || (afterDay && TIMES.includes(second)))) return 2;
  if (first === "de" && (second === "noche" || second === "madrugada")) return 2;
  if ((first === "al" || first === "a") && second === "mediodia") return 2;
  return afterDay && first !== "manana" && [...TIMES, "mediodia"].includes(first) ? 1 : 0;
}

/**
 * The days named by `words` (folded) from `at`: their test and how many words they take, with what keeps them ("que
 * viene", a part of the day), or null when they don't name days. Longest first: "fin de semana" before a word alone.
 */
export function daysAt(words: string[], at: number, today: string): [DayTest, number] | null {
  const day = dayAt(words, at, today);
  if (!day) return null;
  let length = day[1];
  const coming = COMING.find((phrase) => saysAt(words, at + length, phrase));
  if (coming) length += coming.split(" ").length;
  return [day[0], length + timeOfDayAt(words, at + length, { afterDay: true })];
}
