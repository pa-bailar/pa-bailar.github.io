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
  periodDays,
  toggled,
} from "../src/scripts/state";
import { spanLabel } from "../src/scripts/lib/format";
import { menuPlacement, nextOption } from "../src/scripts/views/whenMenu";
import {
  QUICK_STYLES,
  emptyResultsHtml,
  filterModel,
  rankedStyles,
  resultsButtonLabel,
  summaryLine,
  whenMenuHtml,
  whenModel,
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

  it("the bar's dates are one control, \"Cuándo\": Cualquier fecha, then Hoy and Mañana first (Mañana only with something on tomorrow)", () => {
    const when = model().when!;
    expect(when).toMatchObject({ label: "", name: "Cualquier fecha", chosen: false });
    expect(when.options.map((option) => option.value).slice(0, 3)).toEqual(["", "hoy", TOMORROW]);
    expect(when.options[0]).toMatchObject({ label: "Cualquier fecha", count: 3, chosen: true, dimmed: false });
    expect(filterModel([tonight], list, today).when!.options.map((option) => option.value)).not.toContain(TOMORROW);
  });

  it("\"Cuándo\" says the date chosen; several (chosen in the sheet) as the first and how many more", () => {
    const one = model({ dates: [TOMORROW] }).when!;
    expect(one).toMatchObject({ label: "Mañana", name: "Mañana", chosen: true });
    expect(one.options.find((option) => option.chosen)?.value).toBe(TOMORROW);
    expect(one.options[0]).toMatchObject({ chosen: false, count: 3 }); // "Cualquier fecha": every event again
    const two = model({ dates: ["hoy", TOMORROW] }).when!;
    expect(two).toMatchObject({ label: "Hoy +1", name: "Hoy y Mañana", chosen: true });
  });

  it("\"Cuándo\"'s options: counted with the other filters, dimmed when nothing's left, a period's days as a hint", () => {
    const bachata = model({ styles: ["bachata"] }).when!;
    expect(bachata.options.find((option) => option.value === "hoy")).toMatchObject({ count: 0, dimmed: true });
    expect(bachata.options.find((option) => option.value === TOMORROW)).toMatchObject({ count: 1, dimmed: false });
    expect(bachata.options[0]).toMatchObject({ count: 1, dimmed: false });
    const hoy = bachata.options.find((option) => option.value === "hoy")!;
    expect(hoy.hint).toMatch(/^[a-zé]{3} \d{1,2}$/); // "dom 4"
  });

  it("no date has a removable chip of its own: \"Cuándo\" shows every one", () => {
    const later40 = model({ dates: [later.date.slice(0, 7)], styles: ["kizomba"] });
    expect(later40.applied.map((item) => item.group)).toEqual(["dates", "styles"]);
    expect(later40.extra.map((item) => item.label)).toEqual(["Kizomba"]);
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
    expect(inCalendar.when).toBeNull();
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

describe("the \"Cuándo\" menu", () => {
  it("each near period's days, as its hint: \"mié 7\", \"9–11 oct\"; none for a month", () => {
    const hint = (key: string, today = TODAY) => {
      const days = periodDays(key, today);
      return days ? spanLabel(...days) : null;
    };
    expect(hint("hoy")).toBe("mié 7");
    expect(hint(TOMORROW)).toBe("jue 8");
    expect(hint("esta-semana")).toBe("jue 8");
    expect(hint("fin-de-semana")).toBe("9–11 oct");
    expect(hint("proxima-semana")).toBe("12–18 oct");
    expect(hint("resto-del-mes")).toBe("19–31 oct");
    expect(hint("2026-11")).toBeNull();
    // Across months; and on Saturday the weekend left is from tomorrow.
    expect(hint("fin-de-semana", "2026-10-28")).toBe("30 oct – 1 nov");
    expect(hint("fin-de-semana", "2026-10-10")).toBe("dom 11");
  });

  it("is a menu of radio items: Cualquier fecha first, the chosen one checked, a dimmed one aria-disabled", () => {
    const dates = [
      { group: "dates" as const, value: "hoy", label: "Hoy", short: "Hoy", count: 2, chosen: false, dimmed: false },
      { group: "dates" as const, value: "resto-del-mes", label: "Más adelante en octubre", short: "Resto de octubre", count: 0, chosen: false, dimmed: true },
      { group: "dates" as const, value: "2026-11", label: "Noviembre", short: "Noviembre", count: 5, chosen: true, dimmed: false },
    ];
    const when = whenModel(dates, 9, TODAY);
    expect(when.options.map((option) => option.label)).toEqual(["Cualquier fecha", "Hoy", "Resto de octubre", "Noviembre"]);
    const html = whenMenuHtml(when);
    const items = [...html.matchAll(/<button[^>]*>/g)].map(([tag]) => tag);
    expect(items).toHaveLength(4);
    expect(items.every((tag) => tag.includes('role="menuitemradio"') && tag.includes('tabindex="-1"'))).toBe(true);
    expect(items[0]).toContain('data-when=""');
    expect(items[0]).toContain('aria-checked="false"');
    expect(items[3]).toContain('aria-checked="true"');
    expect(items[2]).toContain('aria-disabled="true"');
    expect(items[1]).toContain('aria-label="Hoy (mié 7), 2 eventos"');
    expect(html).toContain("<small>19–31 oct</small>");
  });

  it("hangs under its chip, never past the screen's sides, as tall as the screen allows", () => {
    const bar = { left: 0, top: 0, bottom: 56, width: 375 };
    const chip = { left: 164, top: 8, bottom: 48, width: 58 };
    expect(menuPlacement(chip, bar, 304, 812)).toEqual({ left: 63, top: 52, maxHeight: 748 });
    expect(menuPlacement({ ...chip, left: 20 }, bar, 304, 812).left).toBe(20);
    // The bar further down the page (not pinned yet): the menu is shorter, but keeps about four options.
    const lower = { top: 400, bottom: 456 };
    expect(menuPlacement({ ...chip, top: 408, bottom: 448 }, { ...bar, ...lower }, 304, 812)).toEqual({ left: 63, top: 52, maxHeight: 348 });
    expect(menuPlacement({ ...chip, bottom: 700 }, bar, 304, 812).maxHeight).toBe(176);
  });

  it("the keyboard: ↓ ↑ wrap around, Home and End; other keys aren't moves", () => {
    expect(nextOption("ArrowDown", 0, 5)).toBe(1);
    expect(nextOption("ArrowDown", 4, 5)).toBe(0);
    expect(nextOption("ArrowUp", 0, 5)).toBe(4);
    expect(nextOption("ArrowUp", -1, 5)).toBe(4);
    expect(nextOption("Home", 3, 5)).toBe(0);
    expect(nextOption("End", 0, 5)).toBe(4);
    expect(nextOption("Enter", 0, 5)).toBeNull();
    expect(nextOption("ArrowDown", 0, 0)).toBeNull();
  });
});
