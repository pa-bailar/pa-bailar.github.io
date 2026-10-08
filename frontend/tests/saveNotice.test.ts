import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SAVE_NOTICES, saveNotice } from "../src/scripts/lib/saveNotice";

// What a save or an unsave says at the bottom of the screen (the Instagram audit of 7 Oct 2026: saving gave no sign
// beyond the bookmark, and unsaving in Guardados took the card away with no way back).
describe("the notice after saving (lib/saveNotice.ts)", () => {
  const list = { inSaved: false, inAppFirst: false };
  const saved = { inSaved: true, inAppFirst: false };

  it("a save says so, with the way to Guardados", () => {
    expect(saveNotice(true, list)).toBe("saved");
    expect(SAVE_NOTICES.saved).toMatchObject({ text: "Guardado", action: "Ver guardados" });
  });

  it("unsaving in Guardados, where the card goes away, can be undone", () => {
    expect(saveNotice(false, saved)).toBe("unsaved");
    expect(SAVE_NOTICES.unsaved.action).toBe("Deshacer");
  });

  it("says nothing where the change is in sight: unsaving in the list, Deshacer bringing the card back", () => {
    expect(saveNotice(false, list)).toBeNull();
    expect(saveNotice(true, saved)).toBeNull();
    expect(saveNotice(true, { inSaved: true, inAppFirst: true })).toBeNull();
  });

  it("inside an app's browser, the visit's first save says it stays there", () => {
    expect(saveNotice(true, { inSaved: false, inAppFirst: true })).toBe("saved-here-only");
    expect(SAVE_NOTICES["saved-here-only"].text).toBe("Guardado solo en este navegador");
  });

  it("each button is counted apart", () => {
    const tracks = Object.values(SAVE_NOTICES).map((notice) => notice.track);
    expect(new Set(tracks).size).toBe(tracks.length);
  });
});

describe("the notice's element (notice.css, Notice.astro)", () => {
  const css = readFileSync(new URL("../src/styles/components/notice.css", import.meta.url), "utf8");
  const element = readFileSync(new URL("../src/components/Notice.astro", import.meta.url), "utf8");
  const pages = ["../src/components/HomePage.astro", "../src/pages/evento/[id].astro"].map((path) =>
    readFileSync(new URL(path, import.meta.url), "utf8"),
  );

  it("is a live region always in the page: empty between notices, never hidden (screen readers miss those)", () => {
    expect(element).toMatch(/<div class="notice" id="notice" role="status"><\/div>/);
    const empty = css.slice(css.indexOf(".notice:empty {"), css.indexOf("}", css.indexOf(".notice:empty {")));
    expect(empty).not.toMatch(/display:\s*none|visibility:\s*hidden/);
  });

  it("is on both pages that show a notice: the home page and an event's own page (\"Enlace copiado\")", () => {
    for (const page of pages) expect(page).toContain("<Notice />");
  });

  it("rises only for visitors who allow motion", () => {
    const allowed = css.slice(css.indexOf("@media (prefers-reduced-motion: no-preference)"));
    const outside = css.replace(allowed.slice(0, allowed.indexOf("}\n}") + 3), "");
    expect(allowed).toContain("animation: notice-in");
    expect(outside).not.toMatch(/animation:/);
  });
});
