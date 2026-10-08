// Days in the search (the owner, 7 Oct 2026): "hoy", "mañana", "sábado", "este finde", "próxima semana", "octubre",
// "15 de octubre", "festivo" name days, in Bogotá (lib/search.ts), and the filters' model shows each event on the days
// named, as "Cuándo" does (state.ts shownDays). Several are any of them ("viernes sábado"); the search's other words
// still all apply ("salsa sábado"). Calendar days, not the "Cuándo" menu's periods (state.ts periodDays, where today is
// only "Hoy"): "finde" is Friday to Sunday. What's named isn't only the days to come: each view shows its own (the
// list from today, the calendar its month, Guardados the past too; the bug hunt of 7 Oct 2026). So a weekday is every
// one ("sábado": in the list, this one first, as it goes by date), and a date without its year every year's ("3 de
// octubre": in Guardados the one just past, in the list the next). Words folded (no accents).

import { addDays, endOfWeek, parseIsoDate } from "./dates";
import { isHoliday } from "./holidays";

/** Whether a day ("2026-10-10") is one the search names. */
export type DayTest = (day: string) => boolean;

const WEEKDAYS: Record<string, number> = {
  domingo: 0,
  domingos: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
  sabados: 6,
};

const MONTHS: Record<string, number> = {
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
};

const between =
  (from: string, to: string): DayTest =>
  (day) =>
    day >= from && day <= to;

/** The phrases that name a stretch of days around `today`, as [words, test]. Whole: the views keep their own days. */
function stretches(today: string): [string, DayTest][] {
  const sunday = endOfWeek(today);
  const weekend = between(addDays(sunday, -2), sunday); // Friday to Sunday
  const nextWeek = between(addDays(sunday, 1), addDays(sunday, 7));
  const on = (day: string) => between(day, day);
  return [
    ["este fin de semana", weekend],
    ["fin de semana", weekend],
    ["este finde", weekend],
    ["finde", weekend],
    ["weekend", weekend],
    ["pasado manana", on(addDays(today, 2))],
    ["esta noche", on(today)],
    ["hoy", on(today)],
    ["manana", on(addDays(today, 1))],
    ["esta semana", between(addDays(sunday, -6), sunday)], // Monday to Sunday
    ["proxima semana", nextWeek],
    ["semana que viene", nextWeek],
    ["otra semana", nextWeek], // "la otra semana", in Colombia
    ["este mes", (day) => day.slice(0, 7) === today.slice(0, 7)],
    ["festivo", isHoliday],
    ["festivos", isHoliday],
  ];
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "15 de octubre", every year's: in the list the next one, in Guardados also the one just past. */
const onDate =
  (day: number, month: number): DayTest =>
  (iso) =>
    iso.slice(5) === `${pad(month)}-${pad(day)}`;

/**
 * The days named by `words` (folded) from `at`: their test and how many words they take, or null when they don't name
 * days. Longest first: "fin de semana" before a word on its own.
 */
export function daysAt(words: string[], at: number, today: string): [DayTest, number] | null {
  for (const [phrase, test] of stretches(today)) {
    const length = phrase.split(" ").length;
    if (words.slice(at, at + length).join(" ") === phrase) return [test, length];
  }
  const word = words[at]!;
  const number = /^\d{1,2}$/.test(word) ? Number(word) : 0;
  if (number >= 1 && number <= 31) {
    const skip = words[at + 1] === "de" ? 1 : 0; // "15 de octubre" or "15 octubre"
    const month = MONTHS[words[at + 1 + skip] ?? ""];
    if (month) return [onDate(number, month), 2 + skip];
  }
  const weekday = WEEKDAYS[word];
  if (weekday !== undefined) return [(day) => parseIsoDate(day).getDay() === weekday, 1];
  const month = MONTHS[word];
  if (month) return [(day) => Number(day.slice(5, 7)) === month, 1];
  return null;
}
