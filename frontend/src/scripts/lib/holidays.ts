// Colombia's public holidays (festivos), computed from the rules in the law, so nothing needs updating:
//   - fixed dates: Jan 1, May 1, Jul 20, Aug 7, Dec 8, Dec 25;
//   - "Ley Emiliani" (Ley 51 de 1983): these move to the next Monday when they don't fall on one:
//     Jan 6, Mar 19, Jun 29, Aug 15, Oct 12, Nov 1, Nov 11;
//   - from Easter: Holy Thursday and Good Friday, and (moved to Monday) Ascension (+39 days),
//     Corpus Christi (+60) and Sacred Heart (+68).

import { addDays, parseIsoDate, toIsoDate } from "./dates";

const FIXED = ["01-01", "05-01", "07-20", "08-07", "12-08", "12-25"];
const MOVED_TO_MONDAY = ["01-06", "03-19", "06-29", "08-15", "10-12", "11-01", "11-11"];
const EASTER_FIXED = [-3, -2]; // Holy Thursday, Good Friday
const EASTER_MOVED_TO_MONDAY = [39, 60, 68]; // Ascension, Corpus Christi, Sacred Heart

/** Easter Sunday (Gregorian calendar; the anonymous algorithm, as in Meeus). */
export function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return toIsoDate(new Date(year, month - 1, day));
}

/** The same date if it's a Monday, otherwise the next Monday. */
function nextMonday(iso: string): string {
  const weekday = parseIsoDate(iso).getDay(); // 0 = Sunday, 1 = Monday
  return addDays(iso, (8 - weekday) % 7);
}

/** All the holidays of a year, as "YYYY-MM-DD". */
export function colombianHolidays(year: number): Set<string> {
  const easter = easterSunday(year);
  return new Set([
    ...FIXED.map((monthDay) => `${year}-${monthDay}`),
    ...MOVED_TO_MONDAY.map((monthDay) => nextMonday(`${year}-${monthDay}`)),
    ...EASTER_FIXED.map((offset) => addDays(easter, offset)),
    ...EASTER_MOVED_TO_MONDAY.map((offset) => nextMonday(addDays(easter, offset))),
  ]);
}

const byYear = new Map<number, Set<string>>();

/** Is this date ("YYYY-MM-DD") a public holiday in Colombia? */
export function isHoliday(iso: string): boolean {
  const year = Number(iso.slice(0, 4));
  let holidays = byYear.get(year);
  if (!holidays) {
    holidays = colombianHolidays(year);
    byYear.set(year, holidays);
  }
  return holidays.has(iso);
}
