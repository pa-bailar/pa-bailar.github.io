// The service worker (/sw.js): phones only offer to install a site that has one, and it lets the
// installed app open without a connection, with the events from the last visit.
//   - Installing it stores the home page and the build's files (/_astro/: the styles and the scripts that draw the
//     events), so the app opens offline from the first visit and after each deploy. (Stored only as pages asked for
//     them, they missed the first visit, which loads before the worker controls it, and each new build's worker
//     dropped them.) Their names exist only after the build: scripts/sw-precache.mjs writes them in.
//   - Pages: network first, so the events are always the latest when online; the last copy when offline.
//   - The build's own files (/_astro/, names change with their content): cache first.
//   - Flyers and thumbnails: cache first, in one image cache kept across builds, the most recent IMAGE_LIMIT. Their
//     URLs carry each file's version (`?v=`, src/images.ts), so a flyer made again under its name is a new URL: it's
//     fetched, and replaces its older copies (same path, another ?v=). Offline, an older copy is better than none.
//     (Until October 2026 the cache's name carried a hash of every flyer, so each new flyer, nearly every sweep,
//     dropped a returning visitor's whole image cache. Those "images-<hash>" caches are deleted once, like any other.)
//   - Anything from other sites (fonts, Instagram, statistics) and everything else: straight to the network.
// Each build gets its own version: the new worker takes over at once and drops the old pages and files.

import type { APIRoute } from "astro";
import { BUILD_FILE_LIST } from "../../scripts/sw-precache.mjs";

const VERSION = new Date().toISOString(); // this build
const IMAGE_LIMIT = 300;

const worker = `
const VERSION = ${JSON.stringify(VERSION)};
const PAGES = "pages-" + VERSION;
const BUILD_FILES = "build-" + VERSION;
const IMAGES = "images";
const IMAGE_LIMIT = ${IMAGE_LIMIT};
const BUILD_FILE_LIST = ${BUILD_FILE_LIST};

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      // This build's home page, not the browser's cached copy of an older one (its files could be gone).
      await (await caches.open(PAGES)).add(new Request("/", { cache: "reload" }));
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
  else if (/^\\/(flyers|thumbs)\\//.test(url.pathname)) event.respondWith(cachedImage(request));
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

async function cacheFirst(request, name) {
  const cache = await caches.open(name);
  // Files named by their content: any copy will do, whatever headers it was stored with (the build's files are stored
  // at install, without the Origin a page's module script sends).
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

// A flyer or a thumbnail, by its URL with its version (?v=): a new version replaces the file's older copies, and the
// cache keeps the most recent IMAGE_LIMIT. Offline, an older copy of the file is better than none.
async function cachedImage(request) {
  const cache = await caches.open(IMAGES);
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) return cached;
  let response;
  try {
    response = await fetch(request);
  } catch (error) {
    const older = await cache.match(request, { ignoreVary: true, ignoreSearch: true });
    if (older) return older;
    throw error;
  }
  if (response.ok) {
    await cache.delete(request, { ignoreSearch: true });
    await cache.put(request, response.clone());
    const keys = await cache.keys();
    for (const key of keys.slice(0, Math.max(keys.length - IMAGE_LIMIT, 0))) await cache.delete(key);
  }
  return response;
}
`;

export const GET: APIRoute = () =>
  new Response(worker, { headers: { "Content-Type": "text/javascript; charset=utf-8" } });
