// The service worker (/sw.js): phones only offer to install a site that has one, and it lets the
// installed app open without a connection, with the events from the last visit.
//   - Installing it stores the home page and the build's files (/_astro/: the styles and the scripts that draw the
//     events), so the app opens offline from the first visit and after each deploy. (Stored only as pages asked for
//     them, they missed the first visit, which loads before the worker controls it, and each new build's worker
//     dropped them.) Their names exist only after the build: scripts/sw-precache.mjs writes them in.
//   - Pages: network first, so the events are always the latest when online; the last copy when offline.
//   - The build's own files (/_astro/, names change with their content): cache first.
//   - Flyers and thumbnails: cache first, the most recent IMAGE_LIMIT. A flyer made again keeps its name, so the
//     cache's name carries the images' version (src/images.ts: a hash of the flyers and the thumbnails' settings):
//     when any changes, the new worker starts a new image cache and drops the old one.
//   - Anything from other sites (fonts, Instagram, statistics) and everything else: straight to the network.
// Each build gets its own version: the new worker takes over at once and drops the old pages and files.

import type { APIRoute } from "astro";
import { IMAGES_VERSION } from "../images";
import { BUILD_FILE_LIST } from "../../scripts/sw-precache.mjs";

const VERSION = new Date().toISOString(); // this build
const IMAGE_LIMIT = 300;

const worker = `
const VERSION = ${JSON.stringify(VERSION)};
const PAGES = "pages-" + VERSION;
const BUILD_FILES = "build-" + VERSION;
const IMAGES = "images-" + ${JSON.stringify(IMAGES_VERSION)};
const IMAGE_LIMIT = ${IMAGE_LIMIT};
const BUILD_FILE_LIST = ${BUILD_FILE_LIST};

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      // This build's home page, not the browser's cached copy of an older one (its files could be gone).
      // …and the calendar's own address (pages/calendario/): the same page opening on the calendar.
      await (await caches.open(PAGES)).addAll(["/", "/calendario/"].map((url) => new Request(url, { cache: "reload" })));
      await (await caches.open(BUILD_FILES)).addAll(BUILD_FILE_LIST);
    })(),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name !== PAGES && name !== BUILD_FILES && name !== IMAGES) await caches.delete(name);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") event.respondWith(networkFirst(request));
  else if (url.pathname.startsWith("/_astro/")) event.respondWith(cacheFirst(request, BUILD_FILES));
  else if (/^\\/(flyers|thumbs)\\//.test(url.pathname)) event.respondWith(cacheFirst(request, IMAGES, IMAGE_LIMIT));
});

async function networkFirst(request) {
  const cache = await caches.open(PAGES);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || (await cache.match("/")) || Response.error();
  }
}

async function cacheFirst(request, name, limit) {
  const cache = await caches.open(name);
  // Files named by their content or post: any copy will do, whatever headers it was stored with (the build's files
  // are stored at install, without the Origin a page's module script sends).
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    if (limit) {
      const keys = await cache.keys();
      for (const key of keys.slice(0, Math.max(keys.length - limit, 0))) await cache.delete(key);
    }
  }
  return response;
}
`;

export const GET: APIRoute = () =>
  new Response(worker, { headers: { "Content-Type": "text/javascript; charset=utf-8" } });
