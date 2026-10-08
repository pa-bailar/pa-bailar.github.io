// The install sheet's clips (/install/<name>.mp4 and their posters, .jpg): adding the site to the home screen from
// Safari on iPhone, recorded in Xcode's iOS Simulator (8 Oct 2026), one per Safari version whose steps differ
// (lib/installPlace.ts, InstallGuide.clip). Stored in src/assets/install. Outside /_astro/, so the service worker
// doesn't store them (pages/sw.js.ts): they load only when the sheet opens (views/installPrompt.ts).

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { APIRoute, GetStaticPaths } from "astro";
import { INSTALL_CLIPS } from "../../scripts/lib/installPlace";

const TYPES = { mp4: "video/mp4", jpg: "image/jpeg" } as const;

export const getStaticPaths: GetStaticPaths = () =>
  INSTALL_CLIPS.flatMap((clip) => Object.keys(TYPES).map((extension) => ({ params: { name: `${clip}.${extension}` } })));

export const GET: APIRoute = async ({ params }) => {
  const name = params.name as string;
  const file = await readFile(path.join(import.meta.env.ASSETS_DIR, "install", name));
  const type = TYPES[path.extname(name).slice(1) as keyof typeof TYPES];
  return new Response(new Uint8Array(file), { headers: { "Content-Type": type } });
};
