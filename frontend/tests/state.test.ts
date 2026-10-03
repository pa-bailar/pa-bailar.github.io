import { describe, expect, it } from "vitest";
import { addDays, daysOf, isMultiDay, lastDay, shownDay, todayIso } from "../src/scripts/lib/dates";
import {
  createInitialState,
  defaultDayForMonth,
  eventsInView,
  groupByDay,
  groupByPeriod,
  styleMatches,
  visibleEvents,
} from "../src/scripts/state";
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

describe("events over several days", () => {
  // Level Up: Friday 13 to Sunday 15 November 2026.
  const congress = event({ id: "level-up", date: "2026-11-13", end_date: "2026-11-15", event_type: "congress" });
  const social = event({ id: "social", date: "2026-11-14" });

  it("while it goes on, it's listed under Hoy, first", () => {
    for (const today of ["2026-11-13", "2026-11-14", "2026-11-15"]) {
      const groups = groupByPeriod([congress, social], today);
      expect(groups[0]?.key).toBe("hoy");
      expect(groups[0]?.events[0]?.id).toBe("level-up");
    }
    expect(groupByPeriod([congress], "2026-11-12").map((group) => group.key)).toEqual(["fin-de-semana"]); // the day before: Friday
  });

  it("the calendar shows it on each of its days, across months too", () => {
    const festival = event({ id: "aniversario", date: "2026-10-31", end_date: "2026-11-02" });
    const byDay = groupByDay([festival, congress, social]);
    expect([...byDay.keys()]).toEqual(["2026-10-31", "2026-11-01", "2026-11-02", "2026-11-13", "2026-11-14", "2026-11-15"]);
    expect(byDay.get("2026-11-14")?.map((e) => e.id)).toEqual(["level-up", "social"]);

    const calendar = (month: Date, selectedDay: string) => ({ ...createInitialState(), view: "calendar" as const, month, selectedDay });
    const all = [festival, congress, social];
    expect(eventsInView(all, calendar(new Date(2026, 9, 1), "2026-10-31")).map((e) => e.id)).toEqual(["aniversario"]);
    expect(visibleEvents(all, calendar(new Date(2026, 10, 1), "2026-11-02")).map((e) => e.id)).toEqual(["aniversario"]);
    expect(visibleEvents(all, calendar(new Date(2026, 10, 1), "2026-11-15")).map((e) => e.id)).toEqual(["level-up"]);
    expect(defaultDayForMonth([festival], new Date(2026, 10, 1))).toBe("2026-11-01");
  });

  it("it's upcoming until its last day", () => {
    const today = todayIso();
    const started = event({ id: "started", date: addDays(today, -2), end_date: today });
    const ended = event({ id: "ended", date: addDays(today, -3), end_date: addDays(today, -1) });
    const upcoming = { ...createInitialState(), view: "upcoming" as const };
    expect(eventsInView([ended, started], upcoming).map((e) => e.id)).toEqual(["started"]);
  });

  it("data without end_date is a one-day event", () => {
    const old = event({ date: "2026-10-24" });
    expect([isMultiDay(old), lastDay(old), daysOf(old)]).toEqual([false, "2026-10-24", ["2026-10-24"]]);
    expect(shownDay(congress, "2026-11-14")).toBe("2026-11-14");
    expect(shownDay(congress, "2026-11-10")).toBe("2026-11-13");
  });
});
