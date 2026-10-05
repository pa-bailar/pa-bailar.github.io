import { describe, expect, it } from "vitest";
import { filtersLabel, shareSources } from "../src/scripts/lib/shareSources";
import type { AgendaGroup } from "../src/scripts/state";
import { event } from "./factories";

// Far enough ahead that "today" never reaches them.
const salsa = event({ id: "salsa", title: "Salsa Freestyle", date: "2030-10-04", start_time: "18:00", account: "madyumdance" });
const social = event({ id: "social", title: "Social", date: "2030-10-06", start_time: null, account: "zafradance" });
const congress = event({ id: "congress", title: "Level Up", date: "2030-10-05", end_date: "2030-10-08", account: "levelupbfc" });

const group = (key: string, events = [salsa, social]): AgendaGroup => ({ key, label: key, shortLabel: key, events });
const noFilters = { types: [], styles: [], query: "", dates: [], view: "upcoming" as const };
const planUrl = (item: { id: string }) => `https://x/${item.id}`;

describe("what the list's share buttons share", () => {
  it("names the filters in use: types, rhythms, the search", () => {
    expect(filtersLabel({ types: [], styles: [], query: "  " })).toBe("");
    expect(filtersLabel({ types: ["workshop", "social"], styles: ["salsa", "otro"], query: " cubana " })).toBe(
      "Taller, Social · Salsa, Otros ritmos · «cubana»",
    );
  });

  it("a near period: its title, its days and filters, its list", () => {
    const state = { ...noFilters, styles: ["salsa"] };
    const sources = shareSources({ groups: [group("fin-de-semana")], state, plans: [], planUrl });
    expect([...sources.keys()]).toEqual(["periodo-fin-de-semana"]);
    const source = sources.get("periodo-fin-de-semana")!;
    expect(source.title).toBe("Este finde en Bogotá");
    expect(source.subtitle).toBe("Viernes 4 al domingo 6 de octubre · Salsa");
    expect(source.text.split("\n")[0]).toBe("*Este finde en Bogotá · Salsa* 💃🕺");
    expect(source.events).toEqual([salsa, social]);
  });

  it("only the near periods: a month has no share button", () => {
    const sources = shareSources({ groups: [group("2030-11"), group("hoy")], state: noFilters, plans: [], planUrl });
    expect([...sources.keys()]).toEqual(["periodo-hoy"]);
  });

  it("the plans in Guardados, through their last day", () => {
    const plans = [salsa, congress, social];
    expect(shareSources({ groups: [], state: noFilters, plans, planUrl }).has("planes")).toBe(false);
    const sources = shareSources({ groups: [], state: { ...noFilters, view: "saved" as const }, plans, planUrl });
    const source = sources.get("planes")!;
    expect(source.title).toBe("Mis planes para bailar");
    expect(source.subtitle).toBe("Viernes 4 al martes 8 de octubre"); // the congress ends last
    expect(source.text).toContain("  https://x/congress");
    expect(shareSources({ groups: [], state: { ...noFilters, view: "saved" as const }, plans: [], planUrl }).size).toBe(0);
  });
});
