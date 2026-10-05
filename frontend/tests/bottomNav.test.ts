// The bar at the bottom (phones): its items' states and names, the search field's history entry, how far it rises
// above the keyboard, and a guard on the page itself (five items, the floating button gone, Info in the header).
import { existsSync, readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { filterModel } from "../src/scripts/lib/filterModel";
import { todayIso } from "../src/scripts/lib/dates";
import { createInitialState } from "../src/scripts/state";
import { event } from "./factories";
import { installFakeHistory, settle, type FakeHistory } from "./fakeHistory";

type BottomNav = typeof import("../src/scripts/views/bottomNav");

const source = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

describe("the items' states", async () => {
  const { filtersLabel, navItems, searchLabel } = await import("../src/scripts/views/bottomNav");
  const base = { view: "upcoming" as const, savedOnly: false, query: "", active: 0 };

  it("Filtros: the badge is the filters in use, \"Sin bares\" included, and its name says it", () => {
    const today = todayIso();
    const state = { ...createInitialState(), view: "upcoming" as const, styles: ["salsa"], hideBars: true };
    const events = [event({ id: "uno", date: today, styles: ["salsa"] }), event({ id: "bar", date: today, bar: true })];
    const { active } = filterModel(events, state, today);
    expect(active).toBe(2);
    expect(navItems({ ...base, active })).toMatchObject({ badge: "2", filtersLabel: "Filtros, 2 activos" });
    expect(filtersLabel(1)).toBe("Filtros, 1 activo");
    expect(navItems(base)).toMatchObject({ badge: "", filtersLabel: "Filtros" });
  });

  it("the view on screen is the current one; Guardados and a kept search are on", () => {
    expect(navItems(base)).toMatchObject({ current: "upcoming", saved: false, searching: false });
    expect(navItems({ ...base, view: "calendar", savedOnly: true })).toMatchObject({ current: "calendar", saved: true });
    expect(navItems({ ...base, query: "  salsa " })).toMatchObject({ searching: true, searchLabel: "Buscar: «salsa»" });
    expect(navItems({ ...base, query: "   " }).searching).toBe(false);
    expect(searchLabel("")).toBe("Buscar");
  });
});

describe("the keyboard leaving while the field keeps the focus (Android's back)", async () => {
  const { keyboardJustHid } = await import("../src/scripts/views/bottomNav");

  it("is a tall keyboard going away, not toolbars or a keyboard rising", () => {
    expect(keyboardJustHid(300, 0)).toBe(true);
    expect(keyboardJustHid(300, 10)).toBe(true);
    expect(keyboardJustHid(0, 300)).toBe(false); // rising
    expect(keyboardJustHid(60, 0)).toBe(false); // toolbars collapsing
    expect(keyboardJustHid(300, 280)).toBe(false); // a keyboard changing height (suggestions bar)
  });
});

describe("rising above the keyboard (keyboardInset)", async () => {
  const { keyboardInset } = await import("../src/scripts/views/bottomNav");

  it("no keyboard: 0", () => {
    expect(keyboardInset(812, { height: 812, offsetTop: 0 })).toBe(0);
  });

  it("iOS: the layout viewport stays under the keyboard; the visual one shrinks and pans", () => {
    expect(keyboardInset(812, { height: 476, offsetTop: 0 })).toBe(336);
    expect(keyboardInset(812, { height: 476, offsetTop: 120 })).toBe(216); // the page panned up by 120
  });

  it("never below 0: toolbars collapsed (a taller visual viewport), or iOS's stale offsetTop once the keyboard is gone", () => {
    expect(keyboardInset(740, { height: 812, offsetTop: 0 })).toBe(0);
    expect(keyboardInset(812, { height: 812, offsetTop: 300 })).toBe(0);
  });

  it("rounds, and without visualViewport does nothing", () => {
    expect(keyboardInset(812, { height: 475.6, offsetTop: 0 })).toBe(336);
    expect(keyboardInset(812, null)).toBe(0);
    expect(keyboardInset(812, undefined)).toBe(0);
  });
});

describe("the search field's history entry", () => {
  let fake: FakeHistory;
  let nav: BottomNav;
  let open = false;
  let backs = 0;

  beforeEach(async () => {
    fake = installFakeHistory();
    vi.resetModules();
    nav = await import("../src/scripts/views/bottomNav");
    open = false;
    backs = 0;
  });

  afterEach(() => vi.unstubAllGlobals());

  const setUp = () =>
    nav.searchHistory({
      isOpen: () => open,
      onBack: () => {
        open = false;
        backs++;
      },
    });

  it("opening pushes an overlay entry over the screen's, same address", () => {
    const entry = setUp();
    open = true;
    entry.open();
    expect(fake.entries).toHaveLength(2);
    expect(fake.state).toMatchObject({ search: true, overlay: true });
    expect(fake.path).toBe("/");
  });

  it("back closes it (onBack: the search ends)", async () => {
    const entry = setUp();
    open = true;
    entry.open();
    history.back();
    await settle();
    expect(backs).toBe(1);
    expect(open).toBe(false);
    expect(fake.index).toBe(0);
  });

  it("× (or the keyboard's Buscar) leaves the entry as back would, without calling onBack again", async () => {
    const entry = setUp();
    open = true;
    entry.open();
    open = false; // the field closed first
    entry.close();
    await settle();
    expect(fake.index).toBe(0);
    expect(backs).toBe(0);
  });

  it("forward onto its entry once closed goes back over it", async () => {
    const entry = setUp();
    open = true;
    entry.open();
    history.back();
    await settle();
    history.forward();
    await settle();
    expect(fake.index).toBe(0);
  });

  it("an entry over it (the details) leaves it open when it closes", async () => {
    const entry = setUp();
    open = true;
    entry.open();
    history.pushState({ eventId: "uno", overlay: true }, "", "/evento/uno/");
    history.back();
    await settle();
    expect(open).toBe(true);
    expect(fake.index).toBe(1);
  });
});

describe("the page: the bar replaced the floating button", () => {
  const home = source("components/HomePage.astro");
  const bar = source("components/BottomNav.astro");

  it("no floating calendar button anywhere", () => {
    expect(existsSync(new URL("../src/components/ViewSwitch.astro", import.meta.url))).toBe(false);
    expect(existsSync(new URL("../src/scripts/views/viewSwitch.ts", import.meta.url))).toBe(false);
    expect(home).not.toMatch(/ViewSwitch|view-switch/);
    expect(source("layouts/BaseLayout.astro")).not.toContain("view-switch.css");
  });

  it("the page has the bar, a named <nav> with five items in order", () => {
    expect(home).toContain("<BottomNav />");
    expect(bar).toMatch(/<nav class="bottom-nav"[^>]*aria-label="[^"]+"/);
    const labels = [...bar.matchAll(/<span class="bottom-nav__label">([^<]+)<\/span>/g)].map((match) => match[1]);
    expect(labels).toEqual(["Eventos", "Calendario", "Buscar", "Guardados", "Filtros"]);
  });

  it("the views are links to their addresses; Guardados and Filtros the same controls as before", () => {
    expect(bar).toMatch(/<a class="bottom-nav__item" href=\{viewPath\("upcoming"\)\} data-view="upcoming"/);
    expect(bar).toMatch(/<a class="bottom-nav__item" href=\{viewPath\("calendar"\)\} data-view="calendar"/);
    expect(bar).toMatch(/<button[^>]*data-saved-only aria-pressed="false"/);
    expect(bar).toMatch(/<button[^>]*data-open-filters aria-haspopup="dialog"/);
    expect(bar).toMatch(/<button[^>]*aria-expanded="false" aria-controls="bottom-search"/);
  });

  it("shown on phones only (the same media query as the pinned bar), hidden on wide screens", () => {
    const css = readFileSync(new URL("../src/styles/components/bottom-nav.css", import.meta.url), "utf8");
    const phones = "@media not ((min-width: 720px) and (min-height: 600px))";
    expect(css).toContain(phones);
    expect(source("styles/components/jump-bar.css")).toContain(phones);
    expect(css).toMatch(/@media \(min-width: 720px\) and \(min-height: 600px\) \{\s*\.bottom-nav \{\s*display: none;/);
  });

  it("Info left the tabs for an (i) in the header, still a link to the footer", () => {
    expect(source("components/ViewToolbar.astro")).not.toContain('href="#info"');
    expect(source("components/SiteHeader.astro")).toMatch(/<a class="icon-btn site-header__info" href="#info" aria-label="Info[^"]*"/);
    expect(source("components/SiteFooter.astro")).toContain('id="info"');
  });
});
