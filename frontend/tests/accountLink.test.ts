import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { accountLinkAttrs, accountLinkHtml } from "../src/scripts/lib/accountLink";
import { externalLinkHtml } from "../src/scripts/lib/externalLink";
import { eventCardGridHtml } from "../src/scripts/views/eventCard";
import { eventDetailHtml, eventDrawerHtml } from "../src/scripts/views/eventDetail";
import { event, storyEvent, storyMedia } from "./factories";

/** Every link to an Instagram profile (not a post) in `html`. */
const profileLinks = (html: string) =>
  [...html.matchAll(/<a\b[^>]*href="https:\/\/www\.instagram\.com\/[^"/]+\/"[^>]*>/g)].map((match) => match[0]);

describe("an account's link", () => {
  it("is its profile, opened inside the site (data-profile), named for screen readers", () => {
    const link = accountLinkHtml("la.topa_bogota", { className: "x", track: "perfil-x" });
    expect(link).toBe(
      `<a class="x" href="https://www.instagram.com/la.topa_bogota/" target="_blank" rel="noopener" data-profile="la.topa_bogota" data-track="perfil-x" aria-label="Ver el perfil de @la.topa_bogota">@la.topa_bogota</a>`,
    );
    expect(accountLinkAttrs("academia")["data-profile"]).toBe("academia");
  });

  it("is the only kind of profile link anywhere an account shows: card, head, organizer, contact, story", () => {
    const busy = event({ account: "academia", organizer: "La Academia", contact: "@otra_cuenta" });
    const pages = [
      eventCardGridHtml([busy]),
      eventDrawerHtml(busy, { titleId: "t" }),
      eventDetailHtml(busy, 0),
      eventDrawerHtml(storyEvent(), { titleId: "t" }),
      eventDrawerHtml(event({ media: [storyMedia({ permalink: "https://www.instagram.com/otra/" })] }), { titleId: "t" }),
    ];
    const links = pages.flatMap(profileLinks);
    expect(links.length).toBeGreaterThanOrEqual(8);
    for (const link of links) expect(link).toMatch(/data-profile="[^"]+"/);
    const drawer = pages[1];
    expect(drawer).toContain('data-profile="otra_cuenta"'); // the contact
    expect(drawer).toContain('data-track="perfil-organiza"'); // the organizer's @
    expect(pages[4]).toContain('data-profile="otra"'); // a story: the account it came from
  });

  it("no source file writes its own instagram.com profile link", () => {
    // Allowed: the helper that builds profile URLs, Instagram's player, the viewer's way out, and a comment.
    const allowed = new Set([
      "scripts/lib/links.ts",
      "scripts/lib/instagramEmbed.ts",
      "scripts/types.ts",
      "components/PostViewer.astro",
    ]);
    const root = path.resolve(__dirname, "../src");
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = path.join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.(ts|astro)$/.test(name)) files.push(full);
      }
    };
    walk(root);
    const offenders = files
      .map((file) => path.relative(root, file).split(path.sep).join("/"))
      .filter((file) => !allowed.has(file))
      .filter((file) => readFileSync(path.join(root, file), "utf8").includes("instagram.com/"));
    expect(offenders).toEqual([]);
  });
});

describe("a link that leaves the site", () => {
  it("opens in a new tab, its values escaped, any other attribute after", () => {
    expect(externalLinkHtml("https://maps.google.com/?q=a&b", "Cómo llegar", { className: "inline-link", track: "como-llegar" })).toBe(
      `<a class="inline-link" href="https://maps.google.com/?q=a&amp;b" target="_blank" rel="noopener" data-track="como-llegar">Cómo llegar</a>`,
    );
    expect(externalLinkHtml("https://x/", "<b>x</b>", { attributes: { "aria-label": "Ver \"x\"" } })).toBe(
      `<a href="https://x/" target="_blank" rel="noopener" aria-label="Ver &quot;x&quot;"><b>x</b></a>`,
    );
  });
});
