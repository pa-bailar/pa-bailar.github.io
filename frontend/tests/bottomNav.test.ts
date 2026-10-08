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
  const base = { view: "upcoming" as const, query: "", active: 0 };

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

  it("the view on screen is the current one; a kept search is on", () => {
    expect(navItems(base)).toMatchObject({ current: "upcoming", searching: false, filtersOff: false });
    expect(navItems({ ...base, view: "calendar" })).toMatchObject({ current: "calendar", filtersOff: false });
    expect(navItems({ ...base, query: "  salsa " })).toMatchObject({ searching: true, searchLabel: "Buscar: «salsa»" });
    expect(navItems({ ...base, query: "   " }).searching).toBe(false);
    expect(searchLabel("")).toBe("Buscar");
  });

  it("Guardados is a view of its own, where Filtros is off and says why (its badge stays: the list still uses them)", () => {
    expect(navItems({ ...base, view: "saved", active: 2 })).toMatchObject({
      current: "saved",
      filtersOff: true,
      badge: "2",
      filtersLabel: "Filtros: no se usan en Guardados",
    });
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

  // The iPhone audit, 8 Oct 2026: with the keyboard up, the page scrolled (the calendar showing a search's day) and
  // iOS panned the visual viewport: the bar's lift fell to 0, read as the keyboard leaving, and the field closed.
  it("measured by the height the keyboard takes, which a pan doesn't change", async () => {
    const { keyboardHeight, keyboardInset } = await import("../src/scripts/views/bottomNav");
    const up = { height: 538, offsetTop: 0 };
    const panned = { height: 538, offsetTop: 336 }; // the same keyboard, the visual viewport panned down to it
    expect(keyboardInset(874, panned)).toBe(0); // the lift alone says "gone"
    expect(keyboardJustHid(keyboardHeight(874, up), keyboardHeight(874, panned))).toBe(false);
    expect(keyboardJustHid(keyboardHeight(874, up), keyboardHeight(874, { height: 874 }))).toBe(true); // really gone
    expect(keyboardHeight(874, { height: 940 })).toBe(0); // toolbars collapsed
    expect(keyboardHeight(874, null)).toBe(0);
  });
});

// The iPhone audit, 8 Oct 2026: searching in the calendar with the keyboard up, the day's list stayed behind the
// keyboard: iOS doesn't shrink innerHeight, so the list counted as on screen.
describe("where the screen ends (visibleBottom)", () => {
  it("the keyboard up on iOS: above it, less the lifted field", async () => {
    const { visibleBottom } = await import("../src/scripts/views/bottomNav");
    // iPhone 17: 874 pt tall, the keyboard ~336 pt, the visual viewport not panned
    expect(visibleBottom(874, { height: 538, offsetTop: 0 }, 52)).toBe(486);
    // panned by 100 pt: what's seen moved down the page with it
    expect(visibleBottom(874, { height: 538, offsetTop: 100 }, 52)).toBe(586);
  });

  it("no keyboard: the window less the bar; never past the window (toolbars collapsed)", async () => {
    const { visibleBottom } = await import("../src/scripts/views/bottomNav");
    expect(visibleBottom(812, { height: 812, offsetTop: 0 }, 60)).toBe(752);
    expect(visibleBottom(812, { height: 880, offsetTop: 0 }, 60)).toBe(752);
    expect(visibleBottom(812, null, 60)).toBe(752);
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

describe("a field left empty (leftEmpty)", async () => {
  const { leftEmpty } = await import("../src/scripts/views/bottomNav");

  it("closes when nothing's typed, the focus is elsewhere and nothing is over it", () => {
    expect(leftEmpty({ query: "  ", focused: false, covered: false })).toBe(true);
    expect(leftEmpty({ query: "", focused: true, covered: false })).toBe(false); // still typing
    expect(leftEmpty({ query: "salsa", focused: false, covered: false })).toBe(false); // a search kept
    expect(leftEmpty({ query: "", focused: false, covered: true })).toBe(false); // the details or "Cuándo" over it
  });
});

describe("the search field's history entry", () => {
  let fake: FakeHistory;
  let nav: BottomNav;
  let screens: typeof import("../src/scripts/screenHistory");
  let open = false;
  let backs = 0;
  let returns = 0;

  beforeEach(async () => {
    fake = installFakeHistory();
    vi.resetModules();
    nav = await import("../src/scripts/views/bottomNav");
    screens = await import("../src/scripts/screenHistory");
    open = false;
    backs = 0;
    returns = 0;
  });

  afterEach(() => vi.unstubAllGlobals());

  const setUp = () =>
    nav.searchHistory({
      isOpen: () => open,
      onBack: () => {
        open = false;
        backs++;
      },
      onReturn: () => returns++,
    });

  /** What the details (drawerHistory.ts) and the "Cuándo" menu (whenMenu.ts) push over the current entry. */
  const openDetails = () => history.pushState(screens.overlayState({ eventId: "uno" }), "", "/evento/uno/");
  const openWhenMenu = () => history.pushState(screens.overlayState({ menu: "when" }), "");

  it("opening pushes an overlay entry over the screen's, same address, marked with this opening", () => {
    const entry = setUp();
    open = true;
    entry.open();
    expect(fake.entries).toHaveLength(2);
    expect(fake.state).toMatchObject({ search: expect.any(String), overlay: true });
    expect(fake.path).toBe("/");
  });

  it("an overlay opened over it doesn't carry its mark, so the field closing leaves that one open", async () => {
    for (const openOver of [openDetails, openWhenMenu]) {
      const entry = setUp();
      open = true;
      entry.open();
      openOver();
      expect(fake.state).not.toHaveProperty("search");
      expect(entry.covered()).toBe(true);
      open = false; // the field closed under it (e.g. the screen got wider)
      entry.close();
      await settle();
      expect(fake.index).toBe(2); // the details (or the menu) still on top
      // Their own close later steps back over the field's dead entry, onto the screen.
      history.back();
      await settle();
      expect(fake.index).toBe(0);
      expect(backs).toBe(0);
      fake.entries.splice(1);
    }
  });

  it("back from an overlay over it returns to the field (onReturn), not ending the search", async () => {
    const entry = setUp();
    open = true;
    entry.open();
    expect(entry.covered()).toBe(false);
    openWhenMenu();
    history.back();
    await settle();
    expect([returns, backs, fake.index]).toEqual([1, 0, 1]);
    expect(open).toBe(true);
  });

  it("forward onto the details over the open field leaves it open", async () => {
    const entry = setUp();
    open = true;
    entry.open();
    openDetails();
    history.back();
    await settle();
    history.forward();
    await settle();
    expect([backs, fake.index, open]).toEqual([0, 2, true]);
  });

  it("an entry left by another opening (a reload) is a dead step, not this field's", async () => {
    history.replaceState({ search: "before-the-reload", overlay: true }, "");
    history.pushState({}, "");
    const entry = setUp();
    open = true;
    entry.open();
    open = false;
    entry.close(); // ×: one step back, onto the screen
    await settle();
    expect(fake.index).toBe(1);
    history.back(); // onto the stale entry: over it, and off the start of the fake history
    await settle();
    expect(fake.index).toBe(0);
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

describe("Guardados' number (renderSavedCount)", () => {
  afterEach(() => vi.unstubAllGlobals());

  /** A [data-saved-count] badge, inside its way to Guardados (the bar's link, the toolbar's tab). */
  const badge = () => {
    const attributes = new Map<string, string>();
    return {
      attributes,
      textContent: "",
      hidden: true,
      closest: () => ({ setAttribute: (name: string, value: string) => attributes.set(name, value) }),
    };
  };

  it("shows the number of saved events to come on each, and names them with it; none: no badge", async () => {
    const bar = badge();
    const tab = badge();
    vi.stubGlobal("document", { querySelectorAll: () => [bar, tab] });
    const { renderSavedCount } = await import("../src/scripts/views/saveButton");
    renderSavedCount(3);
    expect([bar.textContent, bar.hidden, bar.attributes.get("aria-label")]).toEqual(["3", false, "Guardados, 3"]);
    expect([tab.textContent, tab.hidden]).toEqual(["3", false]);
    renderSavedCount(0);
    expect([bar.textContent, bar.hidden, bar.attributes.get("aria-label")]).toEqual(["", true, "Guardados"]);
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

  it("the views are links to their addresses, Guardados one of them; Filtros opens its sheet", () => {
    expect(bar).toMatch(/<a class="bottom-nav__item" href=\{viewPath\("upcoming"\)\} data-view="upcoming"/);
    expect(bar).toMatch(/<a class="bottom-nav__item" href=\{viewPath\("calendar"\)\} data-view="calendar"/);
    expect(bar).toMatch(/<a class="bottom-nav__item" href=\{viewPath\("saved"\)\} data-view="saved"/);
    expect(bar).not.toContain("data-saved-only");
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

  // The bug hunt of 7 Oct 2026: WebKit drew its own clear glyph inside the field, beside the bar's ×, even with
  // `appearance: none` (prefixed or not); only `display: none` hides it there and in Chrome.
  it("the field has one × only, ours: the browser's clear button is hidden", () => {
    const css = source("styles/components/bottom-nav.css");
    const start = css.indexOf(".bottom-nav__search .search-input::-webkit-search-cancel-button {");
    expect(start).toBeGreaterThan(-1);
    expect(css.slice(start, css.indexOf("}", start))).toContain("display: none;");
  });

  it("the search field closes where the bar goes away: the script watches the CSS's own query", async () => {
    const { WIDE_QUERY } = await import("../src/scripts/views/bottomNav");
    const css = readFileSync(new URL("../src/styles/components/bottom-nav.css", import.meta.url), "utf8");
    expect(css).toContain(`@media ${WIDE_QUERY} {`);
    expect(css).toContain(`@media not (${WIDE_QUERY}) {`);
  });

  it("Info left the tabs for an (i) in the header, still a link to the footer", () => {
    expect(source("components/ViewToolbar.astro")).not.toContain('href="#info"');
    expect(source("components/SiteHeader.astro")).toMatch(/<a class="icon-btn site-header__info" href="#info" aria-label="Info[^"]*"/);
    expect(source("components/SiteFooter.astro")).toContain('id="info"');
  });
});
