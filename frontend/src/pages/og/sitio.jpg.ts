// Link-preview image of the home page (/og/sitio.jpg): the header's look (stripes, "Pa' Bailar", the
// tagline, the record), rather than one event's flyer, which said the link was about that event.
// Drawn once with the site's fonts by scripts/og-site.html (the steps are there) and stored in src/assets.

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
  const image = await readFile(path.join(import.meta.env.ASSETS_DIR, "og-site.jpg"));
  return new Response(new Uint8Array(image), { headers: { "Content-Type": "image/jpeg" } });
};
