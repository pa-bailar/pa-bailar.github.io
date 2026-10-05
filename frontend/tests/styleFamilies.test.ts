// The rhythms' families (lib/styleFamilies.ts): every rhythm of the data contract in exactly one, and the filters'
// rhythms grouped under them in the sheet's Ritmo and the toolbar's Ritmo panel.
import { describe, expect, it } from "vitest";
import { STYLES } from "../scripts/check-data.mjs";
import { STYLE_FAMILIES, familyOf, groupByFamily } from "../src/scripts/lib/styleFamilies";
import { filterModel } from "../src/scripts/lib/filterModel";
import { addDays, todayIso } from "../src/scripts/lib/dates";
import { createInitialState } from "../src/scripts/state";
import { event } from "./factories";

describe("the rhythms' families", () => {
  it("every rhythm of the data contract is in exactly one family, and no family names one it doesn't know", () => {
    for (const style of STYLES as string[]) {
      expect(STYLE_FAMILIES.filter((family) => family.styles.includes(style)), style).toHaveLength(1);
    }
    expect(STYLE_FAMILIES.flatMap((family) => family.styles).sort()).toEqual([...(STYLES as string[])].sort());
  });

  it("are the owner's four, in order: Salsa, Bachata, Urbanos, Otros", () => {
    expect(STYLE_FAMILIES.map((family) => family.label)).toEqual(["Salsa", "Bachata", "Urbanos", "Otros"]);
    expect(familyOf("cha cha chá").label).toBe("Salsa");
    expect(familyOf("heels").label).toBe("Urbanos");
    expect(familyOf("otro").label).toBe("Otros");
    expect(familyOf("vals").label).toBe("Otros"); // one newer than this list: with the others
  });

  it("group options in the families' order, each keeping the options' own order; empty families aren't there", () => {
    const options = ["tango", "salsa", "kizomba", "salsa caleña", "afro", "otro"].map((value) => ({ value }));
    expect(groupByFamily(options).map(({ family, items }) => [family.key, items.map((item) => item.value)])).toEqual([
      ["salsa", ["salsa", "salsa caleña"]],
      ["urbanos", ["afro"]],
      ["otros", ["tango", "kizomba", "otro"]],
    ]);
  });
});

describe("the sheet's and the panel's Ritmo, by family (filterModel)", () => {
  const today = todayIso();
  const list = { ...createInitialState(), view: "upcoming" as const };
  const events = [
    event({ id: "a", date: today, styles: ["salsa caleña", "bachata sensual"], event_type: "social" }),
    event({ id: "b", date: addDays(today, 1), styles: ["salsa en línea"], event_type: "workshop" }),
    event({ id: "c", date: addDays(today, 2), styles: ["salsa en línea", "kizomba"], event_type: "workshop" }),
    event({ id: "d", date: addDays(today, 3), styles: ["otro"], event_type: "workshop" }),
  ];
  const groups = (changes = {}) =>
    filterModel(events, { ...list, ...changes }, today).styleGroups.map(({ family, items }) => [
      family.label,
      items.map((item) => `${item.value} ${item.count}${item.dimmed ? " dimmed" : ""}${item.chosen ? " chosen" : ""}`),
    ]);

  it("every rhythm under its family, the bar's four first in theirs, then by count, Otros ritmos last", () => {
    expect(groups()).toEqual([
      ["Salsa", ["salsa 3", "salsa en línea 2", "salsa caleña 1"]],
      ["Bachata", ["bachata 1", "bachata sensual 1"]],
      ["Urbanos", ["urbano 0 dimmed"]],
      ["Otros", ["tango 0 dimmed", "kizomba 1", "otro 1"]],
    ]);
  });

  it("keeps the counts, the dimming and what's chosen", () => {
    expect(groups({ types: ["social"], styles: ["kizomba"] })).toEqual([
      ["Salsa", ["salsa 1", "salsa en línea 0 dimmed", "salsa caleña 1"]],
      ["Bachata", ["bachata 1", "bachata sensual 1"]],
      ["Urbanos", ["urbano 0 dimmed"]],
      ["Otros", ["tango 0 dimmed", "kizomba 0 chosen", "otro 0 dimmed"]],
    ]);
  });

  it("holds the same options as the flat list, none lost nor repeated", () => {
    const model = filterModel(events, list, today);
    expect(model.styleGroups.flatMap((group) => group.items).map((item) => item.value).sort()).toEqual(
      model.styles.map((item) => item.value).sort(),
    );
  });
});
