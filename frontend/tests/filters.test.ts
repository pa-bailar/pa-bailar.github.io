import { describe, expect, it } from "vitest";
import { addDays, parseIsoDate, todayIso } from "../src/scripts/lib/dates";
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
import { menuPlacement, nextOption, whenMenuHtml } from "../src/scripts/views/whenMenu";
import {
  filterModel,
  rankedStyles,
  resultsButtonLabel,
  summaryLine,
  whenModel,
} from "../src/scripts/lib/filterModel";
import { emptyResultsHtml } from "../src/scripts/views/filters";
import { TYPE_ORDER } from "../src/scripts/lib/format";
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
    expect(listedDay(festival, { dates: ["proxima-semana"] }, TODAY)).toBe("2026-10-12");
    expect(listedDay(festival, {}, TODAY)).toBe("2026-10-11");
    const groups = (dates: string[]) =>
      groupByPeriod([congress, tomorrow, saturday, festival].filter((e) => matchesDates(e, dates, TODAY)), TODAY, { dates }).map(
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
    const later = parseIsoDate(salsaLater.date);
    const month = new Date(later.getFullYear(), later.getMonth(), 1); // its month: not today's, still shown
    expect(shown({ view: "calendar", month, dates: ["hoy"] })).toEqual(["salsa-luego"]);
    expect(activeFilterCount({ ...state, view: "calendar", dates: ["hoy"] })).toBe(0);
  });

  it("⚙'s badge counts every choice: each date, rhythm and type", () => {
    expect(activeFilterCount({ ...state, dates: ["hoy"], styles: ["salsa", "bachata"] })).toBe(3);
    expect(activeFilterCount({ ...state, dates: ["hoy", TOMORROW], types: ["social"] })).toBe(3);
    expect(activeFilterCount(state)).toBe(0);
  });

  it("Limpiar clears dates, rhythms and types and shows the bars again, not the search", () => {
    const cleared = {
      ...state,
      styles: ["salsa"],
      dates: ["hoy"],
      types: ["social" as const],
      hideBars: true,
      query: "topa",
    };
    clearFilters(cleared);
    expect([cleared.styles, cleared.dates, cleared.types, cleared.hideBars]).toEqual([[], [], [], false]);
    expect(cleared.query).toBe("topa");
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

  it("the bar's chips are the view's types, in the owner's order: socials, rumbas, workshops, then the rest", () => {
    expect(TYPE_ORDER.slice(0, 3)).toEqual(["social", "party", "workshop"]);
    const mixed = [...all, event({ id: "rumba", date: today, event_type: "party" }), event({ id: "banda", date: today, event_type: "concert" })];
    const types = filterModel(mixed, list, today).types;
    expect(types.map((option) => option.label)).toEqual(["Social", "Rumba", "Taller", "Concierto"]);
    // Chosen while there's none of it in view: it stays, to be removed. Others without events: not shown.
    expect(filterModel(all, { ...list, types: ["show"] }, today).types.map((option) => option.value)).toEqual([
      "social",
      "workshop",
      "show",
    ]);
  });

  // The bug-squash pass of 8 Oct 2026: paging the calendar to a month without events (January 2027), the phone's bar
  // was an empty band pinned at the top, its chips the month's types: none.
  it("a view without events (an empty month in the calendar) keeps the main types in the bar, dimmed", () => {
    const empty = { ...list, view: "calendar" as const, month: new Date(2027, 0, 1) };
    const types = filterModel(all, empty, today).types;
    expect(types.map((option) => [option.value, option.count, option.dimmed])).toEqual([
      ["social", 0, true],
      ["party", 0, true],
      ["workshop", 0, true],
    ]);
    // With one chosen, that one (to be removed), as in any view.
    expect(filterModel(all, { ...empty, types: ["concert"] }, today).types.map((option) => option.value)).toEqual(["concert"]);
  });

  it("a type the other filters leave nothing of is dimmed in place, never hidden", () => {
    const bachata = model({ styles: ["bachata"] });
    expect(pick(bachata.types, "social")).toMatchObject({ count: 0, dimmed: true });
    expect(pick(bachata.types, "workshop")).toMatchObject({ count: 1, dimmed: false });
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

  it("every choice is in use: dates, then rhythms, then types (no date has a chip of its own: Cuándo shows them)", () => {
    const later40 = model({ dates: [later.date.slice(0, 7)], styles: ["kizomba"] });
    expect(later40.applied.map((item) => item.group)).toEqual(["dates", "styles"]);
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
      ["social", 1, true],
      ["workshop", 2, true],
    ]);
  });

  it("choices are named in the line under the bar, whatever chip they have", () => {
    const chosen = model({ dates: ["hoy"], styles: ["salsa", "kizomba"], types: ["social"] });
    expect(chosen.applied.map((item) => item.label)).toEqual(["Hoy", "Salsa", "Kizomba", "Social"]);
    expect(chosen.active).toBe(4);
  });

  it("wide screens: the pills are Cuándo, Tipo, then Ritmo (the owner, 8 Oct 2026)", () => {
    expect(model().pills.map((pill) => pill.key)).toEqual(["when", "types", "styles"]);
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
    expect(inCalendar.types.length).toBeGreaterThan(0);
    expect(inCalendar.active).toBe(1);
    const line = summaryLine(inCalendar, calendar);
    expect(`${line.count}${line.where} · ${line.names}`).toMatch(/^1 evento en [a-z]+ · Salsa$/);
  });

  it("the sheet's button says how many, or that there's nothing", () => {
    expect(resultsButtonLabel({ shown: 12, searched: 12 })).toBe("Ver 12 eventos");
    expect(resultsButtonLabel({ shown: 1, searched: 3 })).toBe("Ver 1 evento");
    expect(resultsButtonLabel({ shown: 0, searched: 3 })).toBe("Sin eventos: cambia los filtros");
  });

  // The bug hunt of 7 Oct 2026: with a search that finds nothing, the sheet said "cambia los filtros", though no
  // filter was on.
  it("nothing because of the search: the sheet's button names the search, not the filters", () => {
    const nothing = model({ query: "zzqx" });
    expect([nothing.shown, nothing.searched]).toEqual([0, 0]);
    expect(resultsButtonLabel(nothing)).toBe("Sin eventos: cambia la búsqueda");
    expect(resultsButtonLabel(model({ query: "zzqx", styles: ["salsa"] }))).toBe("Sin eventos: cambia la búsqueda");
    const filtered = model({ query: "kizomba", styles: ["salsa"] }); // the search finds one; the filter leaves none
    expect([filtered.shown, filtered.searched]).toEqual([0, 1]);
    expect(resultsButtonLabel(filtered)).toBe("Sin eventos: cambia los filtros");
    expect(model({ styles: ["salsa"], hideBars: true }).searched).toBe(3); // no search: every event in view
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

  it("hangs under its chip, never past the screen's sides nor the bar at the bottom, as tall as the screen allows", () => {
    const bar = { left: 0, top: 0, bottom: 56, width: 375 };
    const chip = { left: 164, top: 8, bottom: 48, width: 58 };
    expect(menuPlacement(chip, bar, 304, 812)).toEqual({ left: 63, top: 52, maxHeight: 748 });
    expect(menuPlacement({ ...chip, left: 20 }, bar, 304, 812).left).toBe(20);
    // The bar further down the page (not pinned yet): the menu is shorter.
    const lower = { top: 400, bottom: 456 };
    expect(menuPlacement({ ...chip, top: 408, bottom: 448 }, { ...bar, ...lower }, 304, 812)).toEqual({ left: 63, top: 52, maxHeight: 348 });
  });

  it("a phone in landscape (932 × 430, the bar at the bottom from 369): never under that bar; upward when there's more room", () => {
    const screen = 369; // window.innerHeight minus the bar at the bottom
    const bar = { left: 0, top: 223.5, bottom: 279.5, width: 932 };
    const chip = { left: 164, top: 231.5, bottom: 271.5, width: 58 };
    // 81 px below, 219.5 above: it opens upward, its bottom 4 px over the chip, and scrolls inside.
    const up = menuPlacement(chip, bar, 304, screen);
    expect(up).toEqual({ left: 164, bottom: 52, maxHeight: 219.5 });
    expect(chip.top - (bar.bottom - up.bottom!)).toBe(4);
    // Scrolled so the bar is higher: down again, clamped to the room above the bottom bar (not the four options).
    const higher = { top: 143.5, bottom: 199.5 };
    const down = menuPlacement({ ...chip, top: 151.5, bottom: 191.5 }, { ...bar, ...higher }, 304, screen);
    expect(down).toEqual({ left: 164, top: 52, maxHeight: 161.5 });
    expect(191.5 + 4 + down.maxHeight).toBeLessThanOrEqual(screen);
    // Little room either way: the side with more, never past it.
    expect(menuPlacement({ ...chip, top: 100, bottom: 300 }, bar, 304, screen).maxHeight).toBe(88);
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
