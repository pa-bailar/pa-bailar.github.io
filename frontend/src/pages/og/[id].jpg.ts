// Link-preview image of each event page (/og/<id>.jpg): 1200×630, the flyer with the event's date, title,
// place and price (src/linkPreviewImage.ts). Made at build time, so nothing extra is stored in the repository.
// Pages link it with ?v=<version> (scripts/lib/linkPreview.ts), which changes when the image does.

import type { APIRoute, GetStaticPaths } from "astro";
import { events } from "../../data";
import { eventPreviewImage } from "../../linkPreviewImage";
import type { DanceEvent } from "../../scripts/types";

export const getStaticPaths: GetStaticPaths = () => events.map((event) => ({ params: { id: event.id }, props: { event } }));

export const GET: APIRoute = async ({ props }) => {
  const jpeg = await eventPreviewImage(props.event as DanceEvent);
  return new Response(new Uint8Array(jpeg), { headers: { "Content-Type": "image/jpeg" } });
};
