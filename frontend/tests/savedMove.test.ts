import { describe, expect, it } from "vitest";
import { installPlace } from "../src/scripts/lib/installPlace";
import { idsFromMove, moveText, savedMove } from "../src/scripts/lib/savedMove";
import { emptySavedHtml, savedMoveHtml } from "../src/scripts/views/savedView";

const UA = {
  safari27: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Mobile/15E148 Safari/604.1",
  chromeIos: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1",
  instagramIos: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 334.0.4.32.98 (iPhone15,2; iOS 17_5; es_CO; es; scale=3.00; 1179x2556; 609114410)",
  ipadDesktop: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
  androidChrome: "Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
  windowsChrome: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
};

// The owner, 8 Oct 2026: on iPhone the installed app keeps its own storage, so it opened with none of Safari's saves,
// right after the reminder promised them. Tested in the iOS 27 Simulator: the app opens on the manifest's start_url, so
// the saves can't ride in the address; the visitor copies them in Safari and pastes them in the app.
describe("where the saves can be moved (savedMove)", () => {
  it("iPhone and iPad: copied in the browser, pasted in the installed app", () => {
    expect(savedMove(installPlace(UA.safari27), false)).toBe("copy");
    expect(savedMove(installPlace(UA.safari27), true)).toBe("paste");
    expect(savedMove(installPlace(UA.chromeIos), false)).toBe("copy"); // its app has its own storage too
    expect(savedMove(installPlace(UA.ipadDesktop, { platform: "MacIntel", maxTouchPoints: 5 }), true)).toBe("paste");
  });

  it("nowhere else: Android's app shares the browser's saves, computers have no app, an app's browser can't install", () => {
    for (const ua of [UA.androidChrome, UA.windowsChrome, UA.instagramIos]) {
      expect(savedMove(installPlace(ua), false)).toBeNull();
      expect(savedMove(installPlace(ua), true)).toBeNull();
    }
    expect(savedMove(installPlace(UA.ipadDesktop, { platform: "MacIntel", maxTouchPoints: 0 }), false)).toBeNull(); // a Mac
  });
});

describe("the copied text and back", () => {
  const home = "https://pa-bailar.github.io/";

  it("a line and a link with the ids, which come back from it", () => {
    const text = moveText(["salsa-en-la-57-10-oct", "taller-bachata-11-oct"], home);
    expect(text).toBe("Mis eventos guardados en Pa' Bailar: https://pa-bailar.github.io/?guardados=salsa-en-la-57-10-oct,taller-bachata-11-oct");
    expect(idsFromMove(text)).toEqual(["salsa-en-la-57-10-oct", "taller-bachata-11-oct"]);
  });

  it("found in whatever else was pasted, encoded or not, each once", () => {
    expect(idsFromMove("mira esto https://pa-bailar.github.io/?x=1&guardados=a-1%2Cb-2,a-1#y gracias")).toEqual(["a-1", "b-2"]);
  });

  it("nothing from text that isn't ours, nor ids that aren't ids", () => {
    expect(idsFromMove("hola")).toEqual([]);
    expect(idsFromMove("https://pa-bailar.github.io/?guardados=")).toEqual([]);
    expect(idsFromMove("?guardados=<script>,ok-1,%E0%A4%A")).toEqual([]); // a broken escape: nothing
    expect(idsFromMove("?guardados=<b>,OK,ok-1")).toEqual(["ok-1"]);
    expect(moveText(["ok-1", "<b>"], home)).toMatch(/guardados=ok-1$/);
  });
});

describe("Guardados' line for moving them (savedMoveHtml, emptySavedHtml)", () => {
  it("Safari on iPhone: copy; the app: paste; elsewhere nothing at all", () => {
    expect(savedMoveHtml("copy")).toContain("data-saved-copy");
    expect(savedMoveHtml("paste")).toContain("data-saved-paste");
    expect(savedMoveHtml(null)).toBe("");
  });

  it("the app's empty Guardados offers to paste; elsewhere the empty state is as it was", () => {
    expect(emptySavedHtml("", "paste")).toContain("data-saved-paste");
    expect(emptySavedHtml("", null)).toBe(emptySavedHtml(""));
    expect(emptySavedHtml("", null)).not.toMatch(/data-saved-(copy|paste)/);
    expect(emptySavedHtml("", "copy")).not.toMatch(/data-saved-(copy|paste)/); // nothing to copy yet
  });
});
