// Small 3:4 thumbnail of each flyer (/thumbs/<flyer name>.webp), for the grid of an event's posts. A
// thumbnail shows at about 80 px wide, so the full flyer (1080 px, 100–200 KB) would start a dozen large
// downloads on a phone; these are a few KB each. 3:4 like Instagram's grid since January 2025: a 4:5 flyer
// (most of them) keeps all but its sides' edges, where a square cut a fifth of its height (the date line,
// often), and a story or a video's cover a quarter instead of nearly half. Made at build time, so nothing
// extra is stored in the repository.

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { APIRoute, GetStaticPaths } from "astro";
import sharp from "sharp";
import { DATA_DIR, events } from "../../data";
import { flyerPaths } from "../../images";
import { THUMB_HEIGHT, THUMB_QUALITY, THUMB_WIDTH, thumbName } from "../../scripts/lib/links";

export const getStaticPaths: GetStaticPaths = () =>
  flyerPaths(events).map((flyer) => ({ params: { name: thumbName(flyer) }, props: { flyer } }));

export const GET: APIRoute = async ({ props }) => {
  const source = await readFile(path.join(DATA_DIR, props.flyer as string));
  // Cropped to the thumbnail's own 3:4, from the middle, as Instagram's grid does.
  const thumb = await sharp(source)
    .resize(THUMB_WIDTH, THUMB_HEIGHT, { fit: "cover" })
    .webp({ quality: THUMB_QUALITY })
    .toBuffer();
  return new Response(new Uint8Array(thumb), { headers: { "Content-Type": "image/webp" } });
};
