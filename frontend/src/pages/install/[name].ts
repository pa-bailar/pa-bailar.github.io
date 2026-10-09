// The install sheet's clips (/install/<name>.mp4 and their posters, .jpg): adding the site to the home screen from
// Safari on iPhone, recorded in Xcode's iOS Simulator (8 Oct 2026), one per Safari version whose steps differ
// (lib/installPlace.ts, InstallGuide.clip). Stored in src/assets/install. Outside /_astro/, so the service worker
// doesn't store them (pages/sw.js.ts): they load only when the sheet opens (views/installPrompt.ts).

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { APIRoute, GetStaticPaths } from "astro";
import { INSTALL_CLIPS } from "../../scripts/lib/installPlace";

const TYPES = { mp4: "video/mp4", jpg: "image/jpeg" } as const;

/** Each file's name and type, given by getStaticPaths (no parsing the name back). */
interface Props {
  file: string;
  type: (typeof TYPES)[keyof typeof TYPES];
}

export const getStaticPaths: GetStaticPaths = () =>
  INSTALL_CLIPS.flatMap((clip) =>
    Object.entries(TYPES).map(([extension, type]) => {
      const file = `${clip}.${extension}`;
      return { params: { name: file }, props: { file, type } satisfies Props };
    }),
  );

export const GET: APIRoute<Props> = async ({ props }) => {
  const contents = await readFile(path.join(import.meta.env.ASSETS_DIR, "install", props.file));
  return new Response(new Uint8Array(contents), { headers: { "Content-Type": props.type } });
};
