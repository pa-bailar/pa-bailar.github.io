import { describe, expect, it } from "vitest";
import { addDays, todayIso } from "../src/scripts/lib/dates";
import {
  TOMORROW,
  activeFilterCount,
  clearFilters,
  createInitialState,
  dateOptions,
  groupByPeriod,
  listedDay,
  matchesDates,
  matchesFilters,
  matchesStyles,
  toggled,
} from "../src/scripts/state";
import { datesButtonLabel, rankedStyles, stylesButtonLabel } from "../src/scripts/views/filters";
import { event } from "./factories";

// Wednesday 2026-10-07: tomorrow is Thursday (in "Esta semana"), the weekend is 9–11, next week 12–18.
const TODAY = "2026-10-07";
const on = (id: string, date: string, more: Parameters<typeof event>[0] = {}) => event({ id, date, ...more });

describe("rhythms: any of the chosen", () => {
  const salsa = event({ styles: ["salsa caleña"] });
  const bachata = event({ styles: ["bachata sensual", "kizomba"] });
  const zouk = event({ styles: ["zouk"] });

  it("an event with any chosen rhythm matches (families include their variants)", () => {
    expect([salsa, bachata, zouk].filter((e) => matchesStyles(e, ["salsa", "kizomba"]))).toEqual([salsa, bachata]);
    expect([salsa, bachata, zouk].filter((e) => matchesStyles(e, []))).toHaveLength(3);
  });

  it("choosing again unchooses", () => {
    expect(toggled(["salsa"], "bachata")).toEqual(["salsa", "bachata"]);
    expect(toggled(["salsa", "bachata"], "salsa")).toEqual(["bachata"]);
  });
});

describe("dates: any of the chosen periods", () => {
  const tomorrow = on("manana", "2026-10-08");
  const saturday = on("sabado", "2026-10-10");
  // A festival from Sunday to Tuesday: on during the weekend and next week.
  const festival = on("festival", "2026-10-11", { end_date: "2026-10-13" });
  // Under way since Monday, until Thursday: today and tomorrow.
  const congress = on("congreso", "2026-10-05", { end_date: "2026-10-08" });

  it("an event is on during every period it runs through", () => {
    expect(matchesDates(festival, ["fin-de-semana"], TODAY)).toBe(true);
    expect(matchesDates(festival, ["proxima-semana"], TODAY)).toBe(true);
    expect(matchesDates(festival, ["hoy", "esta-semana"], TODAY)).toBe(false);
    expect(matchesDates(congress, ["hoy"], TODAY)).toBe(true);
    expect(matchesDates(congress, [TOMORROW], TODAY)).toBe(true);
  });

  it("several periods: an event on during any of them", () => {
    const all = [tomorrow, saturday, festival, congress];
    const chosen = (dates: string[]) => all.filter((e) => matchesDates(e, dates, TODAY)).map((e) => e.id);
    expect(chosen([TOMORROW])).toEqual(["manana", "congreso"]);
    expect(chosen(["hoy", "proxima-semana"])).toEqual(["festival", "congreso"]);
    expect(chosen([TOMORROW, "fin-de-semana"])).toEqual(["manana", "sabado", "festival", "congreso"]);
    expect(chosen([])).toHaveLength(4);
  });

  it("the list shows each event on its first day within the chosen periods, Mañana as a group of its own", () => {
    expect(listedDay(festival, ["proxima-semana"], TODAY)).toBe("2026-10-12");
    expect(listedDay(festival, [], TODAY)).toBe("2026-10-11");
    const groups = (dates: string[]) =>
      groupByPeriod([congress, tomorrow, saturday, festival].filter((e) => matchesDates(e, dates, TODAY)), TODAY, dates).map(
        (group) => [group.key, group.events.map((e) => e.id)],
      );
    expect(groups([TOMORROW, "proxima-semana"])).toEqual([
      [TOMORROW, ["congreso", "manana"]],
      ["proxima-semana", ["festival"]],
    ]);
    expect(groups(["hoy", TOMORROW])).toEqual([
      ["hoy", ["congreso"]],
      [TOMORROW, ["manana"]],
    ]);
    // Without "Mañana" chosen, tomorrow stays in its period.
    expect(groups(["esta-semana"])).toEqual([["esta-semana", ["congreso", "manana"]]]);
  });
});

describe("the date options", () => {
  const today = on("hoy", TODAY, { styles: ["salsa"] });
  const tomorrow = on("manana", "2026-10-08", { styles: ["bachata"] });
  const festival = on("festival", "2026-10-11", { end_date: "2026-10-13" });
  const november = on("noviembre", "2026-11-05");
  const all = [today, tomorrow, festival, november];
  const options = (counted = all, chosen: string[] = [], events = all) =>
    dateOptions(events, counted, chosen, TODAY).map((option) => [option.key, option.count]);

  it("every period with something on, Mañana right after Hoy, each with its count (multi-day events in each)", () => {
    expect(options()).toEqual([
      ["hoy", 1],
      [TOMORROW, 1],
      ["esta-semana", 1],
      ["fin-de-semana", 1],
      ["proxima-semana", 1],
      ["2026-11", 1],
    ]);
  });

  it("no Mañana when nothing is on tomorrow", () => {
    const keys = dateOptions([today, festival], [today, festival], [], TODAY).map((option) => option.key);
    expect(keys).toEqual(["hoy", "fin-de-semana", "proxima-semana"]);
    expect(keys).not.toContain(TOMORROW);
  });

  it("counted with the other filters: options with nothing left go, unless chosen", () => {
    const salsaOnly = [today];
    expect(options(salsaOnly)).toEqual([["hoy", 1]]);
    expect(options(salsaOnly, [TOMORROW])).toEqual([
      ["hoy", 1],
      [TOMORROW, 0],
    ]);
  });

  it("the date button names what's chosen, in order", () => {
    const list = dateOptions(all, all, [], TODAY);
    expect(datesButtonLabel(list, [])).toBe("Fechas");
    expect(datesButtonLabel(list, ["fin-de-semana"])).toBe("Finde");
    expect(datesButtonLabel(list, ["fin-de-semana", "hoy"])).toBe("Hoy + finde");
    expect(datesButtonLabel(list, [TOMORROW, "proxima-semana"])).toBe("Mañana + próx. semana");
    expect(datesButtonLabel(list, ["hoy", TOMORROW, "2026-11"])).toBe("3 fechas");
    expect(datesButtonLabel(list, ["hoy", "fin-de-semana"], true)).toBe("2 fechas"); // when both don't fit
    expect(datesButtonLabel(list, ["hoy"], true)).toBe("Hoy");
  });
});

describe("rhythm options", () => {
  const events = [
    event({ id: "a", styles: ["salsa caleña"] }),
    event({ id: "b", styles: ["salsa en línea"] }),
    event({ id: "c", styles: ["bachata"] }),
  ];

  it("counted with the other filters; rhythms with nothing left go, unless chosen", () => {
    const counted = events.slice(0, 1);
    expect(rankedStyles(events, counted, ["bachata"]).map((o) => [o.style, o.count])).toEqual([
      ["salsa", 1],
      ["salsa caleña", 1],
      ["bachata", 0],
    ]);
  });

  it("the rhythm button names the rhythm, or how many", () => {
    expect(stylesButtonLabel([])).toBe("Ritmo");
    expect(stylesButtonLabel(["salsa caleña"])).toBe("Salsa caleña");
    expect(stylesButtonLabel(["salsa", "bachata"])).toBe("2 ritmos");
  });
});

describe("filters together: AND across groups", () => {
  const today = todayIso();
  const state = { ...createInitialState(), view: "upcoming" as const };
  const salsaToday = event({ id: "salsa-hoy", date: today, styles: ["salsa"] });
  const bachataToday = event({ id: "bachata-hoy", date: today, styles: ["bachata"], event_type: "workshop" });
  const salsaLater = event({ id: "salsa-luego", date: addDays(today, 40), styles: ["salsa"] });
  const all = [salsaToday, bachataToday, salsaLater];
  const shown = (changes: Partial<typeof state>) => all.filter((e) => matchesFilters(e, { ...state, ...changes })).map((e) => e.id);

  it("rhythms, dates and type each narrow the list", () => {
    expect(shown({ styles: ["salsa"], dates: ["hoy"] })).toEqual(["salsa-hoy"]);
    expect(shown({ styles: ["salsa", "bachata"], dates: ["hoy"] })).toEqual(["salsa-hoy", "bachata-hoy"]);
    expect(shown({ styles: ["salsa", "bachata"], dates: ["hoy"], typeFilter: "workshop" })).toEqual(["bachata-hoy"]);
    expect(shown({ styles: ["salsa"] })).toEqual(["salsa-hoy", "salsa-luego"]);
  });

  it("the calendar ignores the dates (it has its own days), and so does the filter count", () => {
    expect(shown({ view: "calendar", dates: ["hoy"] })).toHaveLength(3);
    expect(activeFilterCount({ ...state, dates: ["hoy"], styles: ["salsa", "bachata"] })).toBe(2);
    expect(activeFilterCount({ ...state, view: "calendar", dates: ["hoy"] })).toBe(0);
  });

  it("Quitar filtros clears rhythms and dates", () => {
    const cleared = { ...state, styles: ["salsa"], dates: ["hoy"] };
    clearFilters(cleared);
    expect([cleared.styles, cleared.dates]).toEqual([[], []]);
  });
});
