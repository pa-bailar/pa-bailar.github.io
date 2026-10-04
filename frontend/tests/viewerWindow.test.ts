import { describe, expect, it } from "vitest";
import { slidesToRender } from "../src/scripts/views/viewerWindow";

const rendered = (position: number, count: number, around = 1) => [...slidesToRender(position, count, around)];

describe("which of the viewer's slides are rendered", () => {
  it("the current event and one on each side, whatever the list's length", () => {
    expect(rendered(9, 76)).toEqual([8, 9, 10]);
    expect(rendered(40, 1000)).toHaveLength(3);
  });

  it("at the ends, only the neighbor there is", () => {
    expect(rendered(0, 37)).toEqual([0, 1]);
    expect(rendered(36, 37)).toEqual([35, 36]);
  });

  it("a list of one, and an empty list", () => {
    expect(rendered(0, 1)).toEqual([0]);
    expect(rendered(0, 0)).toEqual([]);
  });

  it("a position outside the list is kept inside it", () => {
    expect(rendered(50, 3)).toEqual([1, 2]);
    expect(rendered(-2, 3)).toEqual([0, 1]);
  });
});
