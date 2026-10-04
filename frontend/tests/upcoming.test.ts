import { describe, expect, it } from "vitest";
import { groupByPeriod } from "../src/scripts/state";
import { isPeriodOpen, sharedEventEntry, showWholePeriod } from "../src/scripts/views/upcomingView";
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

  it("an event in a summarized period, or past a busy period's \"Ver N más\": that period opens whole first", () => {
    const groups = groupsOf([["2026-10-07", 2], ["2026-10-09", 8], ["2026-11-20", 6]]);
    expect(sharedEventEntry(groups, "2026-11-20-3")).toEqual({ listed: true, open: "2026-11" });
    expect(sharedEventEntry(groups, "2026-10-09-7")).toEqual({ listed: true, open: "fin-de-semana" });
    expect(sharedEventEntry(groups, "2026-10-09-2")).toEqual({ listed: true, open: null });
  });

  it("an event that isn't in the list (it passed): its own page instead", () => {
    expect(sharedEventEntry(groupsOf([["2026-10-07", 2]]), "ya-paso")).toEqual({ listed: false });
  });
});
