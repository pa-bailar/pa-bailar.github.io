import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { addDays, daysBetween, endOfWeek, todayIso } from "../src/scripts/lib/dates";

afterEach(() => vi.useRealTimers());

describe("addDays", () => {
  // A visitor in a timezone with daylight saving time: Node reads TZ again when it changes.
  const timezone = process.env.TZ;
  beforeAll(() => {
    process.env.TZ = "America/New_York";
  });
  afterAll(() => {
    if (timezone === undefined) delete process.env.TZ;
    else process.env.TZ = timezone;
  });

  it("counts calendar days across a DST change", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-11-01", 1)).toBe("2026-11-02"); // a 25-hour day
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09"); // a 23-hour day
    expect(addDays("2026-11-02", -1)).toBe("2026-11-01");
    expect(addDays("2026-10-28", 7)).toBe("2026-11-04");
  });

  it("crosses months and years", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("todayIso", () => {
  it("is Bogotá's date, whatever the machine's timezone", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-03T03:00:00Z")); // 22:00 on Oct 2 in Bogotá
    expect(todayIso()).toBe("2026-10-02");
  });
});

describe("weeks", () => {
  it("end on Sunday", () => {
    expect(endOfWeek("2026-10-07")).toBe("2026-10-11"); // Wednesday → Sunday
    expect(endOfWeek("2026-10-11")).toBe("2026-10-11");
  });

  it("count whole days between dates", () => {
    expect(daysBetween("2026-10-30", "2026-11-02")).toBe(3);
  });
});
