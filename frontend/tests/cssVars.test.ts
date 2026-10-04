import { describe, expect, it } from "vitest";
import { problems, scan } from "../scripts/check-css-vars.mjs";

const check = (sources: { file: string; text: string }[], allowed: string[] = []) => problems(scan(sources), allowed);

describe("the CSS custom properties check", () => {
  it("passes when every property read is defined", () => {
    const sources = [
      { file: "tokens.css", text: ":root { --text-base: 1rem; }" },
      { file: "buttons.css", text: ".search-input { font-size: var(--text-base); }" },
    ];
    expect(check(sources)).toEqual([]);
  });

  it("fails on a property read but never defined (the search fields' 15 px text)", () => {
    const sources = [{ file: "buttons.css", text: ".search-input { font-size: var(--text-base); }" }];
    expect(check(sources)).toEqual(["--text-base is read (buttons.css) but never defined"]);
  });

  it("accepts those set from scripts, while a script still sets them", () => {
    const css = { file: "drawer.css", text: ".drawer { transform: translateY(var(--drawer-y, 0)); }" };
    const script = { file: "eventDrawer.ts", text: 'element.style.setProperty("--drawer-y", `${next}px`);' };
    expect(check([css, script], ["--drawer-y"])).toEqual([]);
    expect(check([css], ["--drawer-y"])).toEqual(["--drawer-y is listed as set from scripts, but no script sets it"]);
  });

  it("ignores comments", () => {
    expect(check([{ file: "a.css", text: "/* var(--gone) */ a { color: red; }" }])).toEqual([]);
  });
});
