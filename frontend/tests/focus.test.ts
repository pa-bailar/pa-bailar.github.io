// Keeping the keyboard's focus through a redraw (lib/focus.ts).
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { focusSelector, refocus } from "../src/scripts/lib/focus";

/** A control as refocus sees it: laid out or not (a closed panel's), and its focus. */
const control = (laidOut: boolean) => ({ getClientRects: () => (laidOut ? [{}] : []), focus: vi.fn() });

/** The page's elements, as focusSelector reads them: their data-* and what they match. */
class FakeElement {
  constructor(
    readonly dataset: Record<string, string>,
    private readonly selectors: string[] = [],
  ) {}
  matches(selector: string) {
    return this.selectors.includes(selector);
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("focusSelector (lib/focus.ts)", () => {
  const selectorOf = (element: FakeElement) => {
    vi.stubGlobal("HTMLElement", FakeElement);
    vi.stubGlobal("CSS", { escape: (text: string) => text });
    return focusSelector(element as unknown as Element);
  };

  // The bug-squash pass of 8 Oct 2026: after pasting Safari's saves, the redraw dropped the focus to the page.
  it("Copiar and Pegar (the saves between Safari and the app)", () => {
    expect(selectorOf(new FakeElement({ savedPaste: "" }, ["[data-saved-paste]"]))).toBe("[data-saved-paste]");
    expect(selectorOf(new FakeElement({ savedCopy: "" }, ["[data-saved-copy]"]))).toBe("[data-saved-copy]");
  });

  it("names the controls a redraw draws again", () => {
    const chip = new FakeElement({ filter: "types", value: "party" });
    expect(selectorOf(chip)).toBe('[data-filter="types"][data-value="party"]');
    expect(selectorOf(new FakeElement({ day: "2026-10-10" }))).toBe('[data-day="2026-10-10"]');
    expect(selectorOf(new FakeElement({}))).toBeNull();
  });

  // The bug-squash pass of 8 Oct 2026: in Guardados, Escape after unsaving from the side panel left the focus on the
  // card that took its place; Ctrl+Z (Deshacer) then drew Guardados again, and the focus fell to the page: the next Tab
  // started over from the top.
  it("an event's card (its link, the card's one Tab stop): the same event's card, drawn again", () => {
    const link = new FakeElement({ event: "social-24-oct" }, ["a.event-card__hit"]);
    expect(selectorOf(link)).toBe('a.event-card__hit[data-event="social-24-oct"]');
    const details = new FakeElement({ event: "social-24-oct", source: "boton" }); // its "Detalles": no Tab stop
    expect(selectorOf(details)).toBeNull();
  });
});

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
