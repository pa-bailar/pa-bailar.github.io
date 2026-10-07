import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DURATION, EASE } from "../src/scripts/lib/motion";

const tokens = readFileSync(new URL("../src/styles/tokens.css", import.meta.url), "utf8");
const kebab = (name: string) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

describe("the scripts' motion agrees with tokens.css", () => {
  it.each(Object.entries(DURATION))("DURATION.%s is --duration-*", (name, ms) => {
    expect(tokens).toContain(`--duration-${kebab(name)}: ${ms}ms;`);
  });

  it.each(Object.entries(EASE))("EASE.%s is --ease-*", (name, curve) => {
    expect(tokens).toContain(`--ease-${kebab(name)}: ${curve};`);
  });

  it("no stylesheet writes these curves itself", () => {
    const styles = ["components/sheet.css", "components/drawer.css", "components/event-card.css"].map((file) =>
      readFileSync(new URL(`../src/styles/${file}`, import.meta.url), "utf8"),
    );
    for (const css of styles) expect(css).not.toContain("cubic-bezier(");
  });
});

describe("the loader (loader.css)", () => {
  const loader = readFileSync(new URL("../src/styles/components/loader.css", import.meta.url), "utf8");

  it("turns only for visitors who allow motion, at its token's pace", () => {
    const allowed = loader.slice(loader.indexOf("@media (prefers-reduced-motion: no-preference)"));
    const outside = loader.replace(allowed.slice(0, allowed.indexOf("}\n}") + 3), "");
    expect(allowed).toContain("animation: loader-turn var(--duration-loop)");
    expect(outside).not.toMatch(/animation:/);
    expect(tokens).toMatch(/--duration-loop: \d+ms;/);
  });
});
