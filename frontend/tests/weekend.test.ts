import { describe, expect, it } from "vitest";
import { weekendEvents, weekendOf } from "../src/scripts/lib/weekend";
import { event } from "./factories";

describe("este finde", () => {
  it("before Friday, it's the coming Friday to Sunday", () => {
    expect(weekendOf("2026-10-07")).toEqual({ start: "2026-10-09", end: "2026-10-11" }); // a Wednesday
  });

  it("from Friday on, what's left of it, from today", () => {
    expect(weekendOf("2026-10-09")).toEqual({ start: "2026-10-09", end: "2026-10-11" }); // Friday
    expect(weekendOf("2026-10-10")).toEqual({ start: "2026-10-10", end: "2026-10-11" }); // Saturday
    expect(weekendOf("2026-10-11")).toEqual({ start: "2026-10-11", end: "2026-10-11" }); // Sunday
  });

  it("takes only the weekend's events", () => {
    const dates = ["2026-10-08", "2026-10-09", "2026-10-11", "2026-10-12"];
    const events = dates.map((date) => event({ id: date, date }));
    expect(weekendEvents(events, "2026-10-07").map((item) => item.date)).toEqual(["2026-10-09", "2026-10-11"]);
  });
});
