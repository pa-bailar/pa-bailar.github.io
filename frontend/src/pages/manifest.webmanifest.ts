// Web app manifest (/manifest.webmanifest): what lets a phone install the site like an app, with its name,
// icon (pages/icons/[name].png.ts) and colors, opening full screen without the browser's bar.

import type { APIRoute } from "astro";
import { BASE_URL } from "../scripts/lib/links";
import { THEME_COLORS } from "../scripts/themeConfig";

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      name: "Pa' Bailar · Bogotá",
      short_name: "Pa' Bailar",
      description: "Sociales y talleres de baile en Bogotá.",
      lang: "es-CO",
      start_url: BASE_URL,
      scope: BASE_URL,
      display: "standalone",
      background_color: THEME_COLORS.dark, // the splash screen while it opens: wine, like the icon
      theme_color: THEME_COLORS.dark,
      icons: [
        { src: `${BASE_URL}icons/192.png`, sizes: "192x192", type: "image/png" },
        { src: `${BASE_URL}icons/512.png`, sizes: "512x512", type: "image/png" },
        { src: `${BASE_URL}icons/maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    }),
    { headers: { "Content-Type": "application/manifest+json" } },
  );
