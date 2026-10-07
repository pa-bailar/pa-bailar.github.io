import { describe, expect, it } from "vitest";
import { matchesQuery } from "../src/scripts/lib/search";
import { event, seriesEvent, sessionsOn } from "./factories";

// Days in the search (the owner, 7 Oct 2026: "sábado", "hoy", "este finde" found nothing). Today: Wednesday 7 October.
const TODAY = "2026-10-07";
const on = (date: string, overrides = {}) => event({ id: `e-${date}`, date, ...overrides });
const finds = (query: string, found: ReturnType<typeof event>, today = TODAY) => matchesQuery(found, query, today);

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
