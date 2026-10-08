import { readdirSync, readFileSync } from "node:fs";
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

  it("unsaving in Guardados, where the card goes away, can be undone; Ctrl+Z too (the keyboard's way)", () => {
    expect(saveNotice(false, saved)).toBe("unsaved");
    expect(SAVE_NOTICES.unsaved.action).toBe("Deshacer");
    expect(SAVE_NOTICES.unsaved.undo).toBe(true);
    expect(SAVE_NOTICES.saved.undo).toBeUndefined(); // "Ver guardados" undoes nothing
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

  // Under the image beside the details (wide screens), its button couldn't be clicked: the click went to the flyer, and
  // the one install reminder was spent there unseen (the bug hunt of 7 Oct 2026).
  it("is drawn over every other layer of the page: the side panel, the image beside it, the sticky bars", () => {
    const tokens = readFileSync(new URL("../src/styles/tokens.css", import.meta.url), "utf8");
    const layer = (name: string) => Number(new RegExp(`--${name}:\\s*(-?\\d+)`).exec(tokens)?.[1]);
    const styles = new URL("../src/styles/", import.meta.url);
    const others = readdirSync(styles, { recursive: true, encoding: "utf8" })
      .filter((file) => file.endsWith(".css") && !file.endsWith("notice.css"))
      .map((file) => readFileSync(new URL(file.replaceAll("\\", "/"), styles), "utf8"))
      .flatMap((source) => [...source.matchAll(/z-index:\s*var\(--(z-[a-z]+)\)/g)].map((match) => match[1]!));
    expect(css).toMatch(/z-index:\s*var\(--z-notice\)/);
    expect(others).toContain("z-panel"); // the side panel and the image beside it
    for (const other of others) expect(layer("z-notice")).toBeGreaterThan(layer(other));
  });

  it("rises only for visitors who allow motion", () => {
    const allowed = css.slice(css.indexOf("@media (prefers-reduced-motion: no-preference)"));
    const outside = css.replace(allowed.slice(0, allowed.indexOf("}\n}") + 3), "");
    expect(allowed).toContain("animation: notice-in");
    expect(outside).not.toMatch(/animation:/);
  });
});
