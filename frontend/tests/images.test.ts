import { describe, expect, it } from "vitest";
import { events } from "../src/data";
import { fileVersion } from "../src/images";
import { flyerUrl, thumbUrl } from "../src/scripts/lib/links";
import { GET } from "../src/pages/sw.js";
import type { EventMedia } from "../src/scripts/types";

const bytes = (text: string) => new TextEncoder().encode(text);

describe("each flyer's version (its URL's ?v=)", () => {
  it("is a short hash of its file: the same bytes, the same version", () => {
    expect(fileVersion(bytes("one"))).toBe(fileVersion(bytes("one")));
    expect(fileVersion(bytes("one"))).toMatch(/^[0-9a-f]{10}$/);
  });

  it("changes when the flyer is made again under the same name", () => {
    expect(fileVersion(bytes("two, cropped"))).not.toBe(fileVersion(bytes("two")));
  });

  it("is in the flyer's and its thumbnail's URL; the thumbnail's also has its settings", () => {
    const media = { flyer: "flyers/123-0.webp", version: "3fa9c0e1b2" } as EventMedia;
    expect(flyerUrl(media)).toBe("/flyers/123-0.webp?v=3fa9c0e1b2");
    expect(thumbUrl(media)).toBe("/thumbs/123-0.webp?v=3fa9c0e1b2.160.70");
    expect(flyerUrl({ ...media, version: undefined })).toBe("/flyers/123-0.webp");
  });

  it("is worked out for every flyer of this build (src/data.ts)", () => {
    const flyers = events.flatMap((event) => event.media).filter((media) => media.flyer);
    expect(flyers.length).toBeGreaterThan(0);
    for (const media of flyers) expect(media.version).toMatch(/^[0-9a-f]{10}$/);
  });
});

// ---------- the service worker's image cache, run against fake caches ----------

const ORIGIN = "https://pa-bailar.github.io";

/** Cache Storage as the worker uses it: entries by URL, in the order they were stored. */
function fakeCaches(names: string[] = []) {
  const stores = new Map<string, Map<string, Response>>(names.map((name) => [name, new Map()]));
  const pathOf = (url: string) => url.replace(/\?.*$/, "");
  const cache = (store: Map<string, Response>) => ({
    match: async (request: Request | string, options: { ignoreSearch?: boolean } = {}) => {
      const url = typeof request === "string" ? new URL(request, ORIGIN).href : request.url;
      if (!options.ignoreSearch) return store.get(url)?.clone();
      const found = [...store.keys()].find((key) => pathOf(key) === pathOf(url));
      return found ? store.get(found)?.clone() : undefined;
    },
    put: async (request: Request, response: Response) => void store.set(request.url, response),
    delete: async (request: Request | string, options: { ignoreSearch?: boolean } = {}) => {
      const url = typeof request === "string" ? request : request.url;
      const keys = [...store.keys()].filter((key) => (options.ignoreSearch ? pathOf(key) === pathOf(url) : key === url));
      keys.forEach((key) => store.delete(key));
      return keys.length > 0;
    },
    keys: async () => [...store.keys()].map((url) => new Request(url)),
    add: async () => {},
    addAll: async () => {},
  });
  return {
    stores,
    open: async (name: string) => {
      if (!stores.has(name)) stores.set(name, new Map());
      return cache(stores.get(name)!);
    },
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
  };
}

/** This build's worker, run with `caches` and a network that answers each URL with its own text (or fails). */
async function runWorker(caches: ReturnType<typeof fakeCaches>, network: { online: boolean }) {
  const code = await (await GET({} as never)).text();
  const listeners: Record<string, (event: never) => void> = {};
  const self = {
    addEventListener: (type: string, listener: (event: never) => void) => (listeners[type] = listener),
    location: { origin: ORIGIN },
    skipWaiting() {},
    clients: { claim: async () => {} },
  };
  const fetch = async (request: Request) => {
    if (!network.online) throw new TypeError("offline");
    return new Response(request.url);
  };
  new Function("self", "caches", "fetch", code)(self, caches, fetch);
  const run = async (type: string, extra: object = {}) => {
    let done: Promise<unknown> = Promise.resolve();
    listeners[type]!({ waitUntil: (work: Promise<unknown>) => (done = work), respondWith: (work: Promise<unknown>) => (done = work), ...extra } as never);
    return done;
  };
  return {
    activate: () => run("activate"),
    get: async (path: string) => (await run("fetch", { request: new Request(new URL(path, ORIGIN)) })) as Response,
  };
}

const imageCache = (caches: ReturnType<typeof fakeCaches>) => [...(caches.stores.get("images")?.keys() ?? [])].map((url) => url.replace(ORIGIN, ""));

describe("the service worker's image cache", () => {
  it("survives a new build with new flyers: one cache, not one per set of flyers", async () => {
    const caches = fakeCaches(["images", "images-0123456789ab", "pages-old", "build-old"]);
    await (await runWorker(caches, { online: true })).activate();
    expect([...caches.stores.keys()]).toEqual(["images"]); // the old per-set caches go, once
  });

  it("a flyer made again (a new ?v=) replaces its old copy; the others stay", async () => {
    const caches = fakeCaches(["images"]);
    const worker = await runWorker(caches, { online: true });
    await worker.get("/flyers/1-0.webp?v=aaaaaaaaaa");
    await worker.get("/flyers/2-0.webp?v=bbbbbbbbbb");
    await worker.get("/flyers/1-0.webp?v=cccccccccc");
    expect(imageCache(caches)).toEqual(["/flyers/2-0.webp?v=bbbbbbbbbb", "/flyers/1-0.webp?v=cccccccccc"]);
    expect(await (await worker.get("/flyers/2-0.webp?v=bbbbbbbbbb")).text()).toBe(`${ORIGIN}/flyers/2-0.webp?v=bbbbbbbbbb`);
  });

  it("offline, a flyer's older copy is better than none", async () => {
    const caches = fakeCaches(["images"]);
    const network = { online: true };
    const worker = await runWorker(caches, network);
    await worker.get("/thumbs/1-0.webp?v=aaaaaaaaaa.160.70");
    network.online = false;
    const response = await worker.get("/thumbs/1-0.webp?v=cccccccccc.160.70");
    expect(await response.text()).toBe(`${ORIGIN}/thumbs/1-0.webp?v=aaaaaaaaaa.160.70`);
  });
});
