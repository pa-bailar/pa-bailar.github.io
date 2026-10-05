// The flyers' versions and list, for their URLs and the thumbnails. Build time only (Node).
//
// A flyer keeps its name when the backend makes it again (a better crop, a fixed post: files are named by post and
// slide), so neither a browser nor the service worker's cache (pages/sw.js.ts) can tell a new image from an old one by
// its name. Each flyer's URL carries a short hash of its bytes instead (`?v=`, `media.version`, added by src/data.ts and
// written by lib/links.ts), and its thumbnail's the same plus the thumbnails' settings. A flyer made again gets a new
// URL; every other image keeps its own, so the worker's one image cache survives deploys and new flyers.

import { createHash } from "node:crypto";
import type { DanceEvent } from "./scripts/types";

/** A short hash of a file's bytes: its version in its URL. */
export function fileVersion(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex").slice(0, 10);
}

/** The flyers' paths (under the data folder), each once, sorted. */
export function flyerPaths(events: DanceEvent[]): string[] {
  return [...new Set(events.flatMap((event) => event.media.flatMap((media) => (media.flyer ? [media.flyer] : []))))].sort();
}
