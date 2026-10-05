// The build's module preloads (scripts/module-preload.mjs): each page's script and the chunks it imports, announced
// in <head>, so the shared chunk (sharing.js) isn't a second round trip.
import { describe, expect, it } from "vitest";
import { staticImports, withModulePreloads } from "../scripts/module-preload.mjs";

describe("module preloads", () => {
  it("reads a chunk's static imports, not its dynamic ones", () => {
    const code = `import{a as e}from"./sharing.D0sx.js";import"./side.B1.js";const x=()=>import("./later.C2.js");`;
    expect(staticImports(code, "/_astro/HomePage.Kr9.js")).toEqual(["/_astro/sharing.D0sx.js", "/_astro/side.B1.js"]);
  });

  it("puts the page's script and every chunk it needs, once, in <head>", () => {
    const html = `<html><head><title>x</title></head><body><script type="module" src="/_astro/HomePage.Kr9.js"></script></body></html>`;
    const imports: Record<string, string[]> = { "/_astro/HomePage.Kr9.js": ["/_astro/sharing.D0sx.js"], "/_astro/sharing.D0sx.js": ["/_astro/HomePage.Kr9.js"] };
    const out = withModulePreloads(html, (file: string) => imports[file] ?? []);
    expect(out).toContain(
      `<link rel="modulepreload" href="/_astro/HomePage.Kr9.js"><link rel="modulepreload" href="/_astro/sharing.D0sx.js"></head>`,
    );
  });

  it("leaves a page without a module script alone (the 404 page's inline script)", () => {
    const html = "<html><head></head><body><script>1</script></body></html>";
    expect(withModulePreloads(html, () => [])).toBe(html);
  });
});
