import { describe, expect, it } from "vitest";
import { SECOND_TAP_MS, SECOND_TAP_SLOP, controlKey, isSecondTap, isStraySecondTap } from "../src/scripts/lib/secondTap";

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

// The bug hunt of 7 Oct 2026: "Ver N más", a notice's button, "Ver las 6 publicaciones"… changed what was under the
// finger, and the second tap pressed what appeared there.
describe("a second tap on something the first one opened (lib/secondTap.ts)", () => {
  const more = { x: 188, y: 528, at: 1000, control: "BUTTON data-more=hoy" };

  it("is dropped when it lands on another control", () => {
    expect(isStraySecondTap(more, { x: 190, y: 530, at: 1120, control: "ARTICLE data-event-card=social" })).toBe(true);
    expect(isStraySecondTap(more, { x: 190, y: 530, at: 1120, control: "" })).toBe(true); // the page under a notice
  });

  it("isn't when it presses the same control again (a month's arrow), comes later, or lands elsewhere", () => {
    expect(isStraySecondTap(more, { ...more, at: 1120 })).toBe(false);
    expect(isStraySecondTap(more, { ...more, control: "A href=/", at: 1000 + SECOND_TAP_MS + 1 })).toBe(false);
    expect(isStraySecondTap(more, { ...more, control: "A href=/", x: 300 })).toBe(false);
    expect(isStraySecondTap(null, more)).toBe(false);
  });

  it("knows a control drawn again by its tag, id, link and data, not by its words or state", () => {
    const attributes = (pairs: Record<string, string>) =>
      Object.entries(pairs).map(([name, value]) => ({ name, value }));
    const bookmark = { tagName: "BUTTON", attributes: attributes({ "data-save": "social", "aria-pressed": "true" }) };
    const icon = { closest: () => bookmark } as unknown as EventTarget;
    expect(controlKey(icon)).toBe("BUTTON data-save=social");
    const redrawn = { ...bookmark, attributes: attributes({ "aria-pressed": "false", "data-save": "social" }) };
    expect(controlKey({ closest: () => redrawn } as unknown as EventTarget)).toBe("BUTTON data-save=social");
    expect(controlKey({ closest: () => null } as unknown as EventTarget)).toBe("");
    expect(controlKey(null)).toBe("");
  });
});
