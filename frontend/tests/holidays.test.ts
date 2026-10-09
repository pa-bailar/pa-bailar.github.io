import { describe, expect, it } from "vitest";
import { colombianHolidays, easterSunday, isHoliday, weekendSpan } from "../src/scripts/lib/holidays";
import { groupByPeriod } from "../src/scripts/state";
import { periodShareTitle } from "../src/scripts/lib/shareText";
import { event } from "./factories";

// The official calendars (decree / published lists of festivos).
const OFFICIAL: Record<number, string[]> = {
  2026: [
    "2026-01-01", "2026-01-12", "2026-03-23", "2026-04-02", "2026-04-03", "2026-05-01",
    "2026-05-18", "2026-06-08", "2026-06-15", "2026-06-29", "2026-07-20", "2026-08-07",
    "2026-08-17", "2026-10-12", "2026-11-02", "2026-11-16", "2026-12-08", "2026-12-25",
  ],
  2027: [
    "2027-01-01", "2027-01-11", "2027-03-22", "2027-03-25", "2027-03-26", "2027-05-01",
    "2027-05-10", "2027-05-31", "2027-06-07", "2027-07-05", "2027-07-20", "2027-08-07",
    "2027-08-16", "2027-10-18", "2027-11-01", "2027-11-15", "2027-12-08", "2027-12-25",
  ],
};

describe("Colombian holidays", () => {
  it("Easter Sunday", () => {
    expect(easterSunday(2026)).toBe("2026-04-05");
    expect(easterSunday(2027)).toBe("2027-03-28");
  });

  for (const [year, dates] of Object.entries(OFFICIAL)) {
    it(`match the official ${year} calendar (18 festivos)`, () => {
      expect([...colombianHolidays(Number(year))].sort()).toEqual(dates);
    });
  }

  it("ordinary days are not holidays", () => {
    expect(isHoliday("2026-10-12")).toBe(true);
    expect(isHoliday("2026-10-13")).toBe(false);
  });
});

// The owner, 8 Oct 2026: a long weekend is "Este puente", the holidays next to it included.
describe("this week's weekend, a puente when holidays make it longer (weekendSpan)", () => {
  it("a Monday holiday (Columbus Day, moved to Mon 12 Oct 2026): Friday to Monday", () => {
    expect(weekendSpan("2026-10-07")).toEqual({ start: "2026-10-09", end: "2026-10-12", puente: true });
  });

  it("Holy Week: Holy Thursday and Good Friday join it (Thu 2 to Sun 5 Apr 2026)", () => {
    expect(weekendSpan("2026-03-30")).toEqual({ start: "2026-04-02", end: "2026-04-05", puente: true });
  });

  it("a holiday on its Friday (Christmas 2026) makes it a puente too", () => {
    expect(weekendSpan("2026-12-21")).toEqual({ start: "2026-12-25", end: "2026-12-27", puente: true });
  });

  it("no holiday: Friday to Sunday, the usual weekend", () => {
    expect(weekendSpan("2026-10-21")).toEqual({ start: "2026-10-23", end: "2026-10-25", puente: false });
  });

  it("the list names it, takes its Monday, and shares it as such", () => {
    const monday = event({ id: "lunes-festivo", date: "2026-10-12" });
    const tuesday = event({ id: "martes", date: "2026-10-13" });
    const [puente, nextWeek] = groupByPeriod([monday, tuesday], "2026-10-07");
    expect([puente?.key, puente?.label, puente?.shortLabel]).toEqual(["fin-de-semana", "Este puente", "Puente"]);
    expect(puente?.events.map((item) => item.id)).toEqual(["lunes-festivo"]);
    expect([nextWeek?.key, nextWeek?.events.map((item) => item.id)]).toEqual(["proxima-semana", ["martes"]]);
    expect(periodShareTitle(puente!)).toBe("Este puente en Bogotá");
    const [weekend] = groupByPeriod([event({ id: "sabado", date: "2026-10-24" })], "2026-10-21");
    expect([weekend?.label, periodShareTitle(weekend!)]).toEqual(["Este fin de semana", "Este finde en Bogotá"]);
  });
});
