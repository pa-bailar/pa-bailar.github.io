import { describe, expect, it } from "vitest";
import { isThemeValue, otherTheme, storedTheme, THEME_COLORS, THEME_STORAGE_KEY } from "../src/scripts/themeConfig";
import { themePrePaintScript } from "../src/themeScript";

describe("storedTheme", () => {
  it("is light by default: nothing saved", () => {
    expect(storedTheme(null)).toBe("light");
    expect(storedTheme(undefined)).toBe("light");
  });

  it("keeps a saved choice", () => {
    expect(storedTheme("dark")).toBe("dark");
    expect(storedTheme("light")).toBe("light");
  });

  it("reads the old auto mode and unknown values as light", () => {
    for (const value of ["auto", "noche", "día", "Dark", "", "null"]) expect(storedTheme(value)).toBe("light");
  });
});

describe("isThemeValue", () => {
  it("accepts only what this version writes", () => {
    expect(isThemeValue("light")).toBe(true);
    expect(isThemeValue("dark")).toBe(true);
    expect(isThemeValue("auto")).toBe(false);
    expect(isThemeValue(null)).toBe(false);
  });
});

describe("otherTheme", () => {
  it("switches between the two", () => {
    expect(otherTheme("light")).toBe("dark");
    expect(otherTheme("dark")).toBe("light");
  });
});

/** Runs the pre-paint script with a stored value (or blocked storage) and returns what it set. */
function prePaint(stored: string | null | "blocked") {
  const root = { dataset: {} as Record<string, string> };
  const meta = { content: "", setAttribute: (_: string, value: string) => (meta.content = value) };
  const localStorage = {
    getItem: (key: string) => {
      if (stored === "blocked") throw new Error("SecurityError");
      return key === THEME_STORAGE_KEY ? stored : null;
    },
  };
  const document = { documentElement: root, querySelector: () => meta };
  new Function("localStorage", "document", themePrePaintScript)(localStorage, document);
  return { theme: root.dataset.theme, color: meta.content };
}

describe("themePrePaintScript", () => {
  it("applies light on a first visit, whatever the device prefers", () => {
    expect(prePaint(null)).toEqual({ theme: "light", color: THEME_COLORS.light });
  });

  it("applies a saved Oscuro before first paint, with the dark address bar", () => {
    expect(prePaint("dark")).toEqual({ theme: "dark", color: THEME_COLORS.dark });
  });

  it("agrees with storedTheme on every value, including the old auto mode", () => {
    for (const value of [null, "light", "dark", "auto", "noche", "garbage"]) {
      expect(prePaint(value).theme).toBe(storedTheme(value));
    }
  });

  it("falls back to light when storage is blocked", () => {
    expect(prePaint("blocked").theme).toBe("light");
  });
});
