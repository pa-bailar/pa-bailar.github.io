// Pasting Safari's saves in the installed iPhone app (views/savedMoveView.ts).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const items = new Map<string, string>();
const stored = () => JSON.parse(items.get("saved-events") ?? "[]") as string[];

beforeEach(() => {
  items.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
  });
  vi.stubGlobal("window", new EventTarget());
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const clipboard = (text: string) =>
  vi.stubGlobal("navigator", { clipboard: { readText: async () => text } });

describe("pasteSavesFromSafari", () => {
  // The bug-squash pass of 8 Oct 2026: the app may show an older stored copy of the page than Safari's (offline, a slow
  // network); its unknown ids were dropped, so those saves were lost and "No hay guardados" was said instead.
  it("saves every id copied, also events this copy of the page doesn't know yet", async () => {
    const { pasteSavesFromSafari } =
      await import("../src/scripts/views/savedMoveView");
    clipboard(
      "Mis eventos guardados en Pa' Bailar: https://pa-bailar.github.io/?guardados=social-17-oct,nuevo-24-oct",
    );
    expect(await pasteSavesFromSafari()).toEqual({ added: 2 });
    expect(stored()).toEqual(["social-17-oct", "nuevo-24-oct"]);
    expect(await pasteSavesFromSafari()).toEqual({ added: 0 }); // "Ya tenías esos guardados aquí"
  });

  it("nothing of ours on the clipboard, or no reading it", async () => {
    const { pasteSavesFromSafari } =
      await import("../src/scripts/views/savedMoveView");
    clipboard("hola");
    expect(await pasteSavesFromSafari()).toBe("nothing");
    vi.stubGlobal("navigator", {
      clipboard: { readText: () => Promise.reject(new Error("denied")) },
    });
    expect(await pasteSavesFromSafari()).toBe("denied");
  });
});
