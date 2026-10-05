import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BRAND } from "../src/scripts/lib/brandColors";

const tokens = readFileSync(new URL("../src/styles/tokens.css", import.meta.url), "utf8");
/** "cream150" → "--cream-150", "white" → "--white". */
const tokenName = (name: string) => `--${name.replace(/(\d+)$/, "-$1")}`;

describe("the brand's hex colors", () => {
  it.each(Object.entries(BRAND))("%s is its palette token in tokens.css", (name, hex) => {
    expect(tokens).toContain(`${tokenName(name)}: ${hex.toLowerCase()};`);
  });
});
