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
    expect(finds("2 de enero", on("2027-01-02"))).toBe(true); // already past this year: in the list, next year's
    expect(finds("3 de octubre", on("2027-10-03"))).toBe(true);
    expect(finds("3 de octubre", on("2026-10-03"))).toBe(false); // past: not in the list (Guardados has it)
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

// What a search names isn't limited to the days to come: each view shows its own (the list from today, the calendar its
// month, Guardados the past too). The bug hunt of 7 Oct 2026: "3 de octubre" meant 2027 in Guardados.
describe("the days named, whole: each view shows its own", () => {
  it("in the calendar, the weekend and the week searched keep their days already past", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-10T17:00:00Z")); // Saturday 10 October
    const month = new Date(2026, 9, 1);
    const days = (query: string) =>
      [...calendarDays([on("2026-10-05"), on("2026-10-09"), on("2026-10-10"), on("2026-10-12")], list(query, { view: "calendar", month }), "2026-10-10").keys()];
    expect(days("este finde")).toEqual(["2026-10-09", "2026-10-10"]);
    expect(days("esta semana")).toEqual(["2026-10-05", "2026-10-09", "2026-10-10"]);
    expect(days("3 de octubre")).toEqual([]);
    expect(days("5 de octubre")).toEqual(["2026-10-05"]);
  });

  it("in the list, still from today", () => {
    expect(finds("este finde", on("2026-10-09"), "2026-10-10")).toBe(false); // yesterday, Friday
    expect(finds("esta semana", on("2026-10-05"), "2026-10-10")).toBe(false);
  });
});

// Days with words around them (the bug hunt of 7 Oct 2026): "mañana en la noche" found nothing, "sábado en la mañana"
// was read as tomorrow, "sábado 10" was every Saturday, "el otro finde", "17 de oct" and "qué hay hoy" found nothing.
describe("days with words around them", () => {
  const social = (date: string) => on(date, { title: "Social", styles: ["salsa"] });

  it("a time of day means the day: the search has no hours", () => {
    for (const query of ["mañana en la noche", "mañana por la noche", "mañana noche", "mañana en la mañana", "mañana por la tarde"]) {
      expect(finds(query, social("2026-10-08")), query).toBe(true);
      expect(finds(query, social("2026-10-07")), query).toBe(false);
    }
    for (const query of ["sábado en la noche", "sábado en la mañana", "el sábado por la tarde", "sábado de noche", "sábado noche"]) {
      expect(finds(query, social("2026-10-10")), query).toBe(true);
      expect(finds(query, social("2026-10-08")), query).toBe(false); // not tomorrow
    }
    expect(finds("hoy en la noche", social("2026-10-07"))).toBe(true);
    expect(finds("esta mañana", social("2026-10-07"))).toBe(true); // this morning: today
    expect(finds("esta tarde", social("2026-10-08"))).toBe(false);
  });

  it("alone, a time of day is no day (\"en la mañana\" isn't tomorrow), and left out", () => {
    const workshop = on("2026-10-10", { title: "Clase de salsa", event_type: "workshop" });
    expect(finds("clases en la mañana", workshop)).toBe(true);
    expect(finds("salsa por la noche", social("2026-10-20"))).toBe(true);
    expect(finds("noche de salsa", social("2026-10-10"))).toBe(false); // "noche" is a word here: the title has none
  });

  it("a weekday with a number is that day: a Saturday the 10th; with a month, the date", () => {
    for (const query of ["sábado 10", "el sábado 10", "sábado 10 de octubre", "sábado, 10 de oct"]) {
      expect(finds(query, social("2026-10-10")), query).toBe(true);
      expect(finds(query, social("2026-10-17")), query).toBe(false);
    }
    expect(finds("viernes 9", social("2026-10-09"))).toBe(true);
    expect(finds("viernes 9", social("2026-10-16"))).toBe(false);
    expect(finds("viernes 13", social("2026-11-13"))).toBe(true);
    expect(finds("sábado 11", social("2026-10-10"))).toBe(false); // no Saturday the 11th soon: nothing, honestly
    expect(finds("viernes 10 de octubre", social("2026-10-10"))).toBe(true); // a date: its weekday is only said
  });

  it("\"el otro\" is the one after the coming one; \"que viene\" or \"entrante\" after a day is \"próximo\" before it", () => {
    expect(finds("el otro finde", social("2026-10-17"))).toBe(true);
    expect(finds("el otro fin de semana", social("2026-10-16"))).toBe(true);
    expect(finds("el otro finde", social("2026-10-10"))).toBe(false);
    expect(finds("el otro sábado", social("2026-10-17"))).toBe(true);
    expect(finds("el otro sábado", social("2026-10-10"))).toBe(false);
    expect(finds("el otro sábado", social("2026-10-24"))).toBe(false);
    expect(finds("el otro sábado", social("2026-10-17"), "2026-10-10")).toBe(true); // on a Saturday: next week's
    expect(finds("el finde que viene", social("2026-10-10"))).toBe(true);
    expect(finds("el sábado que viene", social("2026-10-10"))).toBe(true);
    expect(finds("la semana entrante", social("2026-10-14"))).toBe(true);
    expect(finds("el mes que viene", social("2026-11-05"))).toBe(true);
    expect(finds("el próximo mes", social("2026-10-20"))).toBe(false);
  });

  it("a month written short, beside a number; the month first; a year", () => {
    for (const query of ["17 de oct", "17 oct", "17 de oct.", "octubre 17"]) {
      expect(finds(query, social("2026-10-17")), query).toBe(true);
      expect(finds(query, social("2026-10-18")), query).toBe(false);
    }
    expect(finds("3 de nov", social("2026-11-03"))).toBe(true);
    expect(finds("mar", on("2027-03-05", { title: "Social" }))).toBe(false); // alone, "mar" is the sea, not March
    expect(finds("octubre de 2026", social("2026-10-20"))).toBe(true);
    expect(finds("octubre de 2027", social("2026-10-20"))).toBe(false);
    expect(finds("15 de octubre de 2026", social("2026-10-15"))).toBe(true);
  });

  it("the words of a question or a wish are left out: \"qué hay hoy\", \"dónde bailar salsa\"", () => {
    expect(finds("qué hay hoy", social("2026-10-07"))).toBe(true);
    expect(finds("bailar salsa", social("2026-10-20"))).toBe(true);
    expect(finds("dónde bailar salsa el sábado", social("2026-10-10"))).toBe(true);
    expect(finds("quiero ir a bailar salsa", social("2026-10-20"))).toBe(true);
    expect(finds("eventos de salsa", social("2026-10-20"))).toBe(true);
    expect(finds("planes para el finde", social("2026-10-10"))).toBe(true);
    expect(finds("qué", on("2026-10-20", { title: "Calor que enamora" }))).toBe(true); // alone, still a word
  });
});

// Day words that are also first names (the bug hunt of 7 Oct 2026: none in the data that day, but "julio" found only
// July, and "domingo quiñones" only Sundays).
describe("a day word that's also a name", () => {
  const julio = on("2026-10-14", { title: "Taller con Julio Hernández", event_type: "workshop" }); // a Wednesday
  const julioSaturday = on("2026-10-10", { title: "Social con Julio" });
  const concert = on("2026-10-10", { title: "Domingo Quiñones en concierto", event_type: "concert" }); // a Saturday

  it("finds the events with that name, on any of their days, and still the days it names", () => {
    expect(finds("julio", julio)).toBe(true);
    expect(finds("julio hernández", julio)).toBe(true);
    expect(finds("julio", on("2027-07-03"))).toBe(true); // the month, as before
    expect(finds("domingo quiñones", concert)).toBe(true);
    expect(finds("abril", on("2026-10-10", { artists: ["Abril Rodríguez"] }))).toBe(true);
    expect(finds("domingo", on("2026-10-10", { title: "Social" }))).toBe(false); // a Saturday, no name
  });

  it("with another day, that day still applies: «julio sábado» is Julio's Saturday", () => {
    expect(finds("julio sábado", julioSaturday)).toBe(true);
    expect(finds("julio sábado", julio)).toBe(false);
  });
});
