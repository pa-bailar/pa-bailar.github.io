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
});

describe("the install offer", () => {
  it("keeps nothing in storage by hand: it uses the shared helpers", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(new URL("../src/scripts/views/installPrompt.ts", import.meta.url), "utf8");
    expect(source).not.toContain("localStorage");
  });
});
