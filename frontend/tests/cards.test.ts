// Where the open event's card was, once a redraw took it from the list (lib/cards.ts): unsaved in Guardados from its
// details, its card went, and the arrows did nothing, Escape dropped the focus to the page and Tab started over from
// the top (the bug hunt of 7 Oct 2026). The card that took its place stands in for it.
import { describe, expect, it } from "vitest";
import { placeAmong, standIn } from "../src/scripts/lib/cards";

const list = ["a", "b", "c", "d"];

describe("where a card is in the list (placeAmong)", () => {
  it("by the cards before and after it", () => {
    expect(placeAmong(list, "b")).toEqual({ before: "a", after: "c" });
  });

  it("at the ends, one side is nothing", () => {
    expect(placeAmong(list, "a")).toEqual({ before: null, after: "b" });
    expect(placeAmong(list, "d")).toEqual({ before: "c", after: null });
    expect(placeAmong(["a"], "a")).toEqual({ before: null, after: null });
  });

  it("nowhere when it isn't in the list", () => {
    expect(placeAmong(list, "z")).toBeNull();
  });
});

describe("the card standing in for one that left (standIn)", () => {
  const shown = (ids: string[]) => (id: string) => ids.includes(id);

  it("the one that took its place", () => {
    expect(standIn({ before: "a", after: "c" }, shown(["a", "c", "d"]))).toBe("c");
  });

  it("the one before it, when it was the last", () => {
    expect(standIn({ before: "c", after: null }, shown(["a", "b", "c"]))).toBe("c");
  });

  it("the one before it, when the one after it went too", () => {
    expect(standIn({ before: "a", after: "c" }, shown(["a", "d"]))).toBe("a");
  });

  it("none: nothing left around it, or no place known", () => {
    expect(standIn({ before: null, after: null }, shown([]))).toBeNull();
    expect(standIn({ before: "a", after: "c" }, shown([]))).toBeNull();
    expect(standIn(null, shown(list))).toBeNull();
  });
});
