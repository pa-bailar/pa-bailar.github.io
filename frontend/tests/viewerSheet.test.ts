import { describe, expect, it } from "vitest";
import { detentAt, MEDIUM_SHARE, otherDetent, scrollTopFor, settle } from "../src/scripts/views/viewerSheet";

const PEEK = 340; // the flyer's area on an 812px phone (42%)

describe("the viewer sheet's height, from its slide's scroll", () => {
  it("opens at half height: the slide at the top", () => {
    expect(detentAt(0, PEEK)).toBe("medium");
    expect(detentAt(PEEK / 2, PEEK)).toBe("medium");
  });

  it("is full once the sheet covers the flyer, and while reading further down", () => {
    expect(detentAt(PEEK, PEEK)).toBe("full");
    expect(detentAt(PEEK - 0.5, PEEK)).toBe("full"); // sub-pixel scroll positions
    expect(detentAt(PEEK + 900, PEEK)).toBe("full");
  });

  it("with nothing above the sheet (no flyer), it's all sheet", () => {
    expect(detentAt(0, 0)).toBe("full");
  });

  it("each height has its scroll position, and the handle switches them", () => {
    expect(scrollTopFor("medium", PEEK)).toBe(0);
    expect(scrollTopFor("full", PEEK)).toBe(PEEK);
    expect(otherDetent("medium")).toBe("full");
    expect(otherDetent("full")).toBe("medium");
  });

  it("the half sheet is a little over half the screen", () => {
    expect(MEDIUM_SHARE).toBeGreaterThan(0.5);
    expect(MEDIUM_SHARE).toBeLessThan(0.7);
  });
});

describe("where a drag of the sheet ends (mouse or pen)", () => {
  it("a slow release goes to the nearer height", () => {
    expect(settle(PEEK * 0.3, PEEK, 0)).toBe("medium");
    expect(settle(PEEK * 0.6, PEEK, 0)).toBe("full");
  });

  it("speed wins over distance: a flick goes the way it was moving", () => {
    expect(settle(PEEK * 0.2, PEEK, 0.8)).toBe("full");
    expect(settle(PEEK * 0.8, PEEK, -0.8)).toBe("medium");
  });

  it("pulled below the half sheet: far or fast closes, a little springs back", () => {
    expect(settle(-150, PEEK, 0)).toBe("close");
    expect(settle(-30, PEEK, -0.9)).toBe("close");
    expect(settle(-30, PEEK, 0)).toBe("medium");
  });

  it("reading below the full sheet stays put", () => {
    expect(settle(PEEK + 200, PEEK, -0.9)).toBe("full");
  });
});
