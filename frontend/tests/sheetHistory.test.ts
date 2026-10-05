import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDialog, fakeFocusable, installFakeHistory, settle, type FakeHistory } from "./fakeHistory";

type Sheets = typeof import("../src/scripts/lib/sheet");
type ScreenHistory = typeof import("../src/scripts/screenHistory");

let fake: FakeHistory;
let sheets: Sheets;
let screens: ScreenHistory;

beforeEach(async () => {
  fake = installFakeHistory();
  vi.resetModules(); // fresh listeners each test
  sheets = await import("../src/scripts/lib/sheet");
  screens = await import("../src/scripts/screenHistory");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** The details drawer's entry for an event, as drawerHistory.ts pushes it. */
const openDetails = (id = "social-1") => history.pushState(screens.overlayState({ eventId: id }), "", `/evento/${id}/`);

function panelSheet(id: string) {
  const sheet = fakeDialog(id);
  sheets.initPanelSheet(sheet);
  return sheet;
}

describe("a sheet that took another's place (a post chosen among the event's posts)", () => {
  it("gives the focus back to what opened the sheet it replaced when it closes", async () => {
    openDetails();
    const postsButton = fakeFocusable("Ver las 3 publicaciones"); // in the details
    const thumb = fakeFocusable("a post's thumbnail"); // in the posts sheet
    const posts = panelSheet("posts-sheet");
    const viewer = panelSheet("post-viewer");

    postsButton.focus();
    sheets.openPanelSheet(posts);
    thumb.focus();
    sheets.openPanelSheet(viewer, { replacing: posts });
    await settle();
    expect(posts.open).toBe(false);
    expect(fake.state).toMatchObject({ sheet: "post-viewer", eventId: "social-1" });

    // The browser gives the focus back to the thumbnail, inside the closed posts sheet: it lands on <body>.
    document.body.focus();
    sheets.dismissSheet(viewer);
    await settle();
    expect(viewer.open).toBe(false);
    expect(document.activeElement).toBe(postsButton);
    expect(fake.state).toMatchObject({ eventId: "social-1" });
    expect(fake.state).not.toHaveProperty("sheet");
  });

  it("…not when it was gone from the page meanwhile", async () => {
    const opener = fakeFocusable("a card's ▦ 3");
    const posts = panelSheet("posts-sheet");
    const viewer = panelSheet("post-viewer");
    opener.focus();
    sheets.openPanelSheet(posts);
    sheets.openPanelSheet(viewer, { replacing: posts });
    Object.assign(opener, { isConnected: false }); // the list was drawn again
    document.body.focus();
    sheets.dismissSheet(viewer);
    await settle();
    expect(document.activeElement).toBe(document.body);
  });

  it("a sheet opened on its own leaves the focus to the browser", async () => {
    const opener = fakeFocusable("⚙");
    const filters = panelSheet("filter-sheet");
    opener.focus();
    sheets.openPanelSheet(filters);
    const elsewhere = fakeFocusable("where the browser put it");
    elsewhere.focus();
    sheets.dismissSheet(filters);
    await settle();
    expect(document.activeElement).toBe(elsewhere);
  });
});

describe("forward onto a closed sheet's entry", () => {
  it("goes back over it: the sheet is gone, so the drawer's × closes it at once", async () => {
    openDetails(); // 1
    const viewer = panelSheet("post-viewer");
    sheets.openPanelSheet(viewer); // 2: an @'s profile over the details
    history.back();
    await settle();
    expect(viewer.open).toBe(false);
    history.back(); // the list
    await settle();
    history.forward(); // the details again
    await settle();
    expect(fake.index).toBe(1);
    history.forward(); // the profile's entry: its sheet isn't open, so back to the details'
    await settle();
    expect(viewer.open).toBe(false);
    expect(fake.index).toBe(1);
    expect(fake.state).toMatchObject({ eventId: "social-1" });
    expect(fake.state).not.toHaveProperty("sheet");
  });

  it("the Cuándo menu's entry, once it closed, too", async () => {
    // Just what whenMenu.ts touches: the menu, its chip and the bar's row of chips.
    const element = (extra: object) => Object.assign(new EventTarget(), { contains: () => false, ...extra });
    const menu = element({ hidden: true, querySelectorAll: () => [] });
    const chip = element({ setAttribute() {}, focus() {}, closest: () => null });
    const elements: Record<string, unknown> = { "when-menu": menu, "when-open": chip, "jump-chips": element({}) };
    const page = Object.assign(new EventTarget(), document, { getElementById: (id: string) => elements[id] ?? null });
    vi.stubGlobal("document", page);
    const when = await import("../src/scripts/views/whenMenu");
    when.initWhenMenu();

    when.openWhenMenu(); // 1
    expect(when.isWhenMenuOpen()).toBe(true);
    history.back();
    await settle();
    expect(when.isWhenMenuOpen()).toBe(false);
    history.forward(); // its entry: the menu isn't open, so back to the list's
    await settle();
    expect(when.isWhenMenuOpen()).toBe(false);
    expect(fake.index).toBe(0);
  });

  it("back onto an open sheet's entry keeps it (the sheet over it closed)", async () => {
    const filters = panelSheet("filter-sheet");
    sheets.openPanelSheet(filters);
    history.pushState(screens.overlayState({ menu: "other" }), "");
    history.back();
    await settle();
    expect(filters.open).toBe(true);
    expect(fake.index).toBe(1);
  });
});
