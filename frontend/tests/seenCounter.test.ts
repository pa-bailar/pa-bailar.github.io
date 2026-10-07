// Which events count as seen (lib/analytics.ts seenCounter, the details' visits in GoatCounter): opened on purpose, at
// once; shown in passing by the side panel following the keyboard, only once read; never twice while they stay shown.
// The owner's console, 6 Oct 2026: walking a row with the arrows counted a visit for every event passed.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SEEN_AFTER_MS, seenCounter } from "../src/scripts/lib/analytics";

const event = (id: string) => ({ id });

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("an event counted as seen", () => {
  it("opened on purpose (a tap, Enter, a link): at once", () => {
    const seen = vi.fn();
    seenCounter(seen).show(event("a"), { passing: false });
    expect(seen).toHaveBeenCalledWith({ id: "a" });
  });

  it("passed by the arrows: not at all", () => {
    const seen = vi.fn();
    const counter = seenCounter(seen);
    for (const id of ["a", "b", "c"]) {
      counter.show(event(id), { passing: true });
      vi.advanceTimersByTime(300);
    }
    counter.show(event("d"), { passing: true });
    expect(seen).not.toHaveBeenCalled();
    vi.advanceTimersByTime(SEEN_AFTER_MS);
    expect(seen.mock.calls).toEqual([[{ id: "d" }]]); // where the arrows stopped, once read
  });

  it("closed before it was read: not at all", () => {
    const seen = vi.fn();
    const counter = seenCounter(seen);
    counter.show(event("a"), { passing: true });
    counter.hide();
    vi.advanceTimersByTime(SEEN_AFTER_MS);
    expect(seen).not.toHaveBeenCalled();
  });

  it("read in passing, then opened with Enter: once", () => {
    const seen = vi.fn();
    const counter = seenCounter(seen);
    counter.show(event("a"), { passing: true });
    vi.advanceTimersByTime(SEEN_AFTER_MS);
    counter.show(event("a"), { passing: false });
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it("shown again after another one, or after closing: counted again", () => {
    const seen = vi.fn();
    const counter = seenCounter(seen);
    counter.show(event("a"), { passing: false });
    counter.show(event("b"), { passing: false });
    counter.show(event("a"), { passing: false });
    counter.hide();
    counter.show(event("a"), { passing: false });
    expect(seen.mock.calls.map(([item]) => item.id)).toEqual(["a", "b", "a", "a"]);
  });

  it("says whether it counted right then (an opening on purpose counts its source once)", () => {
    const counter = seenCounter(vi.fn());
    expect(counter.show(event("a"), { passing: true })).toBe(false);
    expect(counter.show(event("a"), { passing: false })).toBe(true); // Enter on what the pane showed
    expect(counter.show(event("a"), { passing: false })).toBe(false); // already counted
  });
});

