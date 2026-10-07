import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { sharedEventLink } from "../src/scripts/lib/links";
import { CLOSE_DISTANCE, CLOSE_FRACTION, FLICK, exitDurationFor } from "../src/scripts/lib/sheetMotion";
import { PANEL_MIN_HEIGHT, PANEL_MIN_WIDTH, TOP_GAP, exitDuration, offsetFor } from "../src/scripts/views/drawerSheet";
import { LIGHTBOX_QUERY } from "../src/scripts/views/lightbox";
import { event } from "./factories";
import { installFakeHistory, settle, type FakeHistory } from "./fakeHistory";

type DrawerHistory = typeof import("../src/scripts/views/drawerHistory");
type ScreenHistory = typeof import("../src/scripts/screenHistory");

let fake: FakeHistory;
let drawer: DrawerHistory;
let screens: ScreenHistory;

beforeEach(async () => {
  fake = installFakeHistory();
  vi.resetModules();
  drawer = await import("../src/scripts/views/drawerHistory");
  screens = await import("../src/scripts/screenHistory");
  const current = () => ({ view: "upcoming" as const, periods: [], scrollY: 0 });
  screens.initScreenHistory({ current, apply: () => {} });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const social = event({ id: "social-1" });
const salsa = event({ id: "salsa-2" });

describe("opening the details", () => {
  it("pushes the event's address, an overlay over the screen's entry", () => {
    drawer.enterEvent(social, false);
    expect(fake.entries).toHaveLength(2);
    expect(fake.path).toBe("/evento/social-1/");
    expect(fake.state).toMatchObject({ eventId: "social-1", overlay: true, screen: { view: "upcoming" } });
  });

  it("another card in the open side panel replaces it: back still closes", () => {
    drawer.enterEvent(social, false);
    drawer.enterEvent(salsa, true);
    expect(fake.entries).toHaveLength(2);
    expect(fake.path).toBe("/evento/salsa-2/");
    expect(fake.state).toMatchObject({ eventId: "salsa-2", overlay: true });
  });

  it("…unless the list moved to another view meanwhile: that one keeps its entry", () => {
    drawer.enterEvent(social, false);
    screens.goTo("view", () => {});
    drawer.enterEvent(salsa, true);
    expect(fake.entries).toHaveLength(4);
    expect(fake.entries[2]!.state).not.toHaveProperty("eventId");
    expect(fake.state).toMatchObject({ eventId: "salsa-2" });
  });

  it("a period opened meanwhile has no entry: the next event replaces the details' entry (review, 6 Oct 2026)", () => {
    drawer.enterEvent(social, false);
    screens.goTo("period", () => {});
    drawer.enterEvent(salsa, true);
    expect(fake.entries).toHaveLength(2);
    expect(fake.state).toMatchObject({ eventId: "salsa-2", overlay: true });
  });
});

describe("closing the details", () => {
  it("goes back when the event's entry is current", async () => {
    drawer.enterEvent(social, false);
    expect(drawer.backOutOfEvent()).toBe(true);
    await settle();
    expect(fake.index).toBe(0);
    expect(fake.path).toBe("/");
  });

  it("closes in place on another entry (a screen reached with the side panel open)", () => {
    expect(drawer.backOutOfEvent()).toBe(false);
  });

  it("afterwards, a screen entry that kept the event's address gets the home page's back", () => {
    drawer.enterEvent(social, false);
    screens.goTo("view", () => {});
    expect(fake.path).toBe("/evento/social-1/");
    drawer.afterClosing();
    expect(fake.path).toBe("/");
    expect(fake.state).toHaveProperty("screen");
  });
});

describe("back and forward (historyMove)", () => {
  const exists = (id: string) => id === "social-1" || id === "salsa-2";
  const closed = { open: false, leaving: false, currentId: null };
  const open = { open: true, leaving: false, currentId: "social-1" };

  it("the same event, open (back from a sheet over it): it stays", () => {
    expect(drawer.historyMove({ eventId: "social-1", sheet: undefined }, open, exists)).toEqual({ kind: "stay" });
  });

  it("another event, or the same while it slides away: it opens", () => {
    expect(drawer.historyMove({ eventId: "salsa-2" }, open, exists)).toEqual({ kind: "open", eventId: "salsa-2" });
    expect(drawer.historyMove({ eventId: "social-1" }, { ...open, leaving: true }, exists)).toEqual({
      kind: "open",
      eventId: "social-1",
    });
    expect(drawer.historyMove({ eventId: "salsa-2" }, closed, exists)).toEqual({ kind: "open", eventId: "salsa-2" });
  });

  it("while closing, landing on an earlier event's entry doesn't open it (a skipped screen led there)", () => {
    const closing = { ...open, leaving: true, currentId: "salsa-2" };
    expect(drawer.historyMove({ eventId: "social-1" }, closing, exists)).toEqual({ kind: "none" });
  });

  it("no event (or one that's gone): the open details close, closed ones stay closed", () => {
    expect(drawer.historyMove({ screen: {} }, open, exists)).toEqual({ kind: "close" });
    expect(drawer.historyMove({ eventId: "gone" }, open, exists)).toEqual({ kind: "close" });
    expect(drawer.historyMove(null, closed, exists)).toEqual({ kind: "none" });
  });
});

describe("a shared link (/?evento=<id>)", () => {
  it("is read, keeping the other parameters for the statistics", () => {
    const link = sharedEventLink({ pathname: "/", search: "?evento=social-1&utm_source=compartido", hash: "" });
    expect(link?.id).toBe("social-1");
    expect(link?.address).toBe("/?utm_source=compartido");
    expect(link?.params.toString()).toBe("utm_source=compartido");
    expect(sharedEventLink({ pathname: "/", search: "?utm_source=x", hash: "" })).toBeNull();
  });

  it("leaves the list's entry under the drawer's: × or back land on the list, not off the site", async () => {
    fake = installFakeHistory("https://pa-bailar.github.io/?evento=social-1&utm_source=compartido");
    vi.resetModules();
    drawer = await import("../src/scripts/views/drawerHistory");
    screens = await import("../src/scripts/screenHistory");
    // As main.ts does: the address without ?evento, the screens' history, then the drawer once the page settled.
    const link = sharedEventLink(location)!;
    history.replaceState(null, "", link.address);
    screens.initScreenHistory({
      current: () => ({ view: "upcoming", periods: [], scrollY: 0 }),
      apply: () => {},
    });
    drawer.enterEvent(social, false);
    expect(fake.entries.map((entry) => entry.url.pathname + entry.url.search)).toEqual([
      "/?utm_source=compartido",
      "/evento/social-1/",
    ]);
    drawer.backOutOfEvent();
    await settle();
    expect(fake.index).toBe(0);
    expect(fake.state).toHaveProperty("screen");
  });
});

describe("the drawer's numbers agree with the CSS and the sheets", () => {
  const css = (file: string) => readFileSync(new URL(`../src/styles/${file}`, import.meta.url), "utf8");

  it("TOP_GAP is --drawer-top-gap", () => {
    expect(css("tokens.css")).toContain(`--drawer-top-gap: ${TOP_GAP}px;`);
  });

  it("the side panel starts where drawer.css's breakpoints say", () => {
    const drawerCss = css("components/drawer.css");
    const [width, height] = [PANEL_MIN_WIDTH, PANEL_MIN_HEIGHT];
    expect(drawerCss).toContain(`@media (min-width: ${width}px) and (min-height: ${height}px) {`);
    expect(drawerCss).toContain(`@media (max-width: ${width - 1}px), (max-height: ${height - 1}px) {`);
    expect(css("tokens.css")).toContain(`${PANEL_MIN_WIDTH}px  the details`);
  });

  it("the image stage needs the side panel's room and a mouse, as event-card.css says (lightbox.ts)", () => {
    expect(css("components/event-card.css")).toContain(`@media ${LIGHTBOX_QUERY} {`);
  });

  it("the drawer leaves like the bottom sheets (lib/sheetMotion.ts)", () => {
    expect([FLICK, CLOSE_DISTANCE, CLOSE_FRACTION]).toEqual([0.5, 110, 0.22]);
    const screen = 812;
    expect(exitDuration(offsetFor("medium", screen), screen, 2)).toBe(
      exitDurationFor(offsetFor("closed", screen) - offsetFor("medium", screen), 2),
    );
    expect(exitDurationFor(1000, 0)).toBe(280);
    expect(exitDurationFor(0, 0)).toBe(160);
  });
});
