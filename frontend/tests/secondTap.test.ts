import { describe, expect, it } from "vitest";
import { isSecondTap, SECOND_TAP_MS, SECOND_TAP_SLOP } from "../src/scripts/lib/secondTap";

// A double-tap on a flyer: its second tap landed on the details the first one opened (the audit of 7 Oct 2026).
describe("the second tap of a double-tap (lib/secondTap.ts)", () => {
  const first = { x: 188, y: 528, at: 1000 };

  it("is a tap close to the first, soon after it", () => {
    expect(isSecondTap(first, { x: 188, y: 528, at: 1120 })).toBe(true); // 120 ms, the same spot
    expect(isSecondTap(first, { x: 187, y: 534, at: 1250 })).toBe(true); // 250 ms, the finger moved 6 px
    expect(isSecondTap(first, { x: 188 + SECOND_TAP_SLOP, y: 528, at: 1000 + SECOND_TAP_MS })).toBe(true);
  });

  it("isn't a later tap, a tap elsewhere, or a tap with no first one", () => {
    expect(isSecondTap(first, { x: 188, y: 528, at: 1000 + SECOND_TAP_MS + 1 })).toBe(false); // a tap that means it
    expect(isSecondTap(first, { x: 300, y: 528, at: 1100 })).toBe(false); // Compartir, tapped on purpose
    expect(isSecondTap(first, { x: 188, y: 528, at: 900 })).toBe(false); // before it (another page's clock)
    expect(isSecondTap(null, { x: 188, y: 528, at: 1100 })).toBe(false);
  });
});
