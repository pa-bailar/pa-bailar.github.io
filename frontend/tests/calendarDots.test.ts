import { describe, expect, it } from "vitest";
import { dotsHtml, MAX_DOTS_PER_DAY } from "../src/scripts/views/calendarView";

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
