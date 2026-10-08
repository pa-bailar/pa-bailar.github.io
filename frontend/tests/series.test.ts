// Workshop series (docs/DATA.md, "Workshop series"): one event with its dated sessions, listed until the last one,
// under its next session's day.

import { afterEach, describe, expect, it, vi } from "vitest";
import { checkData } from "../scripts/check-data.mjs";
import { calendarEntries, calendarFeed } from "../src/scripts/lib/calendarFeed";
import { addDays, daysOf, isMultiDay, isSeries, lastDay, nextSession, shownDay } from "../src/scripts/lib/dates";
import { cardWhenLabel, eventDaysLabel, sessionsLabel, stickerDate } from "../src/scripts/lib/format";
import { eventTimes, feedbackUrl } from "../src/scripts/lib/links";
import { previewCard, previewTitle, previewVersion } from "../src/scripts/lib/linkPreview";
import { eventShareText, periodShareText, shareRowWhen } from "../src/scripts/lib/shareText";
import {
  createInitialState,
  dateOptions,
  defaultDayForMonth,
  eventsInView,
  groupByDay,
  groupByPeriod,
  listedDay,
  matchesDates,
  TOMORROW,
  visibleEvents,
} from "../src/scripts/state";
import type { DanceEvent } from "../src/scripts/types";
import { eventCardGridHtml } from "../src/scripts/views/eventCard";
import { eventDrawerHtml, sessionsHtml } from "../src/scripts/views/eventDetail";
import { filterModel } from "../src/scripts/lib/filterModel";
import { event, seriesEvent, sessionsOn } from "./factories";

// Sessions on Sundays 8, 22 and 29 November and 6 December 2026, 2:00 to 5:00 p. m.
const series = seriesEvent();
const festival = event({ id: "festival-13-nov", date: "2026-11-13", end_date: "2026-11-15" });

/** Runs `check` with Bogotá's date on `day` (noon there). */
function on(day: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${day}T17:00:00Z`));
}

afterEach(() => {
  vi.useRealTimers();
});

describe("a series' days (lib/dates.ts)", () => {
  it("is a series, not an event over several days, and is on its sessions' days only", () => {
    expect(isSeries(series)).toBe(true);
    expect(isMultiDay(series)).toBe(false);
    expect(daysOf(series)).toEqual(["2026-11-08", "2026-11-22", "2026-11-29", "2026-12-06"]);
    expect(lastDay(series)).toBe("2026-12-06");
  });

  it("events without sessions (absent or null) and events over several days are as before", () => {
    expect(isSeries(event())).toBe(false);
    expect(isSeries(event({ sessions: null }))).toBe(false);
    expect(isMultiDay(festival)).toBe(true);
    expect(daysOf(festival)).toEqual(["2026-11-13", "2026-11-14", "2026-11-15"]);
  });

  it.each([
    ["before the first session", "2026-10-20", "2026-11-08"],
    ["on the first session's day", "2026-11-08", "2026-11-08"],
    ["between sessions", "2026-11-09", "2026-11-22"],
    ["on a session's day", "2026-11-22", "2026-11-22"],
    ["the day after a session", "2026-11-23", "2026-11-29"],
    ["on the last session's day", "2026-12-06", "2026-12-06"],
  ])("its next session %s (%s): %s", (_, today, next) => {
    expect(nextSession(series, today)?.date).toBe(next);
    expect(shownDay(series, today)).toBe(next);
  });

  it("after its last session: no next one, its day stays the last", () => {
    expect(nextSession(series, "2026-12-07")).toBeNull();
    expect(shownDay(series, "2026-12-07")).toBe("2026-12-06");
  });
});

describe("a series in the upcoming list (groupByPeriod)", () => {
  const thursday = event({ id: "jueves", date: "2026-11-19", start_time: "20:00" });
  const sundayMorning = event({ id: "domingo-temprano", date: "2026-11-22", start_time: "10:00" });
  const sundayNight = event({ id: "domingo-noche", date: "2026-11-22", start_time: "19:00" });
  const december = event({ id: "diciembre", date: "2026-12-02" });
  // events.json order: by date, so the series (dated by its first session) comes first.
  const all = [series, festival, thursday, sundayMorning, sundayNight, december];
  const groups = (today: string, dates: string[] = []) =>
    groupByPeriod(all.filter((item) => lastDay(item) >= today), today, { dates }).map((group) => [
      group.key,
      group.events.map((item) => item.id),
    ]);

  it("is listed under its next session's period, in its place among that day's events (not under Hoy every day)", () => {
    // Wednesday 18 November: next session Sunday 22, at 2:00 p. m.
    expect(groups("2026-11-18")).toEqual([
      ["esta-semana", ["jueves"]],
      ["fin-de-semana", ["domingo-temprano", series.id, "domingo-noche"]],
      ["2026-12", ["diciembre"]],
    ]);
  });

  it("before its first session: under the first session's period", () => {
    expect(groups("2026-11-02")[0]).toEqual(["fin-de-semana", [series.id]]);
  });

  it("on a session's day: under Hoy", () => {
    expect(groups("2026-11-22")[0]).toEqual(["hoy", ["domingo-temprano", series.id, "domingo-noche"]]);
  });

  it("once a session passes, it moves to the following one", () => {
    // Monday 23 November: next session Sunday 29, this week's weekend.
    expect(groups("2026-11-23")).toEqual([
      ["fin-de-semana", [series.id]],
      ["proxima-semana", ["diciembre"]],
    ]);
    // Monday 30 November: the last session, Sunday 6 December.
    expect(groups("2026-11-30")).toEqual([
      ["esta-semana", ["diciembre"]],
      ["fin-de-semana", [series.id]],
    ]);
  });

  it("leaves the list after its last session", () => {
    on("2026-12-06");
    expect(eventsInView([series], createInitialState()).map((item) => item.id)).toEqual([series.id]);
    on("2026-12-07");
    expect(eventsInView([series], createInitialState())).toEqual([]);
  });

  it("with dates chosen, it's listed on its first session in them", () => {
    expect(listedDay(series, { dates: ["2026-12"] }, "2026-11-18")).toBe("2026-12-06");
    expect(groups("2026-11-18", ["2026-12"]).find(([key]) => key === "2026-12")).toEqual(["2026-12", ["diciembre", series.id]]);
  });
});

describe("a series in the date filters", () => {
  it("a period matches when a session to come falls in it, not the days between", () => {
    const today = "2026-11-23"; // Monday: the 29th this weekend, the 6th of December next week, nothing in between
    expect(matchesDates(series, ["fin-de-semana"], today)).toBe(true);
    expect(matchesDates(series, ["esta-semana"], today)).toBe(false);
    expect(matchesDates(series, ["proxima-semana"], today)).toBe(true);
    expect(matchesDates(series, ["2026-12"], "2026-11-18")).toBe(true);
    expect(matchesDates(series, ["hoy"], today)).toBe(false);
    // Sessions already past don't count.
    expect(matchesDates(series, ["hoy"], "2026-11-23")).toBe(false);
    expect(matchesDates(series, ["hoy"], "2026-11-22")).toBe(true);
  });

  it("its periods are options, counting it once each; Mañana when a session is tomorrow", () => {
    const options = (today: string) => dateOptions([series], [series], today).map((option) => [option.key, option.count]);
    // Wednesday 18 November: the 22nd (this weekend), the 29th (next week), the 6th (December).
    expect(options("2026-11-18")).toEqual([
      ["fin-de-semana", 1],
      ["proxima-semana", 1],
      ["2026-12", 1],
    ]);
    // Saturday 21 November: a session tomorrow.
    expect(options("2026-11-21")[0]).toEqual([TOMORROW, 1]);
    // November with two sessions to come still counts it once.
    expect(options("2026-10-20")).toEqual([
      ["2026-11", 1],
      ["2026-12", 1],
    ]);
  });

  it("\"Cuándo\" counts it once per period, and \"Mañana\" only the day before a session", () => {
    on("2026-11-21");
    const list = { ...createInitialState(), view: "upcoming" as const };
    const when = filterModel([series], list).when!;
    expect(when.options.map((option) => [option.value, option.count])).toEqual([
      ["", 1],
      [TOMORROW, 1],
      ["fin-de-semana", 1],
      ["proxima-semana", 1],
      ["2026-12", 1],
    ]);
    on("2026-11-23");
    expect(filterModel([series], list).when!.options.map((option) => option.value)).not.toContain(TOMORROW);
  });
});

describe("a series in the calendar", () => {
  const calendar = (month: string, selectedDay: string) => ({
    ...createInitialState(),
    view: "calendar" as const,
    month: new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1),
    selectedDay,
  });

  it("marks every session's day, not the days between", () => {
    const days = groupByDay([series]);
    expect([...days.keys()]).toEqual(["2026-11-08", "2026-11-22", "2026-11-29", "2026-12-06"]);
    expect(days.get("2026-11-15")).toBeUndefined();
  });

  it("a selected session day shows it, by its time that day; a day between doesn't", () => {
    const morning = event({ id: "manana-22", date: "2026-11-22", start_time: "10:00" });
    const night = event({ id: "noche-22", date: "2026-11-22", start_time: "21:00" });
    const ids = (day: string) => visibleEvents([series, morning, night], calendar("2026-11", day)).map((item) => item.id);
    expect(ids("2026-11-22")).toEqual(["manana-22", series.id, "noche-22"]);
    expect(groupByDay([series, morning, night]).get("2026-11-22")!.map((item) => item.id)).toEqual(ids("2026-11-22"));
    expect(ids("2026-11-15")).toEqual([]);
  });

  it("is in a month only with a session in it", () => {
    const spread = seriesEvent({ sessions: sessionsOn(["2026-10-25", "2026-12-06"]) });
    const months = (month: string) => eventsInView([spread], calendar(month, `${month}-01`)).length;
    expect([months("2026-10"), months("2026-11"), months("2026-12")]).toEqual([1, 0, 1]);
  });

  it("a month without today opens on its first session", () => {
    on("2026-10-04");
    expect(defaultDayForMonth([series], new Date(2026, 11, 1))).toBe("2026-12-06");
  });
});

describe("a series on its card and in its details", () => {
  it.each([
    ["further away", "2026-10-20", "4 sesiones · próxima: dom 8 nov"],
    ["the day before the first", "2026-11-07", "Mañana · 2:00 p. m. · sesión 1 de 4"],
    ["between sessions, further than a week", "2026-11-09", "4 sesiones · próxima: dom 22 nov"],
    ["on a session's day", "2026-11-22", "Hoy · 2:00 p. m. · sesión 2 de 4"],
    ["within a week of the next", "2026-11-25", "Domingo · 2:00 p. m. · sesión 3 de 4"],
    ["after the last", "2026-12-07", "4 sesiones · 8 nov – 6 dic"],
  ])("its card says when, %s (%s): %s", (_, today, label) => {
    expect(cardWhenLabel(series, today)).toBe(label);
  });

  it("a session's own time, not the first's", () => {
    const times = seriesEvent({ sessions: [...sessionsOn(["2026-11-08"]), ...sessionsOn(["2026-11-15"], { start_time: "10:00" })] });
    expect(cardWhenLabel(times, "2026-11-14")).toBe("Mañana · 10:00 a. m. · sesión 2 de 2");
  });

  it("its date sticker shows the next session's day and month", () => {
    expect(stickerDate(series, "2026-10-20")).toEqual({ day: "08", month: "NOV", range: false });
    expect(stickerDate(series, "2026-11-23")).toEqual({ day: "29", month: "NOV", range: false });
    expect(stickerDate(series, "2026-11-30")).toEqual({ day: "06", month: "DIC", range: false });
  });

  it("the card on screen shows its next session", () => {
    on("2026-11-23");
    const card = eventCardGridHtml([series]);
    expect(card).toContain("<b>29</b><small>NOV</small>");
    expect(card).toContain("Domingo · 2:00 p. m. · sesión 3 de 4");
  });

  it("says its sessions in one line, with the years when they span two", () => {
    expect(sessionsLabel(series.sessions!)).toBe("4 sesiones: 8, 22, 29 nov y 6 dic");
    expect(sessionsLabel(sessionsOn(["2026-12-29", "2027-01-05"]))).toBe("2 sesiones: 29 dic 2026 y 5 ene 2027");
    expect(eventDaysLabel(series)).toBe("4 sesiones: 8, 22, 29 nov y 6 dic");
  });

  it("the details list every session: those past dimmed, the next one marked", () => {
    const html = sessionsHtml(series, "2026-11-23");
    const items = html.split("<li").slice(1);
    expect(items).toHaveLength(4);
    expect(items.map((item) => /is-past|is-next/.exec(item)?.[0] ?? "")).toEqual(["is-past", "is-past", "is-next", ""]);
    expect(items[0]).toContain("Dom 8 nov");
    expect(items[0]).toContain("Ya pasó");
    expect(items[2]).toContain("Próxima");
    // The same times on every session are said once, in "Cuándo", not on each.
    expect(html).not.toContain("p. m.");
    expect(sessionsHtml(series, "2026-11-22")).toContain("Hoy");
    expect(sessionsHtml(event(), "2026-11-22")).toBe("");
  });

  it("each session's time when they differ", () => {
    const mixed = seriesEvent({
      sessions: [...sessionsOn(["2026-11-08"]), ...sessionsOn(["2026-11-15"], { start_time: "10:00", end_time: null })],
    });
    const html = sessionsHtml(mixed, "2026-11-01").replaceAll("\u00a0", " "); // each time on one line
    expect(html).toContain("2:00 p. m. – 5:00 p. m.");
    expect(html).toContain("10:00 a. m.");
    expect(eventDrawerHtml(mixed, { titleId: "t" })).toContain("horario de cada sesión abajo");
  });

  it("the drawer: \"Cuándo\" with every session and the time, then the sessions before the prices", () => {
    on("2026-11-23");
    const drawer = eventDrawerHtml(seriesEvent({ prices: [{ label: "Completo", amount_cop: 200000, condition: "hasta el 1 nov" }] }), {
      titleId: "t",
    });
    expect(drawer).toContain("4 sesiones: 8, 22, 29 nov y 6 dic · 2:00 p. m. – 5:00 p. m.");
    expect(drawer.indexOf("session-list")).toBeGreaterThan(drawer.indexOf("detail-list"));
    expect(drawer.indexOf("session-list")).toBeLessThan(drawer.indexOf("price-list"));
    expect(drawer).toContain("Domingo · 2:00 p. m. · sesión 3 de 4");
  });

  it("events without sessions have no list", () => {
    expect(eventDrawerHtml(event({ sessions: null }), { titleId: "t" })).not.toContain("session-list");
    expect(eventDrawerHtml(festival, { titleId: "t" })).not.toContain("session-list");
  });
});

describe("a series in calendars (calendario.ics)", () => {
  const host = "pa-bailar.github.io";
  const vevents = (feed: string) => feed.split("BEGIN:VEVENT").slice(1);

  it("one entry per session, each with its own times and UID", () => {
    const entries = calendarEntries(series, host);
    expect(entries.map((entry) => entry.uid)).toEqual([
      `${series.id}-20261108@${host}`,
      `${series.id}-20261122@${host}`,
      `${series.id}-20261129@${host}`,
      `${series.id}-20261206@${host}`,
    ]);
    expect(entries[1]).toMatchObject({
      times: { start: "20261122T140000", end: "20261122T170000", allDay: false },
      summary: "Programa intensivo de bachata (sesión 2 de 4)",
    });
    expect(entries[1]!.description.slice(0, 2)).toEqual(["Sesión 2 de 4 · 2:00 p. m.", "4 sesiones: 8, 22, 29 nov y 6 dic"]);
  });

  it("the feed: a VEVENT per session (a session without a time is all day), one for any other event", () => {
    const mixed = seriesEvent({ sessions: [...sessionsOn(["2026-11-08"]), ...sessionsOn(["2026-11-15"], { start_time: null, end_time: null })] });
    const feed = calendarFeed([mixed, festival, event()], "20261004T120000Z", host);
    const items = vevents(feed);
    expect(items).toHaveLength(4);
    expect(items[0]).toContain("DTSTART;TZID=America/Bogota:20261108T140000");
    expect(items[0]).toContain("DTEND;TZID=America/Bogota:20261108T170000");
    expect(items[1]).toContain("DTSTART;VALUE=DATE:20261115");
    expect(items[1]).toContain("DTEND;VALUE=DATE:20261116");
    expect(items[2]).toContain("DTSTART;VALUE=DATE:20261113");
    expect(items[2]).toContain("DTEND;VALUE=DATE:20261116");
    expect(items[3]).toContain(`UID:social-24-oct@${host}`);
    expect(feed).not.toContain("RDATE");
    expect(feed.split("\r\n").every((line) => new TextEncoder().encode(line).length <= 75)).toBe(true);
  });

  it("its first session for schema.org's start", () => {
    expect(eventTimes(series)).toEqual({ start: "20261108T140000", end: "20261108T170000", allDay: false });
  });
});

describe("a series when shared", () => {
  it("its link preview says how many sessions, from the first: the same any day", () => {
    expect(previewTitle(series, "2026-10-04")).toBe("Programa intensivo de bachata — 4 sesiones desde dom 8 nov, 2:00 p. m.");
    expect(previewCard(series, "2026-10-04")).toMatchObject({
      days: "4 sesiones desde el domingo 8 de noviembre",
      time: "2:00 p. m.",
      sticker: { day: "08", month: "NOV", range: false },
    });
    expect(previewVersion(series, "2026-10-04")).toBe(previewVersion(series, "2026-11-23"));
  });

  it("its text lists the sessions; a period's list gives its next session", () => {
    expect(eventShareText(series).split("\n")[1]).toBe("4 sesiones: 8, 22, 29 nov y 6 dic · 2:00 p. m.");
    on("2026-11-23");
    expect(periodShareText("Este finde en Bogotá", [series])).toContain("• Dom 29 · 2:00 p. m. — *Programa intensivo de bachata*");
  });

  it("a shared list's image gives its next session's day and time, not the first session's time", () => {
    const evenings = seriesEvent({
      sessions: [
        { date: "2026-11-08", start_time: "14:00", end_time: "17:00" },
        { date: "2026-11-22", start_time: "19:00", end_time: "21:00" },
      ],
    });
    expect(shareRowWhen(evenings, "2026-10-04")).toBe("DOM 8 · 2:00 p. m.");
    expect(shareRowWhen(evenings, "2026-11-10")).toBe("DOM 22 · 7:00 p. m.");
    on("2026-11-10");
    expect(shareRowWhen(evenings)).toBe("DOM 22 · 7:00 p. m.");
    expect(periodShareText("Próxima semana en Bogotá", [evenings])).toContain("• Dom 22 · 7:00 p. m.");
  });

  it("the report form names its sessions", () => {
    expect(decodeURIComponent(feedbackUrl(series).replaceAll("+", " "))).toContain("(2026-11-08, 2026-11-22, 2026-11-29, 2026-12-06)");
  });
});

describe("the data contract check, on series", () => {
  const meta = { schema_version: 1, generated_at: "2026-10-04T09:00:00-05:00", accounts: ["academia"] };
  const problems = (...events: DanceEvent[]) => checkData(events, meta, () => true);
  const withSessions = (dates: string[], overrides: Partial<DanceEvent> = {}) => seriesEvent({ sessions: sessionsOn(dates), ...overrides });

  it("passes a series, and events with sessions null or absent", () => {
    expect(problems(series)).toEqual([]);
    expect(problems(event({ sessions: null }), event({ id: "otro-25-oct", date: "2026-10-25" }))).toEqual([]);
    expect(problems(festival)).toEqual([]);
  });

  it("an end_date past 7 days without sessions is still refused", () => {
    expect(problems(event({ end_date: "2026-11-01" }))).toEqual([expect.stringContaining("bad end_date")]);
  });

  it("from 2 to 12 sessions", () => {
    const days = (count: number) => Array.from({ length: count }, (_, index) => addDays("2026-11-01", index * 7));
    expect(problems(withSessions(days(1)))).toEqual([expect.stringContaining("1 sessions: 2 to 12 expected")]);
    expect(problems(withSessions(days(12)))).toEqual([]);
    expect(problems(withSessions(days(13)))).toEqual([expect.stringContaining("13 sessions")]);
  });

  it("in order, without repeats, each a real date", () => {
    const unsorted = seriesEvent({ sessions: sessionsOn(["2026-11-22", "2026-11-08"]), date: "2026-11-22", end_date: "2026-11-08" });
    expect(problems(unsorted)).toContainEqual(expect.stringContaining("out of order or repeated"));
    expect(problems(withSessions(["2026-11-08", "2026-11-08"]))).toContainEqual(expect.stringContaining("out of order or repeated"));
    expect(problems(withSessions(["2026-11-08", "2026-11-31"]))).toContainEqual(expect.stringContaining("without a valid date"));
  });

  it("the last session at most 123 days in all after the first (end_date ≤ date + 122)", () => {
    expect(problems(withSessions(["2026-11-01", addDays("2026-11-01", 122)]))).toEqual([]);
    expect(problems(withSessions(["2026-11-01", addDays("2026-11-01", 123)]))).toEqual([
      expect.stringContaining("more than 123 days"),
    ]);
  });

  it("date and end_date are the first and last sessions'", () => {
    expect(problems(seriesEvent({ date: "2026-11-01" }))).toContainEqual(expect.stringContaining("first and last sessions' dates"));
    expect(problems(seriesEvent({ end_date: null }))).toContainEqual(expect.stringContaining("first and last sessions' dates"));
  });

  it("each session has both times, HH:MM or null", () => {
    expect(problems(seriesEvent({ sessions: sessionsOn(["2026-11-08", "2026-11-22"], { start_time: null, end_time: null }) }))).toEqual([]);
    expect(problems(seriesEvent({ sessions: sessionsOn(["2026-11-08", "2026-11-22"], { end_time: "25:00" }) }))).toContainEqual(
      expect.stringContaining("bad times in the session of 2026-11-08"),
    );
    const missing = seriesEvent();
    delete (missing.sessions![1] as Partial<(typeof missing.sessions)[number]>).end_time;
    expect(problems(missing)).toEqual([expect.stringContaining("bad times in the session of 2026-11-22")]);
  });

  it("sessions must be a list", () => {
    expect(problems(event({ sessions: "2026-11-08" as unknown as DanceEvent["sessions"] }))).toEqual([
      expect.stringContaining("sessions must be a list or null"),
    ]);
  });
});
