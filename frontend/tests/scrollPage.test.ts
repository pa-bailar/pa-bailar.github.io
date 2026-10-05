// A scroll on purpose (scrollPageTo, views/jumpBar.ts: a card brought into view, the list back at its period) is
// animated; a new one, or the visitor's own wheel or touch, stops it.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scrollPageTo } from "../src/scripts/views/jumpBar";

let frames: Map<number, (now: number) => void>;
let clock: number;
let page: EventTarget & { scrollY: number; scrollTo: (options: { top: number }) => void; matchMedia: () => { matches: boolean } };

/** The next animation frames, `ms` apart. */
function runFrames(count: number, ms = 16) {
  for (let i = 0; i < count; i++) {
    clock += ms;
    const due = [...frames.entries()];
    frames.clear();
    due.forEach(([, callback]) => callback(clock));
  }
}

beforeEach(() => {
  frames = new Map();
  clock = 0;
  let id = 0;
  page = Object.assign(new EventTarget(), {
    scrollY: 0,
    scrollTo({ top }: { top: number }) {
      page.scrollY = top;
    },
    matchMedia: () => ({ matches: false }),
  });
  vi.stubGlobal("window", page);
  vi.stubGlobal("performance", { now: () => clock });
  vi.stubGlobal("requestAnimationFrame", (callback: (now: number) => void) => (frames.set(++id, callback), id));
  vi.stubGlobal("cancelAnimationFrame", (frame: number) => frames.delete(frame));
});

afterEach(() => vi.unstubAllGlobals());

describe("a scroll on purpose", () => {
  it("eases to where it was sent", () => {
    scrollPageTo(1000, { smooth: true });
    runFrames(5);
    expect(page.scrollY).toBeGreaterThan(0);
    expect(page.scrollY).toBeLessThan(1000);
    runFrames(30);
    expect(page.scrollY).toBe(1000);
    expect(frames.size).toBe(0);
  });

  it("stops at the visitor's wheel or touch: the page stays where they took it", () => {
    for (const type of ["wheel", "touchstart"]) {
      page.scrollY = 0;
      scrollPageTo(1000, { smooth: true });
      runFrames(3);
      const there = page.scrollY;
      page.dispatchEvent(new Event(type));
      runFrames(30);
      expect(page.scrollY).toBe(there);
    }
  });

  it("a new one takes over from the one running", () => {
    scrollPageTo(1000, { smooth: true });
    runFrames(3);
    scrollPageTo(200);
    runFrames(30);
    expect(page.scrollY).toBe(200);
  });
});
