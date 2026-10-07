import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The page's base styles (base.css): what every element inherits.
describe("base.css", () => {
  const css = readFileSync(new URL("../src/styles/base.css", import.meta.url), "utf8");
  const rule = (selector: string) => {
    const start = css.indexOf(`${selector} {`);
    return css.slice(start, css.indexOf("}", start));
  };

  it("no browser flash on a tap, anywhere (the owner, 7 Oct 2026: Android Chrome's blue box over a whole card)", () => {
    expect(rule("html")).toContain("-webkit-tap-highlight-color: transparent;");
  });
});
