// Web app manifest (/manifest.webmanifest): what lets a phone install the site like an app, with its name,
// icon (pages/icons/[name].png.ts) and colors, opening full screen without the browser's bar.

import type { APIRoute } from "astro";
import { BASE_URL } from "../scripts/lib/links";

// The manifest's own address: declaring the app as related to itself lets the site, opened in Chrome on
// Android, ask whether it's already installed (navigator.getInstalledRelatedApps, views/installPrompt.ts).
const MANIFEST_URL = new URL(`${BASE_URL}manifest.webmanifest`, import.meta.env.SITE).href;
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
      // The splash screen while it opens and the bar's color: the light theme's paper, the theme the app opens in
      // (unless the visitor chose Oscuro; the page's theme-color meta then takes over once it loads).
      background_color: THEME_COLORS.light,
      theme_color: THEME_COLORS.light,
      related_applications: [{ platform: "webapp", url: MANIFEST_URL }],
      prefer_related_applications: false,
      icons: [
        { src: `${BASE_URL}icons/192.png`, sizes: "192x192", type: "image/png" },
        { src: `${BASE_URL}icons/512.png`, sizes: "512x512", type: "image/png" },
        { src: `${BASE_URL}icons/maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    }),
    { headers: { "Content-Type": "application/manifest+json" } },
  );
