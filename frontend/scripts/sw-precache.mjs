// After the build: the service worker (src/pages/sw.js.ts) gets the list of the build's own files (/_astro/: the
// styles and scripts, named by their content), which it stores when it installs, so the installed app opens offline
// with what draws its events. The worker is generated before those names are final, so it carries a placeholder
// (BUILD_FILE_LIST, an empty list) that this replaces; the build fails if it can't.

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** In the worker's code: an empty list until the build's files are written in. */
export const BUILD_FILE_LIST = "[/* the build's files: scripts/sw-precache.mjs */]";

/** The worker's code with `files` written in. */
export function withBuildFiles(worker, files) {
  if (!worker.includes(BUILD_FILE_LIST)) throw new Error("sw.js has no BUILD_FILE_LIST to fill in");
  return worker.replace(BUILD_FILE_LIST, JSON.stringify(files));
}

/** Astro integration: writes every file under dist/_astro/ into dist/sw.js. */
export default function swPrecache() {
  return {
    name: "sw-precache",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const files = (await readdir(path.join(root, "_astro"))).sort().map((name) => `/_astro/${name}`);
        const worker = path.join(root, "sw.js");
        await writeFile(worker, withBuildFiles(await readFile(worker, "utf8"), files));
        logger.info(`${files.length} build files stored by the service worker when it installs`);
      },
    },
  };
}
