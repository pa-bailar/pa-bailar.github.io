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

describe("groupByPeriod: far events by year", () => {
  const on = (date: string) => event({ id: date, date });
  const keysAndLabels = (dates: string[], today: string) =>
    groupByPeriod(dates.map(on), today).map((group) => [group.key, group.label]);

  it("past the six-month horizon, events are grouped by year", () => {
    expect(keysAndLabels(["2026-11-05", "2027-04-20", "2027-06-01", "2028-02-10"], "2026-10-07")).toEqual([
      ["2026-11", "Noviembre"],
      ["2027-04", "Abril de 2027"], // 6 months ahead: still a month
      ["anio-2027", "Más adelante en 2027"], // 8 months ahead: the rest of 2027
      ["anio-2028", "En 2028"],
    ]);
  });

  it("in December, next January still gets its own month", () => {
    expect(keysAndLabels(["2027-01-15", "2027-03-01", "2027-07-01"], "2026-12-10")).toEqual([
      ["2027-01", "Enero de 2027"],
      ["2027-03", "Marzo de 2027"],
      ["anio-2027", "Más adelante en 2027"],
    ]);
  });

  it("a year with no month of its own listed is just \"En <año>\"", () => {
    expect(keysAndLabels(["2027-05-10"], "2026-10-07")).toEqual([["anio-2027", "En 2027"]]);
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
