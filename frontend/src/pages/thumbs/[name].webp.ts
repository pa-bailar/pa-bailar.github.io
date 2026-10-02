// Small square thumbnail of each flyer (/thumbs/<flyer name>.webp), for the row of an event's posts in
// its detail. A thumbnail shows at about 60 px, so the full flyer (1080 px, 100–200 KB) would make
// "+N" start a dozen large downloads on a phone; these are a few KB each. Made at build time, so
// nothing extra is stored in the repository.

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { APIRoute, GetStaticPaths } from "astro";
import sharp from "sharp";
import { DATA_DIR, events } from "../../data";
import { thumbName } from "../../scripts/lib/links";

const THUMB_SIZE = 160; // px, square: sharp on 2× and 3× screens at the ~60 px it's shown
const THUMB_QUALITY = 70;

export const getStaticPaths: GetStaticPaths = () => {
  const flyers = new Set(events.flatMap((event) => event.media.flatMap((media) => (media.flyer ? [media.flyer] : []))));
  return [...flyers].map((flyer) => ({ params: { name: thumbName(flyer) }, props: { flyer } }));
};

export const GET: APIRoute = async ({ props }) => {
  const source = await readFile(path.join(DATA_DIR, props.flyer as string));
  // Cropped to a square like the thumbnail itself (Instagram's grid crops the same way).
  const thumb = await sharp(source)
    .resize(THUMB_SIZE, THUMB_SIZE, { fit: "cover" })
    .webp({ quality: THUMB_QUALITY })
    .toBuffer();
  return new Response(new Uint8Array(thumb), { headers: { "Content-Type": "image/webp" } });
};
