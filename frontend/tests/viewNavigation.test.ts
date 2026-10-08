// Coming back to the list from another view (views/viewNavigation.ts): where it lands depends on what changed while
// the visitor was away.
import { describe, expect, it } from "vitest";
import { createInitialState } from "../src/scripts/state";
import { listChoices, listComeback } from "../src/scripts/views/viewNavigation";

describe("the list's place after another view (listComeback)", () => {
  const left = { ...createInitialState(), styles: ["salsa"], query: "" };

  it("nothing changed: the very same spot", () => {
    expect(listComeback(listChoices(left), listChoices({ ...left }))).toBe("spot");
  });

  it("a filter changed (in the calendar): the same period, as any filter change", () => {
    expect(listComeback(listChoices(left), listChoices({ ...left, styles: ["salsa", "tango"] }))).toBe("period");
    expect(listComeback(listChoices(left), listChoices({ ...left, hideBars: true }))).toBe("period");
  });

  // The bug hunt of 7 Oct 2026: searched in the calendar, back in the list, it stood where it was left, deep in
  // other results.
  it("the search changed: a new list, from its start, as a search typed in the list", () => {
    expect(listComeback(listChoices(left), listChoices({ ...left, query: "tango" }))).toBe("start");
    expect(listComeback(listChoices({ ...left, query: "tango" }), listChoices(left))).toBe("start"); // cleared there
    expect(listComeback(listChoices(left), listChoices({ ...left, styles: [], query: "tango" }))).toBe("start");
    expect(listComeback(listChoices({ ...left, query: "tango" }), listChoices({ ...left, query: " tango " }))).toBe("spot");
  });
});
