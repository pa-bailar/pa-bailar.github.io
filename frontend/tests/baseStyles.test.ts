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

  it("a held button or link shows it (the bug hunt of 7 Oct 2026), never a card, its link or its flyer", () => {
    const start = css.indexOf(":where(button, a[href]");
    const pressed = css.slice(start, css.indexOf("}", start));
    expect(pressed).toContain(":active:not(");
    expect(pressed).toContain(".event-card__hit");
    expect(pressed).toContain("opacity: var(--pressed-opacity);");
    expect(pressed).not.toMatch(/event-card__frame|data-card-image|\.event-card[ ,{:]/); // the card and its flyer
  });
});
