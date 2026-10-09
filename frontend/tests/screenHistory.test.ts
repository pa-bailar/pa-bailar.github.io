import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addressAfterClosing } from "../src/scripts/lib/links";
import type { View } from "../src/scripts/types";
import { fakeDialog, installFakeHistory, settle, type FakeHistory } from "./fakeHistory";

type ScreenHistory = typeof import("../src/scripts/screenHistory");
type Sheets = typeof import("../src/scripts/lib/sheet");

/** The page's screen, as main.ts keeps it: what `current` reads and `apply` puts back. */
interface App {
  period: string | null; // a period opened whole
  view: View;
}

let fake: FakeHistory;
let screens: ScreenHistory;
let sheets: Sheets;
let app: App;

beforeEach(async () => {
  fake = installFakeHistory();
  vi.resetModules(); // each test starts with fresh module state and listeners
  screens = await import("../src/scripts/screenHistory");
  sheets = await import("../src/scripts/lib/sheet");
  app = { period: null, view: "upcoming" };
  const current = () => ({ view: app.view, periods: app.period ? [app.period] : [], scrollY: 0 });
  screens.initScreenHistory({
    current,
    apply: (screen) => {
      if (screens.sameScreen(screen, current())) return;
      app.period = screen.periods[0] ?? null;
      app.view = screen.view;
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const openPeriod = () => screens.goTo("period", () => (app.period = "hoy"));
const leavePeriod = () => screens.leave("period", () => (app.period = null));

/** The "Filtros" sheet, as jumpBar.ts sets it up, opened. */
function openFilterSheet() {
  const sheet = fakeDialog("filter-sheet");
  sheets.initPanelSheet(sheet);
  sheets.openPanelSheet(sheet);
  return sheet;
}

describe("a reload", () => {
  it("leaves no overlay marked on the entry it reloaded (the search field, a menu, a sheet were open)", async () => {
    fake = installFakeHistory();
    vi.resetModules();
    history.replaceState({ screen: { view: "upcoming", periods: [], scrollY: 0 }, search: "x", menu: "when", sheet: "filter-sheet", overlay: true }, "");
    screens = await import("../src/scripts/screenHistory");
    screens.initScreenHistory({ current: () => ({ view: "upcoming", periods: [], scrollY: 0 }), apply: () => {} });
    expect(fake.state).toEqual({ screen: expect.objectContaining({ view: "upcoming" }) });
  });
});

describe("an overlay's entry", () => {
  it("carries the screen and the open event, not the other overlays' marks", () => {
    history.pushState(screens.overlayState({ eventId: "uno" }), "", "/evento/uno/");
    history.pushState(screens.overlayState({ sheet: "posts-sheet" }), "");
    expect(screens.overlayState({ menu: "when" })).toEqual({ screen: expect.any(Object), eventId: "uno", menu: "when", overlay: true });
    history.replaceState({ ...history.state, search: "x" }, "");
    expect(screens.overlayState({ eventId: "dos" })).not.toHaveProperty("search");
    expect(screens.overlayState({ eventId: "dos" })).not.toHaveProperty("sheet");
  });
});

describe("moves between screens", () => {
  it("a period opened whole gets a history entry; back puts the list back", async () => {
    openPeriod();
    expect(fake.entries).toHaveLength(2);
    history.back();
    await settle();
    expect(app.period).toBeNull();
    expect(fake.index).toBe(0);
  });

  it("undoing the move from the page goes back in history: no screens pile up", async () => {
    openPeriod();
    leavePeriod();
    await settle();
    expect(app.period).toBeNull();
    expect(fake.index).toBe(0);
  });

  // The iPhone audit, 8 Oct 2026: Calendario → "Info" (#info, an entry the browser makes) → Eventos left the calendar's
  // entry behind it: back brought the calendar back, then the list again.
  it("undoing a move after an in-page jump (Info) steps back over the jump too", async () => {
    screens.goTo("view", () => (app.view = "calendar"));
    screens.beforeJump();
    history.pushState(null, "", "#info"); // what the browser does for the link
    screens.afterJump();
    expect(fake.entries).toHaveLength(3);
    screens.leave("view", () => (app.view = "upcoming"));
    await settle();
    expect(app.view).toBe("upcoming");
    expect(fake.index).toBe(0); // the list's own entry: one back from here leaves the site, nothing in between
  });

  it("the calendar, Info, then Guardados: still replaced, so Eventos returns to the list", async () => {
    screens.goTo("view", () => (app.view = "calendar"));
    screens.beforeJump();
    history.pushState(null, "", "#info");
    screens.afterJump();
    screens.replaceScreen("view", () => (app.view = "saved"));
    expect(fake.entries).toHaveLength(3);
    screens.leave("view", () => (app.view = "upcoming"));
    await settle();
    expect(app.view).toBe("upcoming");
    expect(fake.index).toBe(0);
  });

  it("back from the jump returns to the same screen's entry, and the jump keeps it", async () => {
    screens.goTo("view", () => (app.view = "calendar"));
    screens.beforeJump();
    history.pushState(null, "", "#info");
    screens.afterJump();
    expect(screens.historyState().screen?.view).toBe("calendar");
    history.back();
    await settle();
    expect(app.view).toBe("calendar");
    expect(fake.index).toBe(1);
  });

  it("undoing a move that isn't the current entry happens in place", () => {
    openPeriod();
    screens.leave("view", () => (app.view = "upcoming"));
    expect(fake.index).toBe(1);
    expect(app.period).toBe("hoy");
  });
});

describe("the Filtros sheet over a period opened whole", () => {
  it("its entry is an overlay over the period's screen", () => {
    openPeriod();
    openFilterSheet();
    expect(fake.state).toMatchObject({ sheet: "filter-sheet", overlay: true, screen: { periods: ["hoy"] } });
  });

  it("leaving the period from inside it happens there, and the sheet stays open", async () => {
    openPeriod();
    const sheet = openFilterSheet();
    leavePeriod();
    await settle();
    expect(app.period).toBeNull();
    expect(sheet.open).toBe(true);
    expect(fake.state).toMatchObject({ sheet: "filter-sheet", screen: { periods: [] } });
  });

  it("closing it afterwards (×) doesn't bring the period back: its screen is skipped", async () => {
    openPeriod();
    const sheet = openFilterSheet();
    leavePeriod();
    sheets.dismissSheet(sheet);
    await settle();
    expect(sheet.open).toBe(false);
    expect(app.period).toBeNull();
    expect(fake.index).toBe(0);
  });

  it("nor does the phone's back button", async () => {
    openPeriod();
    const sheet = openFilterSheet();
    leavePeriod();
    history.back();
    await settle();
    expect(sheet.open).toBe(false);
    expect(app.period).toBeNull();
    expect(fake.index).toBe(0);
  });

  it("without leaving the period, closing it keeps the period's screen", async () => {
    openPeriod();
    const sheet = openFilterSheet();
    sheets.dismissSheet(sheet);
    await settle();
    expect(app.period).toBe("hoy");
    expect(fake.index).toBe(1);
  });

  it("two screens left from inside it are both skipped", async () => {
    screens.goTo("view", () => (app.view = "saved"));
    openPeriod();
    const sheet = openFilterSheet();
    leavePeriod();
    screens.leave("view", () => (app.view = "upcoming"));
    sheets.dismissSheet(sheet);
    await settle(10);
    expect(app).toEqual({ period: null, view: "upcoming" });
    expect(fake.index).toBe(0);
  });
});

describe("the side panel (an overlay with the event's address)", () => {
  const openPanel = (id: string) =>
    history.pushState(screens.overlayState({ eventId: id }), "", `/evento/${id}/`);

  it("leaving the period from the list next to it, then closing it, stays on the whole list", async () => {
    openPeriod();
    openPanel("social-1");
    leavePeriod();
    expect(app.period).toBeNull();
    history.back(); // closing the panel goes through the history
    await settle();
    expect(app.period).toBeNull();
    expect(fake.path).toBe("/");
  });

  it("a period opened while it's open gets no entry: the panel's entry records it (review, 6 Oct 2026)", () => {
    openPanel("social-1");
    const at = fake.index;
    openPeriod();
    expect(fake.index).toBe(at);
    expect(fake.state).toMatchObject({ eventId: "social-1", overlay: true, screen: { periods: ["hoy"] } });
    expect(fake.path).toBe("/evento/social-1/");
  });

  it("closing the panel keeps the period, which gets its entry then: back folds it, never reopening the event", async () => {
    openPanel("social-1");
    openPeriod();
    history.back(); // closing the panel goes through the history
    await settle();
    expect(app.period).toBe("hoy");
    expect(fake.state).toMatchObject({ screen: { periods: ["hoy"] } });
    expect(fake.state).not.toHaveProperty("eventId");
    expect(fake.path).toBe("/");
    history.back(); // the period's entry, like any period opened whole: back folds it
    await settle();
    expect(app.period).toBeNull();
    expect(fake.state?.eventId).toBeUndefined();
    history.forward(); // the panel's entry is gone: forward is the period again, not the event
    await settle();
    expect(app.period).toBe("hoy");
    expect(fake.state?.eventId).toBeUndefined();
  });

  it("a view moved to while it's open still gets its own entry", () => {
    openPanel("social-1");
    screens.goTo("view", () => (app.view = "calendar"));
    expect(fake.state).not.toHaveProperty("eventId");
    expect(addressAfterClosing(location)).toBe("/"); // the drawer's close puts the address back to the home page
  });
});

describe("addressAfterClosing", () => {
  it("an event's address goes back to the home page's, keeping the query and the hash", () => {
    expect(addressAfterClosing({ pathname: "/evento/social-1/", search: "?utm_source=compartido", hash: "#x" })).toBe(
      "/?utm_source=compartido#x",
    );
  });

  it("any other address is already right", () => {
    expect(addressAfterClosing({ pathname: "/", search: "", hash: "" })).toBeNull();
  });
});

describe("historyState", () => {
  it("reads an entry's state, and one the app didn't write as empty", () => {
    expect(screens.historyState({ eventId: "social-1", overlay: true })).toEqual({ eventId: "social-1", overlay: true });
    expect(screens.historyState(null)).toEqual({});
    expect(screens.historyState("left by another page")).toEqual({});
  });
});

describe("each view's own address (/calendario/, /guardados/)", () => {
  let shown: { view: View };

  beforeEach(async () => {
    fake = installFakeHistory();
    vi.resetModules();
    screens = await import("../src/scripts/screenHistory");
    const { viewPath } = await import("../src/scripts/lib/links");
    shown = { view: "upcoming" };
    screens.initScreenHistory({
      current: () => ({ view: shown.view, periods: [], scrollY: 0 }),
      apply: (screen) => (shown.view = screen.view),
      address: (screen) => viewPath(screen.view),
    });
  });

  it("the calendar's move pushes /calendario/; back returns to /", async () => {
    screens.goTo("view", () => (shown.view = "calendar"));
    expect(fake.path).toBe("/calendario/");
    history.back();
    await settle();
    expect(fake.path).toBe("/");
    expect(shown.view).toBe("upcoming");
  });

  it("from the calendar to Guardados the entry is replaced: /guardados/, and back still returns to the list", async () => {
    screens.goTo("view", () => (shown.view = "calendar"));
    screens.replaceScreen("view", () => (shown.view = "saved"));
    expect([fake.path, fake.index]).toEqual(["/guardados/", 1]);
    history.back();
    await settle();
    expect([fake.path, shown.view]).toEqual(["/", "upcoming"]);
  });

  it("opened on Guardados (/guardados/), the calendar gets an entry of its own: back returns to Guardados", async () => {
    shown.view = "saved";
    screens.replaceScreen("view", () => (shown.view = "calendar"));
    expect([fake.path, fake.index]).toEqual(["/calendario/", 1]);
    history.back();
    await settle();
    expect(shown.view).toBe("saved");
  });

  it("under an overlay (the side panel), the move gets an entry of its own: the overlay's stays as it was", () => {
    screens.goTo("view", () => (shown.view = "calendar"));
    history.pushState(screens.overlayState({ eventId: "social-1" }), "");
    screens.replaceScreen("view", () => (shown.view = "saved"));
    expect(fake.index).toBe(3);
    expect(fake.state).toMatchObject({ screen: { view: "saved" } });
  });
});

describe("addresses per view", () => {
  it("the calendar is /calendario/, Guardados /guardados/, with or without their slash; anything else is the list", async () => {
    const { viewOfPath, viewPath } = await import("../src/scripts/lib/links");
    expect(viewPath("calendar")).toBe("/calendario/");
    expect(viewPath("upcoming")).toBe("/");
    expect(viewPath("saved")).toBe("/guardados/");
    expect(viewOfPath("/guardados")).toBe("saved");
    expect(viewOfPath("/guardados/")).toBe("saved");
    expect(viewOfPath("/calendario/")).toBe("calendar");
    expect(viewOfPath("/calendario")).toBe("calendar");
    expect(viewOfPath("/")).toBe("upcoming");
    expect(viewOfPath("/evento/x/")).toBe("upcoming");
  });

  it("closing an event opened from the calendar goes back to /calendario/", () => {
    expect(addressAfterClosing({ pathname: "/evento/social-1/", search: "", hash: "" }, "calendar")).toBe("/calendario/");
  });
});
