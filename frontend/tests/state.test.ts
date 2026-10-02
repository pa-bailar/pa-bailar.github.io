import { describe, expect, it } from "vitest";
import { groupByPeriod, styleMatches } from "../src/scripts/state";
import { rankedStyles } from "../src/scripts/views/filters";
import { event } from "./factories";

describe("groupByPeriod (today: Wednesday 2026-10-07)", () => {
  const today = "2026-10-07";
  const on = (date: string) => event({ id: date, date });
  const groups = groupByPeriod(
    ["2026-10-07", "2026-10-08", "2026-10-09", "2026-10-11", "2026-10-13", "2026-10-25", "2026-11-05", "2027-01-10"].map(on),
    today,
  );

  it("puts each event in its period, in order", () => {
    expect(groups.map((group) => [group.key, group.events.map((e) => e.date)])).toEqual([
      ["hoy", ["2026-10-07"]],
      ["esta-semana", ["2026-10-08"]],
      ["fin-de-semana", ["2026-10-09", "2026-10-11"]],
      ["proxima-semana", ["2026-10-13"]],
      ["resto-del-mes", ["2026-10-25"]],
      ["2026-11", ["2026-11-05"]],
      ["2027-01", ["2027-01-10"]],
    ]);
  });

  it("names months, with the year only outside this one", () => {
    expect(groups.find((group) => group.key === "2026-11")?.label).toBe("Noviembre");
    expect(groups.find((group) => group.key === "2027-01")?.label).toBe("Enero de 2027");
  });
});

describe("styles", () => {
  it("a family filter matches its variants", () => {
    expect(styleMatches("salsa caleña", "salsa")).toBe(true);
    expect(styleMatches("salsa", "salsa caleña")).toBe(false);
    expect(styleMatches("bachata", "salsa")).toBe(false);
  });

  it("rhythm options are ranked by how many events have them, families counting their variants", () => {
    const events = [
      event({ styles: ["salsa caleña"] }),
      event({ styles: ["salsa en línea"] }),
      event({ styles: ["bachata"] }),
    ];
    expect(rankedStyles(events).map((option) => [option.style, option.count])).toEqual([
      ["salsa", 2],
      ["bachata", 1],
      ["salsa caleña", 1],
      ["salsa en línea", 1],
    ]);
  });
});
