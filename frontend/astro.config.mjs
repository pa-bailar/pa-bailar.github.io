import sitemap from "@astrojs/sitemap";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";

// The data folder, wherever the build or dev server is started from: pages read flyers from it at build time.
const dataDir = fileURLToPath(new URL("../data/", import.meta.url));

// Published on GitHub Pages at https://pa-bailar.github.io (repo pa-bailar/pa-bailar.github.io, served at the root).
// The backend writes events.json, meta.json and flyers/ into ../data, served as the site's public folder.
export default defineConfig({
  site: "https://pa-bailar.github.io",
  publicDir: "../data",
  vite: { define: { "import.meta.env.DATA_DIR": JSON.stringify(dataDir) } },
  // sitemap-index.xml: the home page and every event page, so search engines find the events.
  integrations: [sitemap({ filter: (page) => !page.includes("/404") })],
});
