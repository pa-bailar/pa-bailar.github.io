// The flyers and their thumbnails, as the service worker caches them (pages/sw.js.ts). Build time only (Node).
//
// A flyer keeps its name when the backend makes it again (a better crop, a fixed post), and a thumbnail keeps its
// name when its size or quality changes, so the worker's cache can't tell a new image from an old one by its name.
// Its name carries this version instead: a hash of every flyer's bytes and of how thumbnails are made. When any of
// them changes, a returning visitor's worker starts a new image cache and drops the old one; otherwise the cache
// (and the visitor's data plan) survives the deploys twice a day.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { DATA_DIR, events } from "./data";

/** Thumbnails (pages/thumbs/[name].webp.ts): square, sharp on 2× and 3× screens at the ~60 px they're shown. */
export const THUMB_SIZE = 160;
export const THUMB_QUALITY = 70;

/** The flyers' paths (under the data folder), each once, sorted. */
export function flyerPaths(): string[] {
  return [...new Set(events.flatMap((event) => event.media.flatMap((media) => (media.flyer ? [media.flyer] : []))))].sort();
}

/** A short hash of `flyers` (path → bytes, null when unreadable) and of the thumbnails' settings. */
export function imagesVersion(flyers: [string, Uint8Array | null][]): string {
  const hash = createHash("sha256").update(`thumbs ${THUMB_SIZE} ${THUMB_QUALITY}\n`);
  for (const [name, bytes] of flyers) hash.update(`${name}\n`).update(bytes ?? "missing");
  return hash.digest("hex").slice(0, 12);
}

const read = (flyer: string): Uint8Array | null => {
  try {
    return readFileSync(path.join(DATA_DIR, flyer));
  } catch {
    return null; // check-data.mjs fails a missing flyer before the build
  }
};

/** This build's images version (see the top). */
export const IMAGES_VERSION = imagesVersion(flyerPaths().map((flyer) => [flyer, read(flyer)]));
