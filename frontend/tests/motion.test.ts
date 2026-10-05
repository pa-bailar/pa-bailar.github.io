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
