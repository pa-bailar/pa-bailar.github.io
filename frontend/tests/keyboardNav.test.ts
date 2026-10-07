import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { firstInView, neighbor } from "../src/scripts/views/keyboardNav";

// Moving through the events with the keyboard (the owner, 5 October 2026): which card each arrow lands on.

const box = (left: number, top: number) => ({ left, top, width: 260, height: 620 });
// A grid of three columns: two full rows and one card on the third.
const grid = [box(0, 0), box(280, 0), box(560, 0), box(0, 640), box(280, 640), box(560, 640), box(0, 1280)];
// The phones' feed: one column.
const feed = [box(0, 0), box(0, 700), box(0, 1400)];

describe("arrows between cards", () => {
  it("← → go by reading order, across rows, and stop at the ends", () => {
    expect(neighbor(grid, 2, "right")).toBe(3);
    expect(neighbor(grid, 3, "left")).toBe(2);
    expect(neighbor(grid, 0, "left")).toBeNull();
    expect(neighbor(grid, 6, "right")).toBeNull();
  });

  it("↑ ↓ go to the row above or below, the card closest to this one's middle", () => {
    expect(neighbor(grid, 1, "down")).toBe(4);
    expect(neighbor(grid, 5, "up")).toBe(2);
    expect(neighbor(grid, 5, "down")).toBe(6); // the last row's only card
    expect(neighbor(grid, 6, "down")).toBeNull();
    expect(neighbor(grid, 0, "up")).toBeNull();
  });

  it("in the phones' single column ↑ ↓ and ← → walk the same way", () => {
    expect(neighbor(feed, 0, "down")).toBe(1);
    expect(neighbor(feed, 2, "up")).toBe(1);
    expect(neighbor(feed, 1, "right")).toBe(2);
  });
});

describe("the card an arrow starts on, nothing focused", () => {
  // The grid scrolled: the first row's cards go from -343 to 277 (under the pinned bar, which ends at 132).
  const scrolled = [box(0, -343), box(280, -343), box(560, -343), box(0, 297), box(280, 297), box(560, 297)];

  it("is the first whose top shows below the pinned bars, not one scrolled almost out above (bug-squash, 6 Oct)", () => {
    expect(firstInView(scrolled, 132, 800)).toBe(3);
    expect(firstInView(grid, 132, 800)).toBe(3); // the first row's tops are under the bar
    expect(firstInView(grid, 0, 800)).toBe(0);
  });

  it("falls back to a card taller than the room, and to none without cards", () => {
    expect(firstInView([box(0, -100)], 132, 400)).toBe(0);
    expect(firstInView([], 132, 800)).toBeNull();
  });
});

describe("a summarized period's block among the cards (the owner, 6 Oct 2026)", () => {
  // Two rows of cards, then November's "Ver los 23 eventos" (the grid's whole width), then December's.
  const wide = (top: number) => ({ left: 0, top, width: 820, height: 160 });
  const list = [box(0, 0), box(280, 0), box(560, 0), box(0, 640), box(280, 640), wide(1300), wide(1500)];

  it("↓ from any card of the last row, and → from the last card, reach the block", () => {
    expect(neighbor(list, 3, "down")).toBe(5);
    expect(neighbor(list, 4, "down")).toBe(5);
    expect(neighbor(list, 4, "right")).toBe(5);
  });

  it("from one block the next is below, and ↑ goes back to the card closest to the middle", () => {
    expect(neighbor(list, 5, "down")).toBe(6);
    expect(neighbor(list, 6, "up")).toBe(5);
    expect(neighbor(list, 5, "up")).toBe(4); // the middle (410) is closest to the card at 280
  });
});

describe("a short button just above the next period's cards (bug, 6 Oct 2026)", () => {
  // The weekend's last row, its "Ver 10 más" (44 px tall, centered), and next week's first row 168 px below it.
  const button = { left: 590, top: 1272, width: 100, height: 44 };
  const list = [box(0, 640), box(280, 640), button, box(0, 1440), box(280, 1440)];

  it("↓ from a card stops on the button, not on the card closer to its middle below it", () => {
    expect(neighbor(list, 0, "down")).toBe(2);
    expect(neighbor(list, 2, "down")).toBe(4); // the card closest to its middle
    expect(neighbor(list, 3, "up")).toBe(2);
    expect(neighbor(list, 2, "up")).toBe(1); // the middle (640) is closest to the card at 280
  });
});

describe("the list's container never takes the focus by a click", () => {
  const home = readFileSync(new URL("../src/components/HomePage.astro", import.meta.url), "utf8");

  it("<main> has no tabindex of its own: the skip link gives it one only while it has the focus (main.ts)", () => {
    // With one for good, a click in the list's gaps (in Safari, on any card) focused <main>: the arrows then did
    // nothing and Tab started over from the list's top (the bug-squash pass, 6 Oct 2026).
    const main = home.match(/<main\s[^>]*>/)?.[0] ?? "";
    expect(main).toContain('id="contenido"');
    expect(main).not.toMatch(/tabindex/i);
    expect(home).toMatch(/<a class="skip-link" href="#contenido" data-skip>/);
  });
});
