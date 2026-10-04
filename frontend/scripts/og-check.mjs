// After the build: every event's page has a link preview that apps will show (docs/ARCHITECTURE.md, 3.4).
//   - its og:image points to a file the build made (/og/<id>.jpg?v=…), a 1200×630 JPEG as its tags say;
//   - the file is under MAX_BYTES (WhatsApp skips preview images over about 300 KB);
//   - the page has og:image:width, og:image:height, og:image:type and og:image:alt, which let an app show the
//     image on the very first share.
// Any problem fails the build, so a preview never breaks unnoticed on the live site.

import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

/** The same limit as PREVIEW_MAX_BYTES (src/scripts/lib/linkPreview.ts). */
export const MAX_BYTES = 280 * 1024;

/** The page's <meta property="og:…"> values: {"og:image": "https://…", …}. */
export function ogTags(html) {
  const tags = {};
  for (const [, property, content] of html.matchAll(/<meta property="(og:[^"]+)" content="([^"]*)"/g)) {
    tags[property] = content.replaceAll("&amp;", "&");
  }
  return tags;
}

/** What's wrong with an event page's preview image (empty if nothing); `root` is dist/. */
async function checkEventPage(root, id, logger) {
  const file = path.join(root, "evento", id, "index.html");
  let html;
  try {
    html = await readFile(file, "utf8");
  } catch {
    return [`evento/${id}/: no page`];
  }
  const tags = ogTags(html);
  const problems = [];
  for (const tag of ["og:image", "og:image:width", "og:image:height", "og:image:type", "og:image:alt", "og:title", "og:description"]) {
    if (!tags[tag]) problems.push(`no ${tag}`);
  }
  if (!tags["og:image"]) return problems.map((problem) => `evento/${id}/: ${problem}`);

  const url = new URL(tags["og:image"]);
  if (!url.searchParams.get("v")) problems.push("og:image has no ?v= version");
  const image = path.join(root, decodeURIComponent(url.pathname));
  try {
    const { size } = await stat(image);
    if (size > MAX_BYTES) problems.push(`${url.pathname} weighs ${Math.round(size / 1024)} KB (max ${MAX_BYTES / 1024} KB)`);
    const { width, height, format } = await sharp(image).metadata();
    if (String(width) !== tags["og:image:width"] || String(height) !== tags["og:image:height"]) {
      problems.push(`${url.pathname} is ${width}×${height}, its tags say ${tags["og:image:width"]}×${tags["og:image:height"]}`);
    }
    if (`image/${format}` !== tags["og:image:type"]) problems.push(`${url.pathname} is ${format}, its tag says ${tags["og:image:type"]}`);
    logger?.debug(`${url.pathname}: ${Math.round(size / 1024)} KB`);
    return problems.map((problem) => `evento/${id}/: ${problem}`);
  } catch {
    return [...problems, `${url.pathname} wasn't made`].map((problem) => `evento/${id}/: ${problem}`);
  }
}

/** Astro integration: checks every event's preview after the build; any problem fails it. */
export default function ogCheck({ eventsFile }) {
  return {
    name: "og-check",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const events = JSON.parse(await readFile(eventsFile, "utf8"));
        const problems = (await Promise.all(events.map((event) => checkEventPage(root, event.id, logger)))).flat();
        if (problems.length) throw new Error(`Link previews:\n${problems.join("\n")}`);
        logger.info(`link previews checked for ${events.length} events (1200×630 JPEG, under ${MAX_BYTES / 1024} KB)`);
      },
    },
  };
}
