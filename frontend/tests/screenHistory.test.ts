import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addressAfterClosing } from "../src/scripts/lib/links";
import { fakeDialog, installFakeHistory, settle, type FakeHistory } from "./fakeHistory";

type ScreenHistory = typeof import("../src/scripts/screenHistory");
type Sheets = typeof import("../src/scripts/lib/sheet");

/** The page's screen, as main.ts keeps it: what `current` reads and `apply` puts back. */
interface App {
  period: string | null; // a period opened whole
  savedOnly: boolean;
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
  app = { period: null, savedOnly: false };
  const current = () => ({ view: "upcoming" as const, savedOnly: app.savedOnly, periods: app.period ? [app.period] : [], scrollY: 0 });
  screens.initScreenHistory({
    current,
    apply: (screen) => {
      if (screens.sameScreen(screen, current())) return;
      app.period = screen.periods[0] ?? null;
      app.savedOnly = screen.savedOnly;
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

  it("undoing a move that isn't the current entry happens in place", () => {
    openPeriod();
    screens.leave("saved", () => (app.savedOnly = false));
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
    screens.goTo("saved", () => (app.savedOnly = true));
    openPeriod();
    const sheet = openFilterSheet();
    leavePeriod();
    screens.leave("saved", () => (app.savedOnly = false));
    sheets.dismissSheet(sheet);
    await settle(10);
    expect(app).toEqual({ period: null, savedOnly: false });
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

  it("a move while it's open gets an entry without the event: closing then fixes the address", () => {
    openPanel("social-1");
    openPeriod();
    expect(fake.state).not.toHaveProperty("eventId");
    expect(fake.path).toBe("/evento/social-1/"); // pushState keeps the address…
    expect(addressAfterClosing(location)).toBe("/"); // …which the drawer's close puts back to the home page
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
