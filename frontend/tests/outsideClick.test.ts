// A press outside an open menu or panel and the click it leads to (lib/outsideClick.ts): only that click is dealt
// with, never a later keyboard click.
import { afterEach, describe, expect, it, vi } from "vitest";
import { TOUCH_CLICK_MS, isClickOf, pressedClick } from "../src/scripts/lib/outsideClick";

/** A DOM-like node: `contains` itself and its descendants. */
function node(parent?: ReturnType<typeof node>) {
  const self = {
    parent,
    contains(other: unknown): boolean {
      for (let at = other as typeof self | undefined; at; at = at.parent) if (at === self) return true;
      return false;
    },
  };
  return self;
}

afterEach(() => vi.useRealTimers());

describe("the click a press leads to (isClickOf)", () => {
  const button = node();
  const icon = node(button);
  it("is on the pressed element, or on one holding it (the pointer moved within)", () => {
    expect(isClickOf(icon, icon)).toBe(true);
    expect(isClickOf(icon, button)).toBe(true);
  });
  it("not on another element, nor none", () => {
    expect(isClickOf(button, icon)).toBe(false);
    expect(isClickOf(node(), button)).toBe(false);
    expect(isClickOf(button, null)).toBe(false);
  });
});

describe("pressedClick", () => {
  it("takes the press's own click, once", () => {
    const press = pressedClick();
    const target = node();
    press.arm(target as never);
    expect(press.take(target as never)).toBe(true);
    expect(press.take(target as never)).toBe(false);
  });

  it("a press that never became a click (the page's scrollbar) doesn't take a later keyboard click", () => {
    vi.useFakeTimers();
    const press = pressedClick();
    const page = node();
    const saved = node();
    press.arm(page as never);
    press.release("mouse");
    vi.advanceTimersByTime(0);
    expect(press.armed()).toBe(false);
    expect(press.take(saved as never)).toBe(false);
  });

  it("nor a keyboard click elsewhere while it's still armed (no pointerup came)", () => {
    const press = pressedClick();
    press.arm(node() as never);
    expect(press.take(node() as never)).toBe(false);
    expect(press.armed()).toBe(false);
  });

  it("a mouse's click comes in the same task as its pointerup; a touch's may come a little later", () => {
    vi.useFakeTimers();
    const press = pressedClick();
    const target = node();
    press.arm(target as never);
    press.release("touch");
    vi.advanceTimersByTime(TOUCH_CLICK_MS - 50);
    expect(press.take(target as never)).toBe(true);
    press.arm(target as never);
    press.release("touch");
    vi.advanceTimersByTime(TOUCH_CLICK_MS);
    expect(press.take(target as never)).toBe(false);
  });
});
