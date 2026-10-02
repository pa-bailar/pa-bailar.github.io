// /finde.jpg: "Este finde en Bogotá", the image the site shares on WhatsApp (src/weekendImage.ts). Rebuilt
// with every deploy, so it follows the data and the day.

import type { APIRoute } from "astro";
import { events } from "../data";
import { todayIso } from "../scripts/lib/dates";
import { weekendImage } from "../weekendImage";

export const GET: APIRoute = async () => {
  const jpeg = await weekendImage(events, todayIso());
  return new Response(new Uint8Array(jpeg), { headers: { "Content-Type": "image/jpeg" } });
};
