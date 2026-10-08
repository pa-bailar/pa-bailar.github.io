// A value kept in this browser (lib/storedValue.ts: the install offer's dates, and storedSwitch's base): with storage
// blocked it reads as nothing and writing does nothing, and the page never breaks.
import { describe, expect, it } from "vitest";
import { storedValue } from "../src/scripts/lib/storedValue";

function memory() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
}

const blocked = () => {
  throw new DOMException("blocked", "SecurityError");
};

describe("storedValue", () => {
  it("reads what was stored; null removes it", () => {
    const storage = memory();
    const value = storedValue("install-dismissed-at", () => storage);
    expect(value.get()).toBeNull();
    value.set("1759700000000");
    expect(value.get()).toBe("1759700000000");
    value.set(null);
    expect(value.get()).toBeNull();
  });

  it("with storage blocked: nothing read, nothing thrown", () => {
    const value = storedValue("install-nudged", blocked);
    expect(value.get()).toBeNull();
    expect(() => value.set("1")).not.toThrow();
  });

  // With storage blocked, the install banner's × did nothing: the date it wrote was lost, and the banner read it as
  // never dismissed (the bug hunt of 7 Oct 2026). Every stored setting holds for the visit.
  it("with storage blocked: what's set holds for the rest of the visit", () => {
    const value = storedValue("install-dismissed-at", blocked);
    value.set("1759700000000");
    expect(value.get()).toBe("1759700000000");
    value.set(null);
    expect(value.get()).toBeNull();
  });

  it("storage that reads but can't write (full; Safari's old private mode): what's set holds for the visit", () => {
    const storage = { ...memory(), setItem: () => blocked() };
    const value = storedValue("install-dismissed-at", () => storage);
    value.set("1759700000000");
    expect(value.get()).toBe("1759700000000");
  });

  it("once storage keeps a value again, what's stored is read (another tab may change it)", () => {
    const storage = memory();
    let full = true;
    const value = storedValue("install-nudged", () => (full ? { ...storage, setItem: () => blocked() } : storage));
    value.set("1");
    full = false;
    value.set("2");
    storage.setItem("install-nudged", "3"); // another tab
    expect(value.get()).toBe("3");
  });
});

describe("the install offer", () => {
  it("keeps nothing in storage by hand: it uses the shared helpers", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(new URL("../src/scripts/views/installPrompt.ts", import.meta.url), "utf8");
    expect(source).not.toContain("localStorage");
  });
});
