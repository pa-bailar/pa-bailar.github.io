import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addressAfterClosing } from "../src/scripts/lib/links";
import { fakeDialog, installFakeHistory, settle, type FakeHistory } from "./fakeHistory";

type ScreenHistory = typeof import("../src/scripts/screenHistory");
type Sheets = typeof import("../src/scripts/lib/sheet");

/** The page's screen, as main.ts keeps it: what `current` reads and `apply` puts back. */
interface App {
  account: string | null;
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
  app = { account: null, savedOnly: false };
  const current = () => ({ view: "upcoming" as const, account: app.account, savedOnly: app.savedOnly, periods: [], scrollY: 0 });
  screens.initScreenHistory({
    current,
    apply: (screen) => {
      if (screens.sameScreen(screen, current())) return;
      app.account = screen.account;
      app.savedOnly = screen.savedOnly;
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const openAcademy = () => screens.goTo("account", () => (app.account = "academia"));
const leaveAcademy = () => screens.leave("account", () => (app.account = null));

/** The "Filtros" sheet, as jumpBar.ts sets it up, opened. */
function openFilterSheet() {
  const sheet = fakeDialog("filter-sheet");
  sheets.initPanelSheet(sheet);
  sheets.openPanelSheet(sheet);
  return sheet;
}

describe("moves between screens", () => {
  it("an academy's events get a history entry; back puts the list back", async () => {
    openAcademy();
    expect(fake.entries).toHaveLength(2);
    history.back();
    await settle();
    expect(app.account).toBeNull();
    expect(fake.index).toBe(0);
  });

  it("undoing the move from the page goes back in history: no screens pile up", async () => {
    openAcademy();
    leaveAcademy();
    await settle();
    expect(app.account).toBeNull();
    expect(fake.index).toBe(0);
  });

  it("undoing a move that isn't the current entry happens in place", () => {
    openAcademy();
    screens.leave("saved", () => (app.savedOnly = false));
    expect(fake.index).toBe(1);
    expect(app.account).toBe("academia");
  });
});

describe("the Filtros sheet over an academy's events", () => {
  it("its entry is an overlay over the academy's screen", () => {
    openAcademy();
    openFilterSheet();
    expect(fake.state).toMatchObject({ sheet: "filter-sheet", overlay: true, screen: { account: "academia" } });
  });

  it('"Quitar @academia" inside it clears the academy and the sheet stays open', async () => {
    openAcademy();
    const sheet = openFilterSheet();
    leaveAcademy();
    await settle();
    expect(app.account).toBeNull();
    expect(sheet.open).toBe(true);
    expect(fake.state).toMatchObject({ sheet: "filter-sheet", screen: { account: null } });
  });

  it("closing it afterwards (×) doesn't bring the academy back: its screen is skipped", async () => {
    openAcademy();
    const sheet = openFilterSheet();
    leaveAcademy();
    sheets.dismissSheet(sheet);
    await settle();
    expect(sheet.open).toBe(false);
    expect(app.account).toBeNull();
    expect(fake.index).toBe(0);
  });

  it("nor does the phone's back button", async () => {
    openAcademy();
    const sheet = openFilterSheet();
    leaveAcademy();
    history.back();
    await settle();
    expect(sheet.open).toBe(false);
    expect(app.account).toBeNull();
    expect(fake.index).toBe(0);
  });

  it("without leaving the academy, closing it keeps the academy's screen", async () => {
    openAcademy();
    const sheet = openFilterSheet();
    sheets.dismissSheet(sheet);
    await settle();
    expect(app.account).toBe("academia");
    expect(fake.index).toBe(1);
  });

  it("two screens left from inside it are both skipped", async () => {
    screens.goTo("saved", () => (app.savedOnly = true));
    openAcademy();
    const sheet = openFilterSheet();
    leaveAcademy();
    screens.leave("saved", () => (app.savedOnly = false));
    sheets.dismissSheet(sheet);
    await settle(10);
    expect(app).toEqual({ account: null, savedOnly: false });
    expect(fake.index).toBe(0);
  });
});

describe("the side panel (an overlay with the event's address)", () => {
  const openPanel = (id: string) =>
    history.pushState(screens.overlayState({ eventId: id }), "", `/evento/${id}/`);

  it("leaving the academy from the list next to it, then closing it, stays on all the academies", async () => {
    openAcademy();
    openPanel("social-1");
    leaveAcademy();
    expect(app.account).toBeNull();
    history.back(); // closing the panel goes through the history
    await settle();
    expect(app.account).toBeNull();
    expect(fake.path).toBe("/");
  });

  it("a move while it's open gets an entry without the event: closing then fixes the address", () => {
    openPanel("social-1");
    openAcademy();
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
