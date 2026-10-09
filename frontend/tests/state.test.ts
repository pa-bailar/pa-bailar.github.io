import { describe, expect, it } from "vitest";
import type { DanceEvent } from "../src/scripts/types";
import { addDays, daysOf, isMultiDay, lastDay, shownDay, todayIso } from "../src/scripts/lib/dates";
import {
  createInitialState,
  dayOrderKey,
  defaultDayForMonth,
  eventsInView,
  groupByDay,
  groupByPeriod,
  isFilterGroup,
  isView,
  styleMatches,
  visibleEvents,
} from "../src/scripts/state";
import { rankedStyles } from "../src/scripts/lib/filterModel";
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

describe("a day's events: by type in the owner's order, then by time (the owner, 8 Oct 2026)", () => {
  const day = "2026-11-14";
  // Each its own account's (an account's events of a day stay together: below).
  const at = (id: string, event_type: DanceEvent["event_type"], start_time: string | null) =>
    event({ id, account: id, date: day, event_type, start_time });
  const list = [
    at("taller-10", "workshop", "10:00"),
    at("concierto-sin-hora", "concert", null),
    at("social-21", "social", "21:00"),
    at("rumba-22", "party", "22:00"),
    at("social-sin-hora", "social", null),
    at("social-19", "social", "19:00"),
    at("concierto-20", "concert", "20:00"),
  ];

  it("socials, then rumbas, then workshops, then concerts; within each by time, one with no time last", () => {
    expect(groupByDay(list).get(day)?.map((item) => item.id)).toEqual([
      "social-19",
      "social-21",
      "social-sin-hora",
      "rumba-22",
      "taller-10",
      "concierto-20",
      "concierto-sin-hora",
    ]);
    expect(dayOrderKey(list[0], day) < dayOrderKey(list[1], day)).toBe(true);
  });

  // The owner, 8 Oct 2026: Bachatamania's competition (19:00) and its social (20:30) the same night had three other
  // accounts' events between them (sorted by type, the social came first and the competition after the workshops).
  it("an account's events of a day stay together where its first one goes, in the order they start", () => {
    const of = (id: string, account: string, event_type: DanceEvent["event_type"], start_time: string) =>
      event({ id, account, date: day, event_type, start_time });
    const night = [
      of("competencia", "bachatamania", "competition", "19:00"),
      of("taller-otro", "otra", "workshop", "16:00"),
      of("social", "bachatamania", "social", "20:30"),
      of("concierto", "bar", "concert", "21:00"),
      of("social-otro", "otra-mas", "social", "21:00"),
    ];
    const ids = ["competencia", "social", "social-otro", "taller-otro", "concierto"];
    expect(groupByDay(night).get(day)?.map((item) => item.id)).toEqual(ids);
    expect(groupByPeriod(night, "2026-11-12").flatMap((group) => group.events.map((item) => item.id))).toEqual(ids);
  });

  it("the list keeps the days in order, each ordered the same way", () => {
    const friday = event({ id: "taller-viernes", date: "2026-11-13", event_type: "workshop", start_time: "09:00" });
    const ids = groupByPeriod([...list, friday], "2026-11-12").flatMap((group) => group.events.map((item) => item.id));
    expect(ids[0]).toBe("taller-viernes"); // Friday before Saturday, whatever its type
    expect(ids.slice(1, 4)).toEqual(["social-19", "social-21", "social-sin-hora"]);
  });
});

describe("events over several days", () => {
  // Level Up: Friday 13 to Sunday 15 November 2026.
  const congress = event({ id: "level-up", date: "2026-11-13", end_date: "2026-11-15", event_type: "congress" });
  const social = event({ id: "social", date: "2026-11-14" });

  it("while it goes on, it's listed under Hoy (after the day's socials: the owner's order of types)", () => {
    for (const today of ["2026-11-13", "2026-11-14", "2026-11-15"]) {
      // The upcoming events, as the list gets them (on Sunday the social has passed).
      const groups = groupByPeriod([congress, social].filter((item) => lastDay(item) >= today), today);
      expect(groups[0]?.key).toBe("hoy");
      expect(groups[0]?.events.at(-1)?.id).toBe("level-up");
    }
    expect(groupByPeriod([congress, social], "2026-11-14")[0]?.events.map((item) => item.id)).toEqual(["social", "level-up"]);
    expect(groupByPeriod([congress], "2026-11-12").map((group) => group.key)).toEqual(["fin-de-semana"]); // the day before: Friday
  });

  it("the calendar shows it on each of its days, across months too", () => {
    const festival = event({ id: "aniversario", date: "2026-10-31", end_date: "2026-11-02" });
    const byDay = groupByDay([festival, congress, social]);
    expect([...byDay.keys()]).toEqual(["2026-10-31", "2026-11-01", "2026-11-02", "2026-11-13", "2026-11-14", "2026-11-15"]);
    expect(byDay.get("2026-11-14")?.map((e) => e.id)).toEqual(["social", "level-up"]); // a social before a congress

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

describe("values read from the page", () => {
  it("are a view or a filter group only when they name one", () => {
    expect(["upcoming", "calendar", "agenda", undefined].map(isView)).toEqual([true, true, false, false]);
    expect(["dates", "styles", "types", "account", undefined].map(isFilterGroup)).toEqual([true, true, true, false, false]);
  });
});
