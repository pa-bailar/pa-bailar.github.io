import { describe, expect, it } from "vitest";
import { dayCellHtml, dayCellLabel, dotsHtml, MAX_DOTS_PER_DAY } from "../src/scripts/views/calendarView";
import { createInitialState } from "../src/scripts/state";
import { event } from "./factories";

const day = (n: number) => Array.from({ length: n }, () => ({ event_type: "social" as const }));
const dots = (html: string) => (html.match(/class="cal-dot /g) ?? []).length;

describe("a day's dots on phones", () => {
  it("one per event, up to two rows of three", () => {
    expect(MAX_DOTS_PER_DAY).toBe(6);
    expect(dots(dotsHtml(day(0)))).toBe(0);
    expect(dots(dotsHtml(day(6)))).toBe(6);
    expect(dotsHtml(day(6))).not.toContain("+");
  });

  it('more than six: four dots and "+N" in the last two places, so the week keeps its height', () => {
    expect(dots(dotsHtml(day(7)))).toBe(4);
    expect(dotsHtml(day(7))).toContain('<span class="cal-dots-more">+3</span>');
    expect(dotsHtml(day(20))).toContain("+16");
  });
});

describe("a day's name", () => {
  const titled = (...titles: string[]) => titles.map((title) => event({ title }));
  const state = { ...createInitialState(), selectedDay: "2026-10-01" };
  const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  it("starts with what its cell shows (label in name): the number, the events' names, \"+N\"; then the date", () => {
    const cell = dayCellHtml("2026-10-12", 12, titled("A", "B", "C", "D", "E"), state);
    expect(cell).not.toContain("aria-label"); // named by its content
    expect(text(cell)).toBe("12 A B C +2 , Lunes, 12 de octubre, festivo, 5 eventos");
    expect(cell).toContain('<span class="visually-hidden">, Lunes, 12 de octubre, festivo, 5 eventos</span>');
  });

  it("the date and count alone, for screen readers", () => {
    expect(dayCellLabel("2026-10-02", 0)).toBe("Viernes, 2 de octubre");
    expect(dayCellLabel("2026-10-02", 1)).toBe("Viernes, 2 de octubre, 1 evento");
  });
});
