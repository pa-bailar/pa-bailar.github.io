import { describe, expect, it } from "vitest";
import { installGuide, installPlace } from "../src/scripts/lib/installPlace";

// Real user agents (iOS 26 reports itself as iOS 18.6; Safari's own version says 26).
const UA = {
  safari26: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
  safari18: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
  safari17: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  chromeIos: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1",
  chromeIos162: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/108.0.5359.112 Mobile/15E148 Safari/604.1",
  firefoxIos: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/132.0 Mobile/15E148 Safari/605.1.15",
  instagramIos: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 334.0.4.32.98 (iPhone15,2; iOS 17_5; es_CO; es; scale=3.00; 1179x2556; 609114410)",
  facebookIos: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/470.0.0.40.98;FBBV/600000000;FBDV/iPhone15,2;FBMD/iPhone;FBSN/iOS;FBSV/17.5;FBSS/3;FBCR/;FBID/phone;FBLC/es_LA;FBOP/5]",
  googleAppIos: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/320.0.640312459 Mobile/15E148 Safari/604.1",
  ipadDesktop: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
  androidChrome: "Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
  androidInstagram: "Mozilla/5.0 (Linux; Android 14; SM-A546E Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.0.0 Mobile Safari/537.36 Instagram 350.0.0.0 Android",
  windowsChrome: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
};

describe("where the visitor is, for installing", () => {
  it("Safari on iPhone, with Safari's own version (iOS 26 says 18.6)", () => {
    expect(installPlace(UA.safari26)).toMatchObject({ kind: "ios", browser: "safari", ipad: false, safariVersion: 26, canAdd: true });
    expect(installPlace(UA.safari18)).toMatchObject({ kind: "ios", browser: "safari", safariVersion: 18 });
  });

  it("other browsers on iPhone, which can add pages since iOS 16.4", () => {
    expect(installPlace(UA.chromeIos)).toMatchObject({ kind: "ios", browser: "chrome", canAdd: true });
    expect(installPlace(UA.firefoxIos)).toMatchObject({ kind: "ios", browser: "firefox", canAdd: true });
    expect(installPlace(UA.chromeIos162)).toMatchObject({ kind: "ios", browser: "chrome", canAdd: false });
  });

  it("apps' own browsers, which can't install", () => {
    expect(installPlace(UA.instagramIos)).toEqual({ kind: "in-app", ios: true });
    expect(installPlace(UA.facebookIos)).toEqual({ kind: "in-app", ios: true });
    expect(installPlace(UA.googleAppIos)).toEqual({ kind: "in-app", ios: true });
    expect(installPlace(UA.androidInstagram)).toEqual({ kind: "in-app", ios: false });
  });

  it("an iPad asking for the desktop site is told from a Mac by its touch screen", () => {
    expect(installPlace(UA.ipadDesktop, { platform: "MacIntel", maxTouchPoints: 5 })).toMatchObject({ kind: "ios", ipad: true, browser: "safari" });
    expect(installPlace(UA.ipadDesktop, { platform: "MacIntel", maxTouchPoints: 0 })).toEqual({ kind: "computer" });
  });

  it("Android and computers", () => {
    expect(installPlace(UA.androidChrome)).toEqual({ kind: "android" });
    expect(installPlace(UA.windowsChrome)).toEqual({ kind: "computer" });
  });
});

describe("the steps for each place", () => {
  const text = (html: string) => html.replace(/<svg[\s\S]*?<\/svg>/g, "").replace(/<[^>]+>/g, "");
  const steps = (ua: string, hints = {}) => installGuide(installPlace(ua, hints))!.steps.map(text);

  it("Safari 26: ⋯ (Más) at the bottom right, then Compartir, Agregar a inicio, Abrir como app web", () => {
    const guide = installGuide(installPlace(UA.safari26))!;
    expect(guide.pointer).toBe("bottom-right");
    expect(guide.copyLink).toBe(false);
    const [first, second, third] = guide.steps.map(text);
    expect(first).toMatch(/abajo a la derecha y luego Compartir/);
    expect(second).toMatch(/Agregar a inicio/);
    expect(third).toMatch(/Abrir como app web.*Agregar/);
  });

  it("Safari 18 and earlier: Compartir in the middle of the bottom bar", () => {
    const guide = installGuide(installPlace(UA.safari17))!;
    expect(guide.pointer).toBe("bottom-center");
    expect(guide.steps.map(text)).toEqual([
      "Toca Compartir en la barra de abajo, en el centro.",
      "Baja en el menú y elige Agregar a inicio.",
      "Toca Agregar (arriba a la derecha). Listo: Pa' Bailar queda en tu inicio.",
    ]);
  });

  it("iPad: Compartir at the top right, no arrow", () => {
    const guide = installGuide(installPlace(UA.ipadDesktop, { platform: "MacIntel", maxTouchPoints: 5 }))!;
    expect(guide.pointer).toBeNull();
    expect(text(guide.steps[0]!)).toBe("Toca Compartir arriba a la derecha.");
  });

  it("Chrome on iPhone: its own Compartir, then iOS's menu", () => {
    expect(steps(UA.chromeIos)[0]).toMatch(/Compartir junto a la dirección/);
    expect(steps(UA.chromeIos)[1]).toMatch(/Agregar a inicio/);
  });

  it("a browser that can't add pages, or another app's browser: open it in Safari, with the link to copy", () => {
    expect(installGuide(installPlace(UA.chromeIos162))).toMatchObject({ title: "Ábrela en Safari", copyLink: true });
    const inApp = installGuide(installPlace(UA.instagramIos))!;
    expect(inApp.copyLink).toBe(true);
    expect(inApp.steps.map(text).join(" ")).toMatch(/Abrir en el navegador \(Safari\)/);
  });

  it("nothing on a computer (only a browser that announces it can install there)", () => {
    expect(installGuide(installPlace(UA.windowsChrome))).toBeNull();
  });
});
