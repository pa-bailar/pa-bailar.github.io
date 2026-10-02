import { afterEach, describe, expect, it, vi } from "vitest";
import { daysBetween, endOfWeek, todayIso } from "../src/scripts/lib/dates";

afterEach(() => vi.useRealTimers());

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
