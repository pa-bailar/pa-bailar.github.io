import sitemap from "@astrojs/sitemap";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import cspMeta from "./scripts/csp-meta.mjs";

// The data folder, wherever the build or dev server is started from: pages read flyers from it at build time.
const dataDir = fileURLToPath(new URL("../data/", import.meta.url));
// Files the build reads that aren't data (the home page's link preview).
const assetsDir = fileURLToPath(new URL("./src/assets/", import.meta.url));

// Published on GitHub Pages at https://pa-bailar.github.io (repo pa-bailar/pa-bailar.github.io, served at the root).
// The backend writes events.json, meta.json and flyers/ into ../data, served as the site's public folder.
export default defineConfig({
  site: "https://pa-bailar.github.io",
  publicDir: "../data",
  vite: {
    define: {
      "import.meta.env.DATA_DIR": JSON.stringify(dataDir),
      "import.meta.env.ASSETS_DIR": JSON.stringify(assetsDir),
    },
  },
  // sitemap-index.xml: the home page and every event page, so search engines find the events.
  // cspMeta: the policy below, moved to the top of each page and checked (scripts/csp-meta.mjs).
  integrations: [sitemap({ filter: (page) => !page.includes("/404") }), cspMeta()],
  // No Markdown here; Shiki's highlighting needs style attributes, which the policy blocks.
  markdown: { syntaxHighlight: false },
  // Content Security Policy (docs/ARCHITECTURE.md): GitHub Pages can't send headers, so Astro writes it as a
  // <meta> in every page, with the hashes of the scripts and styles it inlines (and ours: src/csp.ts). Only what
  // the site uses is allowed; anything else (an injected script, a style attribute) is blocked.
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "base-uri 'none'",
        "object-src 'none'",
        "form-action 'none'", // the site has no forms
        // Flyers, thumbnails and icons; the favicon is a data: URI; GoatCounter's fallback is an image.
        "img-src 'self' data: https://jzamora9.goatcounter.com",
        "media-src 'self'", // the videos' short clips (previews/)
        "font-src https://fonts.gstatic.com",
        // events.json and the like; GoatCounter's counts (sendBeacon).
        "connect-src 'self' https://jzamora9.goatcounter.com",
        "frame-src https://www.instagram.com", // Instagram's player (lib/instagramEmbed.ts)
        "worker-src 'self'", // sw.js
        "manifest-src 'self'",
      ],
      // Our bundles and the copy of GoatCounter's count.js (vendor/), plus Instagram's embed.js.
      scriptDirective: { resources: ["'self'", "https://www.instagram.com"] },
      // No style attributes but one: the style embed.js gives Instagram's player when it creates it (a fixed
      // string in their script, allowed by its hash). If Instagram changes it, the player still works (it's
      // restyled from the player and event-dialog.css) and the console shows the blocked attribute.
      styleDirective: {
        resources: ["'self'", "https://fonts.googleapis.com", { resource: "'unsafe-hashes'", kind: "attribute" }],
        hashes: [{ hash: "sha256-l6khRnjaVBZm7Z9S5+A/4ZrRnU7hBbTAGeVNTXpAbwU=", kind: "attribute" }],
      },
    },
  },
});
