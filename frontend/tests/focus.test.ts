// Keeping the keyboard's focus through a redraw (lib/focus.ts).
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { refocus } from "../src/scripts/lib/focus";

/** A control as refocus sees it: laid out or not (a closed panel's), and its focus. */
const control = (laidOut: boolean) => ({ getClientRects: () => (laidOut ? [{}] : []), focus: vi.fn() });

describe("refocus (lib/focus.ts)", () => {
  // The bug-squash pass of 8 Oct 2026: a type chosen in the phone's pinned bar mid-list (Chrome focuses a tapped
  // button) kept the period being read under the bar, then the focus put back on the chip scrolled the page to the
  // bar's own place at the list's top: the chip is under the scroll padding the pinned bar keeps. On a wide screen,
  // "Ocultar bares" in the sticky toolbar moved the list 377 px the same way.
  it("puts the focus back on the first one laid out, without scrolling the page", () => {
    const closed = control(false);
    const shown = control(true);
    const scope = { querySelectorAll: vi.fn(() => [closed, shown]) };
    refocus('[data-filter="types"][data-value="party"]', scope as unknown as ParentNode);
    expect(scope.querySelectorAll).toHaveBeenCalledWith('[data-filter="types"][data-value="party"]');
    expect(closed.focus).not.toHaveBeenCalled();
    expect(shown.focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("nothing to put back: nothing done", () => {
    const scope = { querySelectorAll: vi.fn(() => []) };
    refocus(null, scope as unknown as ParentNode);
    expect(scope.querySelectorAll).not.toHaveBeenCalled();
  });

  it("every redraw puts the focus back through it (main.ts render, the Cuándo menu)", () => {
    const read = (path: string) => readFileSync(new URL(`../src/scripts/${path}`, import.meta.url), "utf8");
    expect(read("main.ts")).toContain("refocus(focused, scope)");
    expect(read("views/whenMenu.ts")).toContain("refocus(");
  });
});
