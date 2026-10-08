import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The viewport meta (layouts/BaseLayout.astro), which every page shares.
describe("the viewport", () => {
  const layout = readFileSync(new URL("../src/layouts/BaseLayout.astro", import.meta.url), "utf8");
  const viewport = /<meta name="viewport" content="([^"]+)"/.exec(layout)?.[1] ?? "";

  // The iPhone audit, 8 Oct 2026: without viewport-fit=cover iOS reports env(safe-area-inset-*) as 0, so in the
  // home-screen app the bar at the bottom (and the sheets' bottom padding) sat under the home indicator.
  it("covers the screen, so the safe-area insets are real on iPhone", () => {
    expect(viewport).toContain("viewport-fit=cover");
  });

  it("the phone's width, never fixed, and zoom left to the visitor", () => {
    expect(viewport).toContain("width=device-width");
    expect(viewport).not.toMatch(/user-scalable=no|maximum-scale=1\b/);
  });

  it("the bars that pad for the insets still do (bottom-nav.css)", () => {
    const css = readFileSync(new URL("../src/styles/components/bottom-nav.css", import.meta.url), "utf8");
    expect(css).toContain("env(safe-area-inset-bottom)");
  });
});
