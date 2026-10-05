// The service worker (/sw.js): phones only offer to install a site that has one, and it lets the
// installed app open without a connection, with the events from the last visit.
//   - Installing it stores the views' pages (/, /calendario/ and /guardados/) and the build's files (/_astro/: the styles and the
//     scripts that draw the events), so the app opens offline from the first visit and after each deploy. (Stored only as pages asked for
//     them, they missed the first visit, which loads before the worker controls it, and each new build's worker
//     dropped them.) Their names exist only after the build: scripts/sw-precache.mjs writes them in.
//   - Pages: network first, so the events are always the latest when online; the last copy when offline or when the
//     network takes over NAVIGATION_TIMEOUT_MS. Offline, an address never stored gets the home page, and an event's
//     page (a shared link) the app with that event open (/?evento=<id>).
//   - The build's own files (/_astro/, names change with their content): cache first, in a cache named by their list,
//     so a deploy that only brought new data keeps it and downloads none of them again.
//   - Flyers and thumbnails: cache first, in one image cache kept across builds, the most recent IMAGE_LIMIT. Their
//     URLs carry each file's version (`?v=`, src/images.ts), so a flyer made again under its name is a new URL: it's
//     fetched, and replaces its older copies (same path, another ?v=). Offline, an older copy is better than none.
//     (Until October 2026 the cache's name carried a hash of every flyer, so each new flyer, nearly every sweep,
//     dropped a returning visitor's whole image cache. Those "images-<hash>" caches are deleted once, like any other.)
//     The first visit's flyers load before the worker controls the page: once it does, the page sends their addresses
//     (views/installPrompt.ts) and they're stored too.
//   - Copies are stored after the response is on its way (waitUntil), never holding it back.
//   - Anything from other sites (fonts, Instagram, statistics) and everything else: straight to the network.
// Each build gets its own version: the new worker takes over at once and drops the old pages (and the old build files,
// when they changed).

import type { APIRoute } from "astro";
import { BUILD_FILE_LIST } from "../../scripts/sw-precache.mjs";

const VERSION = new Date().toISOString(); // this build
const IMAGE_LIMIT = 300;
const NAVIGATION_TIMEOUT_MS = 4000; // a page slower than this: its stored copy, if any
const SHOWN_IMAGES_LIMIT = 60; // flyers sent by the page on its first visit (the ones it loaded)

const worker = `
const VERSION = ${JSON.stringify(VERSION)};
const PAGES = "pages-" + VERSION;
const BUILD_FILE_LIST = ${BUILD_FILE_LIST};
const BUILD_FILES = "build-" + nameOf(BUILD_FILE_LIST);
const IMAGES = "images";
const IMAGE_LIMIT = ${IMAGE_LIMIT};
const NAVIGATION_TIMEOUT_MS = ${NAVIGATION_TIMEOUT_MS};
const SHOWN_IMAGES_LIMIT = ${SHOWN_IMAGES_LIMIT};

// The build files' cache is named by their list (a short hash): a deploy that only brought new data has the same
// files, so it keeps their cache and downloads none of them again.
function nameOf(list) {
  let hash = 0x811c9dc5;
  for (const char of list.join("\\n")) hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193) >>> 0;
  return hash.toString(36);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      // This build's home page, not the browser's cached copy of an older one (its files could be gone).
      // …and the calendar's and Guardados' own addresses (pages/calendario/, pages/guardados/): the same page.
      const views = ["/", "/calendario/", "/guardados/"];
      await (await caches.open(PAGES)).addAll(views.map((url) => new Request(url, { cache: "reload" })));
      // Only the build files not stored yet (all of them after a code change; none after a data-only deploy).
      const build = await caches.open(BUILD_FILES);
      const missing = [];
      for (const file of BUILD_FILE_LIST) if (!(await build.match(file, { ignoreVary: true }))) missing.push(file);
      await build.addAll(missing);
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
  // Storing a copy never holds the response back: it goes on after it (waitUntil).
  const keep = (work) => event.waitUntil(work.catch(() => {}));
  if (request.mode === "navigate") event.respondWith(networkFirst(request, keep));
  else if (url.pathname.startsWith("/_astro/")) event.respondWith(cacheFirst(request, BUILD_FILES, keep));
  else if (isImage(url)) event.respondWith(cachedImage(request, keep));
});

// The first visit's flyers load before the worker controls the page, so they never went through it: once it does,
// the page sends their addresses (views/installPrompt.ts) and they're stored like any other.
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "cache-images" || !Array.isArray(data.urls)) return;
  const keep = (work) => event.waitUntil(work.catch(() => {}));
  const urls = data.urls
    .filter((url) => typeof url === "string")
    .map((url) => new URL(url, self.location.origin))
    .filter((url) => url.origin === self.location.origin && isImage(url))
    .slice(0, SHOWN_IMAGES_LIMIT);
  keep(Promise.all(urls.map((url) => cachedImage(new Request(url.href), keep).catch(() => {}))));
});

function isImage(url) {
  return /^\\/(flyers|thumbs)\\//.test(url.pathname);
}

// Pages: the network's, stored for offline; its stored copy when the network fails or takes over
// NAVIGATION_TIMEOUT_MS (a weak signal: the last copy now, refreshed in the background).
async function networkFirst(request, keep) {
  const fresh = fetch(request);
  // Copied before the page reads the response, then stored after it.
  keep(fresh.then((response) => {
    if (!response.ok) return;
    const copy = response.clone();
    return caches.open(PAGES).then((cache) => cache.put(request, copy));
  }));
  const cache = await caches.open(PAGES);
  let timer;
  const late = new Promise((resolve) => (timer = setTimeout(resolve, NAVIGATION_TIMEOUT_MS, "late")));
  try {
    const first = await Promise.race([fresh, late]);
    if (first !== "late") return first;
    return (await cache.match(request)) || (await fresh); // no copy of it: the network after all
  } catch {
    return (await cache.match(request)) || (await offlinePage(request, cache));
  } finally {
    clearTimeout(timer);
  }
}

// Offline, an address never stored: the home page. An event's page (/evento/<id>/, a shared link never opened here)
// goes to the app with that event open (/?evento=<id>, as the page itself forwards), so the event isn't lost.
async function offlinePage(request, cache) {
  const home = await cache.match("/");
  if (!home) return Response.error();
  const url = new URL(request.url);
  const event = url.pathname.match(/^\\/evento\\/([^/]+)\\/?$/);
  if (!event || url.searchParams.has("pagina")) return home;
  const params = new URLSearchParams(url.search);
  params.set("evento", decodeURIComponent(event[1]));
  return Response.redirect(new URL("/?" + params, url.origin).href, 302);
}

async function cacheFirst(request, name, keep) {
  const cache = await caches.open(name);
  // Files named by their content: any copy will do, whatever headers it was stored with (the build's files are stored
  // at install, without the Origin a page's module script sends).
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) keep(cache.put(request, response.clone()));
  return response;
}

// A flyer or a thumbnail, by its URL with its version (?v=): a new version replaces the file's older copies, and the
// cache keeps the most recent IMAGE_LIMIT. Offline, an older copy of the file is better than none.
async function cachedImage(request, keep) {
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
  if (response.ok) keep(storeImage(cache, request, response.clone()));
  return response;
}

async function storeImage(cache, request, response) {
  await cache.delete(request, { ignoreSearch: true });
  await cache.put(request, response);
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(keys.length - IMAGE_LIMIT, 0))) await cache.delete(key);
}
`;

export const GET: APIRoute = () =>
  new Response(worker, { headers: { "Content-Type": "text/javascript; charset=utf-8" } });
