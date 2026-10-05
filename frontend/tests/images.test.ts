import { afterEach, describe, expect, it, vi } from "vitest";
import { events } from "../src/data";
import { fileVersion } from "../src/images";
import { flyerUrl, thumbUrl } from "../src/scripts/lib/links";
import { GET } from "../src/pages/sw.js";
import { withBuildFiles } from "../scripts/sw-precache.mjs";
import { shownImageUrls } from "../src/scripts/views/installPrompt";
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

/** Cache Storage as the worker uses it: entries by URL, in the order they were stored. `added`: what addAll fetched. */
function fakeCaches(names: string[] = [], { hangingPuts = false } = {}) {
  const stores = new Map<string, Map<string, Response>>(names.map((name) => [name, new Map()]));
  const added: string[] = [];
  const pathOf = (url: string) => url.replace(/\?.*$/, "");
  const urlOf = (request: Request | string) => (typeof request === "string" ? new URL(request, ORIGIN).href : request.url);
  const cache = (store: Map<string, Response>) => ({
    match: async (request: Request | string, options: { ignoreSearch?: boolean } = {}) => {
      const url = urlOf(request);
      if (!options.ignoreSearch) return store.get(url)?.clone();
      const found = [...store.keys()].find((key) => pathOf(key) === pathOf(url));
      return found ? store.get(found)?.clone() : undefined;
    },
    put: (request: Request, response: Response) =>
      hangingPuts ? new Promise<void>(() => {}) : Promise.resolve(void store.set(request.url, response)),
    delete: async (request: Request | string, options: { ignoreSearch?: boolean } = {}) => {
      const url = urlOf(request);
      const keys = [...store.keys()].filter((key) => (options.ignoreSearch ? pathOf(key) === pathOf(url) : key === url));
      keys.forEach((key) => store.delete(key));
      return keys.length > 0;
    },
    keys: async () => [...store.keys()].map((url) => new Request(url)),
    addAll: async (requests: (Request | string)[]) => {
      for (const request of requests) {
        const url = urlOf(request);
        added.push(url.replace(ORIGIN, ""));
        store.set(url, new Response(url));
      }
    },
  });
  return {
    stores,
    added,
    open: async (name: string) => {
      if (!stores.has(name)) stores.set(name, new Map());
      return cache(stores.get(name)!);
    },
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
  };
}

type Network = { online: boolean; hang?: boolean };

/**
 * This build's worker (with `files` as its build's files), run with `caches` and a network that answers each URL with
 * its own text, fails offline, or never answers (`hang`). What it stores after answering (waitUntil) is awaited apart.
 */
async function runWorker(caches: ReturnType<typeof fakeCaches>, network: Network, files: string[] = []) {
  const code = withBuildFiles(await (await GET({} as never)).text(), files);
  const listeners: Record<string, (event: never) => void> = {};
  const self = {
    addEventListener: (type: string, listener: (event: never) => void) => (listeners[type] = listener),
    location: { origin: ORIGIN },
    skipWaiting() {},
    clients: { claim: async () => {} },
  };
  const fetch = async (request: Request) => {
    if (network.hang) return new Promise<Response>(() => {});
    if (!network.online) throw new TypeError("offline");
    return new Response(request.url);
  };
  // A worker's relative URLs are its origin's.
  const WorkerRequest = class extends Request {
    constructor(input: string | Request, init?: RequestInit) {
      super(typeof input === "string" ? new URL(input, ORIGIN) : input, init);
    }
  };
  new Function("self", "caches", "fetch", "Request", code)(self, caches, fetch, WorkerRequest);
  const pending: Promise<unknown>[] = [];
  const run = (type: string, extra: object = {}) => {
    let response: Promise<unknown> = Promise.resolve();
    const event = {
      waitUntil: (work: Promise<unknown>) => pending.push(work),
      respondWith: (work: Promise<unknown>) => (response = work),
      ...extra,
    };
    listeners[type]!(event as never);
    return response;
  };
  const settle = async () => {
    while (pending.length) await Promise.all(pending.splice(0));
  };
  /** A request as the browser sends it (a navigation can't be built with `new Request`). */
  const request = (path: string, navigate: boolean) =>
    navigate ? { method: "GET", mode: "navigate", url: new URL(path, ORIGIN).href } : new Request(new URL(path, ORIGIN));
  return {
    install: async () => {
      await run("install");
      await settle();
    },
    activate: async () => {
      await run("activate");
      await settle();
    },
    /** Its answer, without waiting for what it stores after. */
    answer: (path: string, { navigate = false } = {}) => run("fetch", { request: request(path, navigate) }) as Promise<Response>,
    get: async (path: string, { navigate = false } = {}) => {
      const response = (await run("fetch", { request: request(path, navigate) })) as Response;
      await settle();
      return response;
    },
    message: async (data: unknown) => {
      await run("message", { data });
      await settle();
    },
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

describe("the service worker's pages", () => {
  afterEach(() => vi.useRealTimers());

  it("offline, a shared event's page never opened here opens the app with that event (/?evento=<id>)", async () => {
    const caches = fakeCaches();
    const network = { online: true };
    const worker = await runWorker(caches, network);
    await worker.get("/", { navigate: true });
    network.online = false;
    const response = await worker.get("/evento/fiesta-5-oct/?utm_source=compartido", { navigate: true });
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(`${ORIGIN}/?utm_source=compartido&evento=fiesta-5-oct`);
    // Its own page asked for (?pagina: a past event): the home page, which can't show it.
    expect(await (await worker.get("/evento/fiesta-5-oct/?pagina=1", { navigate: true })).text()).toBe(`${ORIGIN}/`);
  });

  it("offline, a page stored before is that copy; another address the home page", async () => {
    const caches = fakeCaches();
    const network = { online: true };
    const worker = await runWorker(caches, network);
    await worker.get("/", { navigate: true });
    await worker.get("/evento/taller-7-oct/", { navigate: true });
    network.online = false;
    expect(await (await worker.get("/evento/taller-7-oct/", { navigate: true })).text()).toBe(`${ORIGIN}/evento/taller-7-oct/`);
    expect(await (await worker.get("/calendario.ics", { navigate: true })).text()).toBe(`${ORIGIN}/`);
  });

  it("a network that takes over 4 seconds: the stored copy", async () => {
    vi.useFakeTimers();
    const caches = fakeCaches();
    const network: Network = { online: true };
    const worker = await runWorker(caches, network);
    await worker.get("/", { navigate: true });
    network.hang = true;
    const answer = worker.answer("/", { navigate: true });
    await vi.advanceTimersByTimeAsync(4000);
    expect(await (await answer).text()).toBe(`${ORIGIN}/`);
  });

  it("storing a copy never holds the answer back", async () => {
    const caches = fakeCaches([], { hangingPuts: true }); // a write that never ends
    const worker = await runWorker(caches, { online: true });
    expect(await (await worker.answer("/", { navigate: true })).text()).toBe(`${ORIGIN}/`);
    expect(await (await worker.answer("/flyers/1-0.webp?v=aaaaaaaaaa")).text()).toBe(`${ORIGIN}/flyers/1-0.webp?v=aaaaaaaaaa`);
  });
});

describe("the service worker's build files", () => {
  const files = ["/_astro/HomePage.abc.js", "/_astro/sharing.def.js"];
  const buildCaches = (caches: ReturnType<typeof fakeCaches>) => [...caches.stores.keys()].filter((name) => name.startsWith("build-"));
  const fetchedFiles = (caches: ReturnType<typeof fakeCaches>) => caches.added.filter((url) => url.startsWith("/_astro/"));

  it("are in a cache named by their list: a data-only deploy keeps it and downloads none again", async () => {
    const caches = fakeCaches();
    const first = await runWorker(caches, { online: true }, files);
    await first.install();
    await first.activate();
    expect(fetchedFiles(caches)).toEqual(files);
    const again = await runWorker(caches, { online: true }, files); // the next build, the same files
    await again.install();
    await again.activate();
    expect(fetchedFiles(caches)).toEqual(files); // nothing fetched again
    expect(buildCaches(caches)).toHaveLength(1);
  });

  it("new files (a code change): a new cache, and the old one goes", async () => {
    const caches = fakeCaches();
    const first = await runWorker(caches, { online: true }, files);
    await first.install();
    await first.activate();
    const [old] = buildCaches(caches);
    const next = await runWorker(caches, { online: true }, ["/_astro/HomePage.xyz.js", "/_astro/sharing.def.js"]);
    await next.install();
    await next.activate();
    expect(buildCaches(caches)).toHaveLength(1);
    expect(buildCaches(caches)[0]).not.toBe(old);
  });
});

describe("a first visit's flyers", () => {
  const image = (src: string, loaded = true) => ({ src, currentSrc: src, complete: true, naturalWidth: loaded ? 160 : 0 });

  it("the page sends the flyers and thumbnails it loaded (this site's, once each)", () => {
    const urls = shownImageUrls(
      [
        image(`${ORIGIN}/flyers/1-0.webp?v=a`),
        image(`${ORIGIN}/flyers/1-0.webp?v=a`),
        image(`${ORIGIN}/thumbs/2-0.webp?v=b.160.70`),
        image(`${ORIGIN}/flyers/3-0.webp?v=c`, false), // not loaded yet: it'll go through the worker
        image(`${ORIGIN}/icons/icon-192.png`),
        image("https://scontent.cdninstagram.com/x.jpg"),
      ],
      ORIGIN,
    );
    expect(urls).toEqual([`${ORIGIN}/flyers/1-0.webp?v=a`, `${ORIGIN}/thumbs/2-0.webp?v=b.160.70`]);
  });

  it("the worker stores them, and nothing else", async () => {
    const caches = fakeCaches(["images"]);
    const worker = await runWorker(caches, { online: true });
    await worker.message({ type: "cache-images", urls: [`${ORIGIN}/flyers/1-0.webp?v=a`, "https://evil.example/flyers/x.webp", "/sw.js"] });
    expect(imageCache(caches)).toEqual(["/flyers/1-0.webp?v=a"]);
  });
});
