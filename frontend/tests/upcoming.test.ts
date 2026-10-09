import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { groupByPeriod } from "../src/scripts/state";
import { groupBodyHtml } from "../src/scripts/views/upcomingView";
import { event } from "./factories";

// Wednesday 2026-10-07: periods "hoy", "fin-de-semana", "resto-del-mes", "2026-11"…
const TODAY = "2026-10-07";
const on = (date: string, count = 1) => Array.from({ length: count }, (_, i) => event({ id: `${date}-${i}`, date }));
const groupsOf = (dates: [string, number][]) => groupByPeriod(dates.flatMap(([date, count]) => on(date, count)), TODAY);
const listedOn = (item: { date: string }) => item.date;
const cards = (html: string) => (html.match(/data-event-card=/g) ?? []).length;
const dayHeadings = (html: string) => [...html.matchAll(/<h3 class="day-heading agenda-day">([^<]*)<\/h3>/g)].map((m) => m[1]);

// The owner, 8 Oct 2026: "Ver 25 más" scrolled by unnoticed between busy periods, and hid the weekend's Saturday and
// Sunday. Every period now shows every event.
describe("the upcoming list shows every event", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-07T12:00:00-05:00")); // the headings say "Hoy" / "Mañana" by the real clock
  });
  afterEach(() => vi.useRealTimers());

  it('a busy period, and a later month, are whole: no "Ver N más", no summary row', () => {
    for (const group of groupsOf([["2026-10-09", 20], ["2026-11-05", 15]])) {
      const html = groupBodyHtml(group, listedOn);
      expect(cards(html)).toBe(group.events.length);
      expect(html).not.toContain("data-show-period");
    }
  });

  it("the weekend goes under a heading per day, in order", () => {
    const weekend = groupsOf([["2026-10-09", 2], ["2026-10-10", 3], ["2026-10-11", 1]]).find((g) => g.key === "fin-de-semana")!;
    const html = groupBodyHtml(weekend, listedOn);
    expect(dayHeadings(html)).toEqual(["Viernes, 9 de octubre", "Sábado, 10 de octubre", "Domingo, 11 de octubre"]);
    expect(cards(html)).toBe(6);
  });

  it("other periods have no day headings", () => {
    const later = groupsOf([["2026-10-20", 2], ["2026-10-22", 2]])[0]!;
    expect(dayHeadings(groupBodyHtml(later, listedOn))).toEqual([]);
  });
});
