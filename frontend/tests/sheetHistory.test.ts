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
