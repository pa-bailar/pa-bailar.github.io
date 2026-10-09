import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { groupByPeriod } from "../src/scripts/state";
import { isPeriodOpen, periodCardsHtml, sharedEventEntry, showWholePeriod } from "../src/scripts/views/upcomingView";
import { event } from "./factories";

// Wednesday 2026-10-07: periods "hoy", "fin-de-semana", "resto-del-mes", "2026-11"…
const TODAY = "2026-10-07";
const on = (date: string, count = 1) => Array.from({ length: count }, (_, i) => event({ id: `${date}-${i}`, date }));
const openKeys = (dates: [string, number][]) => {
  const groups = groupByPeriod(dates.flatMap(([date, count]) => on(date, count)), TODAY);
  return groups.filter((_, position) => isPeriodOpen(groups, position)).map((group) => group.key);
};

describe("which periods of the upcoming list open", () => {
  it("a short list (12 or fewer) opens whole", () => {
    expect(openKeys([["2026-10-07", 2], ["2026-10-25", 5], ["2026-11-05", 5]])).toEqual(["hoy", "resto-del-mes", "2026-11"]);
  });

  it("a long list opens the near periods and summarizes the later ones", () => {
    expect(openKeys([["2026-10-07", 2], ["2026-10-09", 3], ["2026-10-25", 6], ["2026-12-05", 6]])).toEqual(["hoy", "fin-de-semana"]);
  });

  it("with nothing near, the first period opens", () => {
    expect(openKeys([["2026-10-25", 8], ["2026-11-05", 8]])).toEqual(["resto-del-mes"]);
  });

  it("a period the visitor opened stays open", () => {
    showWholePeriod("2026-12");
    expect(openKeys([["2026-10-07", 2], ["2026-10-25", 6], ["2026-12-05", 6]])).toEqual(["hoy", "2026-12"]);
  });
});

describe("a shared link's event in the list", () => {
  const groupsOf = (dates: [string, number][]) => groupByPeriod(dates.flatMap(([date, count]) => on(date, count)), TODAY);

  it("an event in an open period: its card is there, nothing to open", () => {
    expect(sharedEventEntry(groupsOf([["2026-10-07", 2], ["2026-10-25", 5]]), "2026-10-07-1")).toEqual({ listed: true, open: null });
  });

  it("an event in a summarized period: that period opens whole first; a busy open one's last card is there", () => {
    const groups = groupsOf([["2026-10-07", 2], ["2026-10-09", 8], ["2026-11-20", 6]]);
    expect(sharedEventEntry(groups, "2026-11-20-3")).toEqual({ listed: true, open: "2026-11" });
    expect(sharedEventEntry(groups, "2026-10-09-7")).toEqual({ listed: true, open: null });
    expect(sharedEventEntry(groups, "2026-10-09-2")).toEqual({ listed: true, open: null });
  });

  it("an event that isn't in the list (it passed): its own page instead", () => {
    expect(sharedEventEntry(groupsOf([["2026-10-07", 2]]), "ya-paso")).toEqual({ listed: false });
  });
});

// The owner, 8 Oct 2026: "Ver 25 más" scrolled by unnoticed between busy periods, and hid the weekend's Saturday and
// Sunday. An open period shows every event; the weekend goes under a heading per day.
describe("an open period's cards", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-07T12:00:00-05:00")); // the headings say "Hoy" / "Mañana" by the real clock
  });
  afterEach(() => vi.useRealTimers());
  const listedOn = (item: { date: string }) => item.date;
  const cards = (html: string) => (html.match(/data-event-card=/g) ?? []).length;
  const dayHeadings = (html: string) => [...html.matchAll(/<h3 class="day-heading agenda-day">([^<]*)<\/h3>/g)].map((m) => m[1]);

  it("a busy period shows every event, no \"Ver N más\"", () => {
    const busy = groupByPeriod(on("2026-10-20", 20), TODAY)[0]!;
    const html = periodCardsHtml(busy, listedOn);
    expect(cards(html)).toBe(20);
    expect(html).not.toContain("data-show-period");
  });

  it("the weekend goes under a heading per day, in order", () => {
    const weekend = groupByPeriod([...on("2026-10-09", 2), ...on("2026-10-10", 3), ...on("2026-10-11")], TODAY)[0]!;
    const html = periodCardsHtml(weekend, listedOn);
    expect(dayHeadings(html)).toEqual(["Viernes, 9 de octubre", "Sábado, 10 de octubre", "Domingo, 11 de octubre"]);
    expect(cards(html)).toBe(6);
  });

  it("other periods have no day headings", () => {
    const later = groupByPeriod([...on("2026-10-20", 2), ...on("2026-10-22", 2)], TODAY)[0]!;
    expect(dayHeadings(periodCardsHtml(later, listedOn))).toEqual([]);
  });
});
