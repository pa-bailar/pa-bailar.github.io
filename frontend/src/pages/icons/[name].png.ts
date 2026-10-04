// The app's icons (/icons/<name>.png), for installing the site on a phone (manifest.webmanifest.ts) and the
// iPhone home screen. A record with a marigold label on the logo's tomato red, so it stands out among other
// apps. Made at build time from SVG, so no image is stored in the repository.

import type { APIRoute, GetStaticPaths } from "astro";
import sharp from "sharp";

const WINE = "#2A0F14"; // --wine-900
const RECORD = "#1E0A0E"; // --wine-950
const MARIGOLD = "#F2C12E"; // the app icon's marigold (tokens.css: --marigold-200 is it at 45%)
const TOMATO = "#C8321C"; // --tomato-600

/**
 * `recordShare`: the record's diameter as a share of the icon. "maskable" icons are cut to any shape by
 * the phone (circle, squircle…) and only their middle 80% is sure to show, so their record is smaller.
 */
function iconSvg(recordShare: number): string {
  const r = 256 * recordShare;
  const grooves = [0.92, 0.82, 0.72, 0.62]
    .map((k) => `<circle cx="256" cy="256" r="${r * k}" fill="none" stroke="#fff" stroke-opacity="0.07" stroke-width="4"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    <rect width="512" height="512" fill="${TOMATO}"/>
    <circle cx="256" cy="256" r="${r}" fill="${RECORD}"/>
    ${grooves}
    <circle cx="256" cy="256" r="${r * 0.42}" fill="${MARIGOLD}"/>
    <circle cx="256" cy="256" r="${r * 0.1}" fill="${WINE}"/>
  </svg>`;
}

const ICONS: Record<string, { size: number; recordShare: number }> = {
  "192": { size: 192, recordShare: 0.86 },
  "512": { size: 512, recordShare: 0.86 },
  "maskable-512": { size: 512, recordShare: 0.7 },
  "apple-touch-icon": { size: 180, recordShare: 0.8 }, // iOS rounds the corners itself
};

export const getStaticPaths: GetStaticPaths = () => Object.keys(ICONS).map((name) => ({ params: { name } }));

export const GET: APIRoute = async ({ params }) => {
  const icon = ICONS[params.name as string]!;
  const png = await sharp(Buffer.from(iconSvg(icon.recordShare)))
    .resize(icon.size, icon.size)
    .png()
    .toBuffer();
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
};
