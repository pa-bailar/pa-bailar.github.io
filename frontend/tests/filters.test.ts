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
import {
  QUICK_STYLES,
  emptyResultsHtml,
  filterModel,
  rankedStyles,
  resultsButtonLabel,
  summaryLine,
} from "../src/scripts/views/filters";
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
  const options = (counted = all) => dateOptions(all, counted, TODAY).map((option) => [option.key, option.count]);

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
    const keys = dateOptions([today, festival], [today, festival], TODAY).map((option) => option.key);
    expect(keys).toEqual(["hoy", "fin-de-semana", "proxima-semana"]);
    expect(keys).not.toContain(TOMORROW);
  });

  it("counted with the other filters: options with nothing left stay, with 0 (dimmed, not hidden)", () => {
    expect(options([today])).toEqual([
      ["hoy", 1],
      [TOMORROW, 0],
      ["esta-semana", 0],
      ["fin-de-semana", 0],
      ["proxima-semana", 0],
      ["2026-11", 0],
    ]);
  });
});

describe("rhythm options", () => {
  it("ranked by how many events have them, families counting their variants", () => {
    const events = [
      event({ id: "a", styles: ["salsa caleña"] }),
      event({ id: "b", styles: ["salsa en línea"] }),
      event({ id: "c", styles: ["bachata"] }),
    ];
    expect(rankedStyles(events).map((o) => [o.style, o.count])).toEqual([
      ["salsa", 2],
      ["bachata", 1],
      ["salsa caleña", 1],
      ["salsa en línea", 1],
    ]);
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

  it("rhythms, dates and types each narrow the list; within a group, any choice", () => {
    expect(shown({ styles: ["salsa"], dates: ["hoy"] })).toEqual(["salsa-hoy"]);
    expect(shown({ styles: ["salsa", "bachata"], dates: ["hoy"] })).toEqual(["salsa-hoy", "bachata-hoy"]);
    expect(shown({ styles: ["salsa", "bachata"], dates: ["hoy"], types: ["workshop"] })).toEqual(["bachata-hoy"]);
    expect(shown({ types: ["workshop", "social"] })).toEqual(["salsa-hoy", "bachata-hoy", "salsa-luego"]);
    expect(shown({ styles: ["salsa"] })).toEqual(["salsa-hoy", "salsa-luego"]);
  });

  it("the calendar ignores the dates (it has its own days), and so does ⚙'s badge", () => {
    expect(shown({ view: "calendar", dates: ["hoy"] })).toHaveLength(3);
    expect(activeFilterCount({ ...state, view: "calendar", dates: ["hoy"] })).toBe(0);
  });

  it("⚙'s badge counts every choice: each date, rhythm and type, and the academy", () => {
    expect(activeFilterCount({ ...state, dates: ["hoy"], styles: ["salsa", "bachata"] })).toBe(3);
    expect(activeFilterCount({ ...state, dates: ["hoy", TOMORROW], types: ["social"], accountFilter: "academia" })).toBe(4);
    expect(activeFilterCount(state)).toBe(0);
  });

  it("Limpiar clears dates, rhythms, types and the academy, not the search nor Guardados", () => {
    const cleared = {
      ...state,
      styles: ["salsa"],
      dates: ["hoy"],
      types: ["social" as const],
      accountFilter: "academia",
      query: "topa",
      savedOnly: true,
    };
    clearFilters(cleared);
    expect([cleared.styles, cleared.dates, cleared.types, cleared.accountFilter]).toEqual([[], [], [], null]);
    expect([cleared.query, cleared.savedOnly]).toEqual(["topa", true]);
  });
});

describe("the filter chips (filterModel)", () => {
  const today = todayIso();
  const list = { ...createInitialState(), view: "upcoming" as const };
  const tonight = event({ id: "salsa-hoy", date: today, styles: ["salsa caleña"], event_type: "social" });
  const tomorrow = event({ id: "bachata-manana", date: addDays(today, 1), styles: ["bachata"], event_type: "workshop" });
  const later = event({ id: "kizomba-luego", date: addDays(today, 40), styles: ["kizomba", "otro"], event_type: "workshop" });
  const all = [tonight, tomorrow, later];
  const model = (changes: Partial<typeof list> = {}) => filterModel(all, { ...list, ...changes }, today);
  const pick = (options: { value: string }[], value: string) => options.find((option) => option.value === value);

  it("the bar's rhythms are always Salsa, Bachata, Urbano and Tango, in that order", () => {
    expect(model().quickStyles.map((option) => option.label)).toEqual(["Salsa", "Bachata", "Urbano", "Tango"]);
    expect(QUICK_STYLES).toHaveLength(4);
    // Nothing of Urbano here: dimmed in place, never hidden.
    expect(pick(model().quickStyles, "urbano")).toMatchObject({ count: 0, dimmed: true });
  });

  it("the bar's dates: Hoy and Mañana first, Mañana only with something on tomorrow", () => {
    expect(model().quickDates.map((option) => option.value).slice(0, 2)).toEqual(["hoy", TOMORROW]);
    expect(filterModel([tonight], list, today).quickDates.map((option) => option.value)).not.toContain(TOMORROW);
  });

  it("an option nothing would add is dimmed, not hidden; a chosen one stays removable", () => {
    const salsa = model({ styles: ["salsa"] });
    expect(pick(salsa.dates, TOMORROW)).toMatchObject({ count: 0, dimmed: true, chosen: false });
    expect(pick(salsa.styles, "salsa")).toMatchObject({ chosen: true, dimmed: false });
    const stuck = model({ styles: ["salsa"], dates: [TOMORROW] });
    expect(pick(stuck.dates, TOMORROW)).toMatchObject({ count: 0, chosen: true, dimmed: false });
    expect(stuck.shown).toBe(0);
  });

  it("rhythms counted with the other filters; Otros ritmos goes last", () => {
    const workshops = model({ types: ["workshop"] });
    expect(pick(workshops.styles, "salsa")).toMatchObject({ count: 0, dimmed: true });
    expect(pick(workshops.styles, "bachata")).toMatchObject({ count: 1 });
    expect(workshops.styles.at(-1)?.label).toBe("Otros ritmos");
  });

  it("types take several, each counted with the other filters", () => {
    const both = model({ types: ["social", "workshop"] });
    expect(both.shown).toBe(3);
    expect(both.types.map((option) => [option.value, option.count, option.chosen])).toEqual([
      ["workshop", 2, true],
      ["social", 1, true],
    ]);
  });

  it("choices without a chip of their own in the bar show as removable chips after ⚙", () => {
    const chosen = model({ dates: ["hoy"], styles: ["salsa", "kizomba"], types: ["social"], accountFilter: "academia" });
    expect(chosen.applied.map((item) => item.label)).toEqual(["Hoy", "Salsa", "Kizomba", "Social", "@academia"]);
    expect(chosen.extra.map((item) => item.label)).toEqual(["Kizomba", "Social", "@academia"]);
    expect(chosen.active).toBe(5);
  });

  it("the line under the bar: how many, and what's chosen", () => {
    const changes = { dates: ["hoy"], styles: ["salsa"] };
    expect(summaryLine(model(changes), { ...list, ...changes })).toEqual({ count: "1 evento", where: "", names: "Hoy, Salsa" });
  });

  it("in the calendar: no date chips, and the line says the month", () => {
    const month = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, 1);
    const calendar = { ...list, view: "calendar" as const, month, styles: ["salsa"], dates: ["hoy"] };
    const inCalendar = filterModel(all, calendar, today);
    expect(inCalendar.dates).toEqual([]);
    expect(inCalendar.quickStyles).toHaveLength(4);
    expect(inCalendar.active).toBe(1);
    const line = summaryLine(inCalendar, calendar);
    expect(`${line.count}${line.where} · ${line.names}`).toMatch(/^1 evento en [a-z]+ · Salsa$/);
  });

  it("the sheet's button says how many, or that there's nothing", () => {
    expect(resultsButtonLabel(12)).toBe("Ver 12 eventos");
    expect(resultsButtonLabel(1)).toBe("Ver 1 evento");
    expect(resultsButtonLabel(0)).toBe("Sin eventos: cambia los filtros");
  });

  it("empty results say why and offer the ways out", () => {
    const filtered = emptyResultsHtml({ ...list, styles: ["tango"] })!;
    expect(filtered).toContain("No hay eventos con estos filtros");
    expect(filtered).toContain("Prueba con otras fechas o ritmos.");
    expect(filtered).toContain("Limpiar filtros");
    const searched = emptyResultsHtml({ ...list, query: "<b>zouk" })!;
    expect(searched).toContain("No encontramos eventos");
    expect(searched).toContain("Nada coincide con «&lt;b&gt;zouk».");
    expect(searched).toContain("Borrar la búsqueda");
    expect(searched).not.toContain("Limpiar filtros");
    expect(emptyResultsHtml({ ...list, savedOnly: true, styles: ["tango"] })).toContain("Ver todos, no solo guardados");
    expect(emptyResultsHtml(list)).toBeNull();
  });
});
