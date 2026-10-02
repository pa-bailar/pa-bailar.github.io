import { describe, expect, it } from "vitest";
import { colombianHolidays, easterSunday, isHoliday } from "../src/scripts/lib/holidays";

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
