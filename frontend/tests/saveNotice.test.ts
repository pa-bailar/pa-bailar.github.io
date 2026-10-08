import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SAVE_NOTICES, reminderMayReplace, saveNotice } from "../src/scripts/lib/saveNotice";
import { reminderDue } from "../src/scripts/views/installPrompt";

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

// The one install reminder came at the wrong moments (the bug hunt of 7 Oct 2026): after Deshacer in Guardados (not a
// new save), in place of the in-app note (which then never showed that visit), and right after the visitor had closed
// the install steps.
describe("the install reminder after a save (installPrompt.ts)", () => {
  const list = { inSaved: false, inAppFirst: false };
  const DAY = 24 * 60 * 60 * 1000;
  const openedAt = Date.UTC(2026, 9, 7, 20);
  const moment = { savedCount: 2, dismissedAt: openedAt - DAY, nudged: false, openedAt, now: openedAt + 60_000 };
  const due = (overrides: Partial<typeof moment> = {}) => reminderDue({ ...moment, ...overrides });

  it("takes the place of a new save's own notice, \"Guardado\", only", () => {
    expect(reminderMayReplace(saveNotice(true, list))).toBe(true);
    expect(reminderMayReplace(saveNotice(true, { inSaved: false, inAppFirst: true }))).toBe(false); // the in-app note
    expect(reminderMayReplace(saveNotice(true, { inSaved: true, inAppFirst: false }))).toBe(false); // Deshacer
    expect(reminderMayReplace(saveNotice(false, { inSaved: true, inAppFirst: false }))).toBe(false);
  });

  it("is due with two saved events, the banner dismissed on an earlier visit, never reminded", () => {
    expect(due()).toBe(true);
    expect(due({ savedCount: 3 })).toBe(true);
  });

  it("not before the second saved event, nor twice", () => {
    expect(due({ savedCount: 1 })).toBe(false);
    expect(due({ nudged: true })).toBe(false);
  });

  it("not in the visit the banner was dismissed or the steps closed: that answer holds for the visit", () => {
    expect(due({ dismissedAt: openedAt + 30_000 })).toBe(false);
  });

  it("not when the banner was never dismissed, or is back (30 days on): the banner itself offers it", () => {
    expect(due({ dismissedAt: 0 })).toBe(false);
    expect(due({ dismissedAt: openedAt - 31 * DAY })).toBe(false);
  });
});

describe("the notice's element (notice.css, Notice.astro)", () => {
  const css = readFileSync(new URL("../src/styles/components/notice.css", import.meta.url), "utf8");
  const element = readFileSync(new URL("../src/components/Notice.astro", import.meta.url), "utf8");
  const pages = ["../src/components/HomePage.astro", "../src/pages/evento/[id].astro"].map((path) =>
    readFileSync(new URL(path, import.meta.url), "utf8"),
  );

  it("is a live region always in the page: empty between notices, never hidden (screen readers miss those)", () => {
    expect(element).toMatch(/<div class="notice" id="notice" role="status"[^>]*><\/div>/); // empty inside
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

  // Searching on an iPhone, a bookmark tapped in the results leaves the keyboard up (the button takes no focus), and the
  // notice sat behind it, at the bottom of the page under the keyboard (the bug hunt of 7 Oct 2026).
  it("rises with the bar over the keyboard while searching on a phone", () => {
    const lifted = css.slice(css.indexOf(".notice.is-lifted {"));
    expect(lifted.slice(0, lifted.indexOf("}"))).toMatch(/bottom:[^;]*var\(--keyboard-inset\)/);
    const notice = readFileSync(new URL("../src/components/Notice.astro", import.meta.url), "utf8");
    expect(notice).toContain("data-rises-with-keyboard");
  });

  // Chrome on Android redraws its own navigation bar (back, home) when the page's root changes: the keyboard's inset
  // written on <html> at every step of the keyboard, and a rule anchored on the root, made it flash (the owner, 8 Oct
  // 2026). Nothing about the keyboard touches the root.
  it("never writes the keyboard's inset on the page's root, nor styles the notice from it", () => {
    const bottomNav = readFileSync(new URL("../src/scripts/views/bottomNav.ts", import.meta.url), "utf8");
    expect(bottomNav).not.toMatch(/documentElement\.style\.setProperty/);
    expect(css.replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(/:root:has\(/); // its rules, not its comments
  });

  it("rises only for visitors who allow motion", () => {
    const allowed = css.slice(css.indexOf("@media (prefers-reduced-motion: no-preference)"));
    const outside = css.replace(allowed.slice(0, allowed.indexOf("}\n}") + 3), "");
    expect(allowed).toContain("animation: notice-in");
    expect(outside).not.toMatch(/animation:/);
  });
});
