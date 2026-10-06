import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FALLBACK, TOKENS, fallbackCss, lightDarkTokens, pickSide } from "../scripts/light-dark-fallback.mjs";

// The colors for browsers without light-dark() (iOS 16's Safari; the owner, 6 Oct 2026): tokens-fallback.css.

describe("picking a side of light-dark()", () => {
  it("takes the light or the dark value, inside a longer value and with nested functions", () => {
    expect(pickSide("light-dark(var(--a), var(--b))", "light")).toBe("var(--a)");
    expect(pickSide("light-dark(var(--a), var(--b))", "dark")).toBe("var(--b)");
    const shadow = "0 8px 24px light-dark(rgb(42 15 20 / 0.18), rgb(0 0 0 / 0.45))";
    expect(pickSide(shadow, "light")).toBe("0 8px 24px rgb(42 15 20 / 0.18)");
    expect(pickSide(shadow, "dark")).toBe("0 8px 24px rgb(0 0 0 / 0.45)");
  });
});

describe("tokens-fallback.css", () => {
  const tokens = readFileSync(TOKENS, "utf8");

  it("is current: regenerate it (node scripts/light-dark-fallback.mjs) after changing a light-dark() token", () => {
    expect(readFileSync(FALLBACK, "utf8").replace(/\r\n/g, "\n")).toBe(fallbackCss(tokens));
  });

  it("covers every declaration that uses light-dark(), and leaves none in its values", () => {
    const uses = tokens.replace(/\/\*[\s\S]*?\*\//g, "").match(/light-dark\(/g) ?? [];
    expect(lightDarkTokens(tokens)).toHaveLength(uses.length);
    const rules = fallbackCss(tokens).split("@supports")[1]!.split("{").slice(1).join("{");
    expect(rules).not.toContain("light-dark(");
  });
});
