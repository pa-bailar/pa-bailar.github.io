import { afterEach, describe, expect, it, vi } from "vitest";
import { filterModel } from "../src/scripts/lib/filterModel";
import { createInitialState, dateOptions, groupByPeriod, listedDay, matchesFilters, visibleEvents } from "../src/scripts/state";
import type { AppState, DanceEvent } from "../src/scripts/types";
import { calendarDays } from "../src/scripts/views/calendarView";
import { event, seriesEvent, sessionsOn } from "./factories";

// Days in the search (the owner, 7 Oct 2026: "sábado", "hoy", "este finde" found nothing). Today: Wednesday 7 October.
const TODAY = "2026-10-07";
const on = (date: string, overrides = {}) => event({ id: `e-${date}`, date, ...overrides });
const list = (query: string, more: Partial<AppState> = {}): AppState => ({ ...createInitialState(), query, ...more });
/** Whether the list shows the event for `query` (its words and its days), as the filters' model decides. */
const finds = (query: string, found: DanceEvent, today = TODAY) => matchesFilters(found, list(query), undefined, today);

afterEach(() => {
  vi.useRealTimers();
});

describe("days in the search (lib/searchDays.ts)", () => {
  it("hoy, mañana, pasado mañana, esta noche", () => {
    expect(finds("hoy", on("2026-10-07"))).toBe(true);
    expect(finds("hoy", on("2026-10-08"))).toBe(false);
    expect(finds("esta noche", on("2026-10-07"))).toBe(true);
    expect(finds("mañana", on("2026-10-08"))).toBe(true);
    expect(finds("MAÑANA", on("2026-10-07"))).toBe(false);
    expect(finds("pasado mañana", on("2026-10-09"))).toBe(true);
  });

  it("a weekday is every one to come, singular or plural, with the words before it", () => {
    for (const query of ["sábado", "sabados", "el sábado", "este sábado", "el próximo sábado"]) {
      expect(finds(query, on("2026-10-10")), query).toBe(true);
      expect(finds(query, on("2026-10-17")), query).toBe(true);
      expect(finds(query, on("2026-10-11")), query).toBe(false);
    }
  });

  it("the weekend is Friday to Sunday, from today on: on a Saturday, Saturday and Sunday", () => {
    for (const query of ["finde", "este finde", "fin de semana", "este fin de semana"]) {
      expect(finds(query, on("2026-10-09")), query).toBe(true);
      expect(finds(query, on("2026-10-11")), query).toBe(true);
      expect(finds(query, on("2026-10-08")), query).toBe(false);
      expect(finds(query, on("2026-10-16")), query).toBe(false); // next weekend
    }
    expect(finds("finde", on("2026-10-10"), "2026-10-10")).toBe(true);
    expect(finds("finde", on("2026-10-11"), "2026-10-10")).toBe(true);
  });

  it("this week and the next", () => {
    expect(finds("esta semana", on("2026-10-11"))).toBe(true);
    expect(finds("esta semana", on("2026-10-12"))).toBe(false);
    for (const query of ["próxima semana", "la próxima semana", "semana que viene", "la otra semana"]) {
      expect(finds(query, on("2026-10-12")), query).toBe(true);
      expect(finds(query, on("2026-10-18")), query).toBe(true);
      expect(finds(query, on("2026-10-11")), query).toBe(false);
    }
  });

  it("a date, a month, a holiday", () => {
    expect(finds("15 de octubre", on("2026-10-15"))).toBe(true);
    expect(finds("15 octubre", on("2026-10-15"))).toBe(true);
    expect(finds("15 de octubre", on("2026-10-16"))).toBe(false);
    expect(finds("2 de enero", on("2027-01-02"))).toBe(true); // already past this year: next year's
    expect(finds("octubre", on("2026-10-20"))).toBe(true);
    expect(finds("octubre", on("2026-11-01"))).toBe(false);
    expect(finds("festivo", on("2026-10-12"))).toBe(true); // Día de la Raza, a Monday
    expect(finds("festivo", on("2026-10-13"))).toBe(false);
  });

  it("with other words, all still needed; several days, any of them", () => {
    expect(finds("salsa sábado", on("2026-10-10", { styles: ["salsa"] }))).toBe(true);
    expect(finds("salsa sábado", on("2026-10-10", { styles: ["bachata"] }))).toBe(false);
    expect(finds("viernes sábado", on("2026-10-09"))).toBe(true);
    expect(finds("viernes sábado", on("2026-10-10"))).toBe(true);
    expect(finds("viernes sábado", on("2026-10-08"))).toBe(false);
    expect(finds("clase de salsa el sábado", on("2026-10-10", { event_type: "workshop", title: "Salsa workshop" }))).toBe(true);
  });

  it("an event over several days, or a series, on any of its days to come", () => {
    const weekend = on("2026-10-09", { end_date: "2026-10-11" });
    expect(finds("sábado", weekend)).toBe(true);
    expect(finds("domingo", weekend)).toBe(true);
    expect(finds("lunes", weekend)).toBe(false);
    const sundays = seriesEvent({ sessions: sessionsOn(["2026-10-11", "2026-10-18"]), date: "2026-10-11", end_date: "2026-10-18" });
    expect(finds("domingo", sundays)).toBe(true);
    expect(finds("sábado", sundays)).toBe(false);
  });

  it("is by date, not the event's words: «de ayer y hoy» isn't today", () => {
    expect(finds("hoy", on("2026-10-08", { title: "Salsa de ayer y hoy" }))).toBe(false);
  });

  it("words that only join others are left out, unless the search is nothing else", () => {
    expect(finds("noche de salsa", on("2026-10-10", { title: "Noche salsera", styles: ["salsa"] }))).toBe(true);
    expect(finds("la", on("2026-10-10", { venue: "La Casona" }))).toBe(true);
    expect(finds("la", on("2026-10-10", { title: "Social", venue: null }))).toBe(false);
  });
});

// A searched day narrows the days an event is shown on, as "Cuándo" does, through the filters' one model (state.ts
// shownDays). The bug hunt of 7 Oct 2026: "viernes" listed a series under "Hoy" (its next session) and dotted its other
// days in the calendar; "Cuándo" counted and showed days the search didn't name.
describe("a searched day, in every view: the days shown are the ones named", () => {
  // Sessions on Wednesday 7 (today) and Friday 9 October.
  const habitar = seriesEvent({ id: "habitar", sessions: sessionsOn(["2026-10-07", "2026-10-09"]) });
  // From today to tomorrow.
  const twoDays = on("2026-10-07", { id: "dos-dias", end_date: "2026-10-08" });
  // Sessions on Wednesday 7 (today) and Saturday 10 October.
  const wedSat = seriesEvent({ id: "mie-sab", sessions: sessionsOn(["2026-10-07", "2026-10-10"]) });
  const calendar = (query: string, month = "2026-10", selectedDay = TODAY) =>
    list(query, { view: "calendar", month: new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1), selectedDay });

  it("the list shows an event under the first day the search names: not a series' other session, nor today", () => {
    expect(listedDay(habitar, list("viernes"), TODAY)).toBe("2026-10-09");
    expect(groupByPeriod([habitar], TODAY, list("viernes")).map((group) => group.key)).toEqual(["fin-de-semana"]);
    expect(listedDay(twoDays, list("mañana"), TODAY)).toBe("2026-10-08");
    expect(groupByPeriod([twoDays], TODAY, list("mañana")).map((group) => group.key)).toEqual(["esta-semana"]);
    expect(listedDay(habitar, list(""), TODAY)).toBe(TODAY); // no day searched: its next session, as before
  });

  it("the calendar puts it on the days named only, and a day not named lists nothing", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${TODAY}T17:00:00Z`));
    expect([...calendarDays([habitar], calendar("viernes")).keys()]).toEqual(["2026-10-09"]);
    expect(visibleEvents([habitar], calendar("viernes", "2026-10", TODAY))).toEqual([]);
    expect(visibleEvents([habitar], calendar("viernes", "2026-10", "2026-10-09"))).toEqual([habitar]);
    expect([...calendarDays([habitar], calendar("")).keys()]).toEqual(["2026-10-07", "2026-10-09"]); // no day searched
  });

  it("with \"Cuándo\": a day both name, or nothing; its options counted on the days the search names", () => {
    expect(matchesFilters(wedSat, list("sábado", { dates: ["hoy"] }), undefined, TODAY)).toBe(false);
    expect(matchesFilters(wedSat, list("sábado", { dates: ["fin-de-semana"] }), undefined, TODAY)).toBe(true);
    const counts = dateOptions([wedSat], [wedSat], TODAY, "sábado").map((option) => [option.key, option.count]);
    expect(counts).toEqual([
      ["hoy", 0],
      ["fin-de-semana", 1],
    ]);
    const model = filterModel([wedSat], list("sábado", { dates: ["hoy"] }), TODAY);
    expect([model.shown, model.when!.options[0]!.count]).toEqual([0, 1]); // "Cualquier fecha": the Saturday
  });

  it("an event across two months counts in a month only with a named day in it", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${TODAY}T17:00:00Z`));
    const festival = on("2026-10-30", { id: "festival", end_date: "2026-11-02" }); // Friday to Monday
    expect(filterModel([festival], calendar("sábado", "2026-11"), TODAY).shown).toBe(0); // its Saturday is 31 October
    expect(filterModel([festival], calendar("sábado", "2026-10"), TODAY).shown).toBe(1);
    expect([...calendarDays([festival], calendar("sábado", "2026-10")).keys()]).toEqual(["2026-10-31"]);
    expect(filterModel([festival], calendar("domingo", "2026-11"), TODAY).shown).toBe(1);
  });
});
