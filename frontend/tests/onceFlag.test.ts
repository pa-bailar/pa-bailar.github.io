import { describe, expect, it } from "vitest";
import { onceFlag } from "../src/scripts/lib/onceFlag";

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
  };
}

const broken = {
  getItem: (): string | null => {
    throw new Error("SecurityError");
  },
  setItem: () => {
    throw new Error("QuotaExceededError");
  },
};

describe("something shown once (the first visit's pulse on Detalles)", () => {
  it("isn't seen on a first visit, and is once marked", () => {
    const storage = memoryStorage();
    const flag = onceFlag("details-hint-seen", () => storage);
    expect(flag.seen()).toBe(false);
    flag.mark();
    expect(flag.seen()).toBe(true);
    expect(onceFlag("details-hint-seen", () => storage).seen()).toBe(true); // the next visit
  });

  it("each key is its own", () => {
    const storage = memoryStorage();
    onceFlag("swipe-hint-seen", () => storage).mark();
    expect(onceFlag("details-hint-seen", () => storage).seen()).toBe(false);
  });

  it("without storage (private mode, blocked) it counts as seen, and marking doesn't throw", () => {
    const flag = onceFlag("details-hint-seen", () => broken);
    expect(flag.seen()).toBe(true);
    expect(() => flag.mark()).not.toThrow();
  });

  it("storage that reads but can't write: once marked, it's seen for the rest of the visit", () => {
    const storage = { ...memoryStorage(), setItem: () => broken.setItem() };
    const flag = onceFlag("details-hint-seen", () => storage);
    expect(flag.seen()).toBe(false);
    flag.mark();
    expect(flag.seen()).toBe(true);
  });

  it("no localStorage at all (outside a browser) is the same", () => {
    const flag = onceFlag("details-hint-seen");
    expect(flag.seen()).toBe(true);
    expect(() => flag.mark()).not.toThrow();
  });
});
