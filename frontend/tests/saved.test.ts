// Saved events (lib/saved.ts): shared by every tab of the site, and never lost to an older copy of the page.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Saved = typeof import("../src/scripts/lib/saved");

/** The browser's storage, shared by the "tabs" (each a fresh copy of the module, as each page has its own). */
const items = new Map<string, string>();
const storage = {
  getItem: (key: string) => items.get(key) ?? null,
  setItem: (key: string, value: string) => void items.set(key, value),
};

async function tab(): Promise<Saved> {
  vi.resetModules();
  return import("../src/scripts/lib/saved");
}

const stored = () => JSON.parse(items.get("saved-events") ?? "[]") as string[];

beforeEach(() => {
  items.clear();
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("window", new EventTarget());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("saved events (lib/saved.ts)", () => {
  it("a save in one tab keeps the saves another tab made since this one opened", async () => {
    const first = await tab();
    expect(first.isSaved("a")).toBe(false); // this tab has read the saves: none yet
    const second = await tab();
    second.toggleSaved("b");
    first.toggleSaved("c");
    expect(stored()).toEqual(["b", "c"]); // b survived; the old list would have been ["c"]
  });

  it("hears another tab's saves and reads them again", async () => {
    const page = await tab();
    const changed = vi.fn();
    page.onSavedElsewhere(changed);
    expect(page.isSaved("b")).toBe(false);
    items.set("saved-events", JSON.stringify(["b"])); // the other tab
    window.dispatchEvent(Object.assign(new Event("storage"), { key: "saved-events" }));
    expect(changed).toHaveBeenCalledOnce();
    expect(page.isSaved("b")).toBe(true);
    window.dispatchEvent(Object.assign(new Event("storage"), { key: "theme" }));
    expect(changed).toHaveBeenCalledOnce(); // another setting: nothing to do
  });

  it("an older copy of the page, lacking the newest events, doesn't forget their saves", async () => {
    items.set("saved-events", JSON.stringify(["old-event", "new-event"]));
    const page = await tab();
    page.trimSaved(new Set(["old-event"])); // the page doesn't know "new-event"
    expect(stored()).toEqual(["old-event", "new-event"]);
    expect(page.isSaved("new-event")).toBe(true);
  });

  it("past the limit, forgets only the oldest saves whose events are gone", async () => {
    const ids = Array.from({ length: 203 }, (_, n) => `e${n}`);
    items.set("saved-events", JSON.stringify(ids));
    const page = await tab();
    page.trimSaved(new Set(["e0", ...ids.slice(5)])); // e1–e4 are gone from the data; e0 isn't
    expect(stored()).toEqual(["e0", "e4", ...ids.slice(5)]); // three forgotten: e1, e2, e3
    expect(stored()).toHaveLength(page.SAVED_LIMIT);
  });

  it("with storage blocked, saves last the visit", async () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new DOMException("blocked", "SecurityError");
      },
      setItem: () => {
        throw new DOMException("blocked", "SecurityError");
      },
    });
    const page = await tab();
    expect(page.toggleSaved("a")).toBe(true);
    expect(page.toggleSaved("b")).toBe(true);
    expect(page.isSaved("a") && page.isSaved("b")).toBe(true);
    expect(page.toggleSaved("a")).toBe(false);
  });

  // The bug-squash pass of 8 Oct 2026: in Guardados, an event unsaved ("Quitado · Deshacer"), then saved again in
  // another tab, then Deshacer here (Ctrl+Z): Deshacer toggled it, so it took the event away for good.
  it("Deshacer saves the event again from what's stored now: another tab's save meanwhile stays", async () => {
    const page = await tab();
    page.toggleSaved("x");
    page.toggleSaved("x"); // unsaved here: "Quitado de tus guardados · Deshacer"
    const other = await tab();
    other.toggleSaved("x"); // saved again in another tab
    expect(page.setSaved("x", true)).toBe(false); // Deshacer: already saved, nothing to change
    expect(stored()).toEqual(["x"]);
    page.toggleSaved("x");
    expect(page.setSaved("x", true)).toBe(true);
    expect(stored()).toEqual(["x"]);
  });

  it("the page's Deshacer saves again, never toggles (main.ts)", async () => {
    const { readFileSync } = await import("node:fs");
    const main = readFileSync(new URL("../src/scripts/main.ts", import.meta.url), "utf8");
    expect(main).toContain("undo: () => saveAgain(id)");
  });
});
