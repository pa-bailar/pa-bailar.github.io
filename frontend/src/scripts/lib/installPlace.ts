// Where the visitor is, for installing the site (views/installPrompt.ts), and the steps for that place.
// Pure functions of the user agent, so they're tested (tests/installPlace.test.ts).
//
// iPhone has no install dialog: the page is added from the browser's share menu ("Agregar a inicio"), and
// where that menu is depends on the browser and the iOS version:
//   - Safari on iOS 27 (Safari 27, Sept 2026): the compact bar's bottom-right button became Tabs; Compartir is in
//     the page's menu, at the left of the address, or holding the address (Cult of Mac, "Safari in iOS 27"; not yet
//     seen here: no arrow until the iOS Simulator shows where it is).
//   - Safari on iOS 26 (Safari 26): the default "compact" bar hides Compartir under ⋯ (Más), at the bottom
//     right; with the top or bottom bar layouts, Compartir is in the bar. iOS 26 reports itself as iOS 18.6
//     in the user agent, so the version is Safari's own ("Version/26.0").
//   - Safari on iOS 18 and earlier: Compartir in the bottom bar, in the middle (iPad: at the top right).
//   - Chrome, Edge and Firefox on iOS 16.4 or later: Compartir next to the address, then the same menu.
//     Earlier, only Safari can add a page to the home screen.
//   - Apps' own browsers (a link opened in Instagram, Facebook, TikTok…) can't: open it in the browser first, in one
//     tap where the app lets a link do it (openInBrowser), else from the app's menu.
// Labels are iOS's in Spanish (Latin America): Compartir, Agregar a inicio, Agregar, Abrir como app web.

import { ICONS } from "./icons";

export type IosBrowser = "safari" | "chrome" | "edge" | "firefox" | "other";

export type InstallPlace =
  | { kind: "ios"; browser: IosBrowser; ipad: boolean; safariVersion: number; canAdd: boolean }
  | { kind: "in-app"; ios: boolean; app: "instagram" | "other" }
  | { kind: "android" }
  | { kind: "computer" };

/** Where the steps point: the browser's bar at the bottom of the screen (right or middle), or nowhere. */
export type Pointer = "bottom-right" | "bottom-center" | null;

export interface InstallGuide {
  title: string;
  steps: string[]; // HTML
  pointer: Pointer;
  copyLink: boolean; // offer "Copiar enlace" (to paste it in the browser)
  note?: string; // under the steps, instead of the usual "queda en tu pantalla de inicio…"
  open?: OpenInBrowser; // the one-tap way out of an app's browser, where there's one
}

/** A link out of an app's own browser to the phone's browser (openInBrowser). */
export interface OpenInBrowser {
  href: string;
  label: string;
}

export interface DeviceHints {
  platform?: string;
  maxTouchPoints?: number;
}

const IN_APP = /Instagram|FBAN|FBAV|FB_IAB|FBIOS|WhatsApp|musical_ly|BytedanceWebview|TikTok|Snapchat|\bLine\/|Twitter|LinkedInApp|Pinterest|GSA\//i; // GSA: the Google app

/** iOS version from the user agent ("OS 17_4"); 0 when it isn't there. */
function iosVersion(agent: string): number {
  const match = /OS (\d+)[_.](\d+)/.exec(agent);
  return match ? Number(match[1]) + Number(match[2]) / 100 : 0;
}

export function installPlace(agent: string, { platform = "", maxTouchPoints = 0 }: DeviceHints = {}): InstallPlace {
  // iPadOS asks for desktop sites: it says it's a Mac, but has a touch screen.
  const ipad = /iPad/.test(agent) || (/Macintosh/.test(agent) && (platform === "MacIntel" || platform === "") && maxTouchPoints > 1);
  const ios = ipad || /iPhone|iPod/.test(agent);
  if (IN_APP.test(agent)) return { kind: "in-app", ios, app: /Instagram/.test(agent) ? "instagram" : "other" };
  if (ios) {
    const browser: IosBrowser = /CriOS/.test(agent)
      ? "chrome"
      : /EdgiOS/.test(agent)
        ? "edge"
        : /FxiOS/.test(agent)
          ? "firefox"
          : /Version\/[\d.]+.*Safari\//.test(agent) && !/OPiOS|OPT\/|YaBrowser|DuckDuckGo/.test(agent)
            ? "safari"
            : "other";
    const safariVersion = browser === "safari" ? Number(/Version\/(\d+)/.exec(agent)?.[1] ?? 0) : 0;
    // Other browsers on iOS can add to the home screen since iOS 16.4. (iOS 26 says 18.6: fine here.)
    const version = iosVersion(agent);
    const canAdd = browser === "safari" || version === 0 || version >= 16.04;
    return { kind: "ios", browser, ipad, safariVersion, canAdd };
  }
  if (/Android/i.test(agent)) return { kind: "android" };
  return { kind: "computer" };
}

const b = (label: string) => `<b>${label}</b>`;
const key = (icon: string, label = "") =>
  `<span class="install-key">${icon}${label ? `<span>${label}</span>` : ""}</span>`;

const SHARE = key(ICONS.share, "Compartir");
const MORE = key(ICONS.more);
const ADD = key(ICONS.addSquare, "Agregar a inicio");
const LAST_STEP = `Toca ${b("Agregar")} (arriba a la derecha). Listo: Pa' Bailar queda en tu inicio.`;

const OPEN_IN_SAFARI: InstallGuide = {
  title: "Ábrela en Safari",
  steps: [`Toca ${b("Copiar enlace")} y pégalo en ${b("Safari")}.`, `Ahí toca ${b("Instalar")} en Pa' Bailar.`],
  pointer: null,
  copyLink: true,
  note: "Este navegador no puede agregar páginas al inicio del iPhone; Safari sí.",
};

/** The marker in the address of a page opened from an app's browser to install it (openInBrowser): the page takes it
 * off and offers the install again (views/installPrompt.ts). */
export const ARRIVAL = "instalar";

/** `href` without ARRIVAL, as a path, query and hash for history.replaceState; null when the marker isn't there. */
export function withoutArrival(href: string): string | null {
  const url = new URL(href);
  if (!url.searchParams.has(ARRIVAL)) return null;
  url.searchParams.delete(ARRIVAL);
  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * A link that opens `url` in the phone's browser from an app's own browser, in one tap. On Android, an intent link
 * (the default browser). On iPhone, only Instagram's own way out (instagram://extbrowser, undocumented: Instagram asks
 * to confirm, then Safari opens; seen working on 20 Sep 2026): x-safari-https stopped working in Meta's apps around
 * mid-2025 and TikTok refuses it, so the others have none and their steps point to the app's menu. The visitor taps it
 * (a link, not a script: the apps drop the same address set by a script).
 */
export function openInBrowser(place: InstallPlace, url: URL): OpenInBrowser | null {
  if (place.kind !== "in-app") return null;
  if (!place.ios) {
    return { href: `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=https;end`, label: "Abrir en el navegador" };
  }
  if (place.app === "instagram") {
    return { href: `instagram://extbrowser/?url=${encodeURIComponent(url.href)}`, label: "Abrir en Safari" };
  }
  return null;
}

/** An app's own browser: the way out to the phone's browser, in one tap where there's one (`here`: the page to open). */
function inAppGuide(place: Extract<InstallPlace, { kind: "in-app" }>, here?: URL): InstallGuide {
  const open = here ? openInBrowser(place, here) : null;
  const menu = place.ios
    ? `Toca ${MORE} arriba a la derecha y elige ${b("Abrir en el navegador")}`
    : `Toca ${b("⋮")} arriba a la derecha y elige ${b("Abrir en el navegador")}`;
  const steps = open
    ? [
        place.ios ? `Toca ${b(open.label)} y acepta salir de Instagram.` : `Toca ${b(open.label)}.`,
        `¿No se abrió? ${menu}, o copia el enlace y pégalo en ${place.ios ? b("Safari") : "tu navegador"}.`,
        place.ios ? "En Safari se abren solos los pasos para instalarla." : `Ahí toca ${b("Instalar")} en Pa' Bailar.`,
      ]
    : [
        `Toca ${MORE} o ${b("⋮")} arriba a la derecha y elige ${b("Abrir en el navegador")}${place.ios ? ` (${b("Safari")})` : ""}.`,
        `¿No aparece? Toca ${b("Copiar enlace")} y pégalo en ${place.ios ? b("Safari") : "tu navegador"}.`,
        `Ahí toca ${b("Instalar")} en Pa' Bailar.`,
      ];
  return {
    title: "Ábrela en tu navegador",
    steps,
    pointer: null,
    copyLink: true,
    note: "Instagram, Facebook y otras apps abren las páginas en su propio navegador, que no puede instalarlas.",
    ...(open && { open }),
  };
}

/** The steps for `place`, or null where there's nothing to do (a computer whose browser can't install). `here`: the page
 * an app's browser opens in the phone's browser (openInBrowser). */
export function installGuide(place: InstallPlace, here?: URL): InstallGuide | null {
  switch (place.kind) {
    case "in-app":
      return inAppGuide(place, here);
    case "android":
      return {
        title: "Instalar en tu celular",
        steps: [
          `Toca el menú ${b("⋮")} del navegador (arriba a la derecha).`,
          `Elige ${b("Instalar aplicación")} o ${b("Agregar a la pantalla principal")}.`,
          `Confirma con ${b("Instalar")}.`,
        ],
        pointer: null,
        copyLink: false,
      };
    case "computer":
      return null;
    case "ios":
      break;
  }
  if (!place.canAdd) return OPEN_IN_SAFARI;
  const title = place.ipad ? "Instálala en tu iPad" : "Instálala en tu iPhone";
  if (place.browser === "safari") {
    if (place.ipad) {
      return {
        title,
        steps: [`Toca ${SHARE} arriba a la derecha.`, `Elige ${ADD}.`, LAST_STEP],
        pointer: null,
        copyLink: false,
      };
    }
    if (place.safariVersion >= 27) {
      return {
        title,
        steps: [
          `Toca el botón de la página, a la izquierda de la dirección, y luego ${SHARE}.<small>¿No lo ves? Mantén presionada la dirección.</small>`,
          `Baja en el menú y elige ${ADD}. Si no está, toca ${b("Ver más")}.`,
          `Deja activado ${b("Abrir como app web")} y toca ${b("Agregar")}. Listo: queda en tu inicio.`,
        ],
        pointer: null,
        copyLink: false,
      };
    }
    if (place.safariVersion >= 26) {
      return {
        title,
        steps: [
          `Toca ${MORE} abajo a la derecha y luego ${SHARE}.<small>¿Ya ves Compartir en la barra? Tócalo directo.</small>`,
          `Baja en el menú y elige ${ADD}. Si no está, toca ${b("Ver más")}.`,
          `Deja activado ${b("Abrir como app web")} y toca ${b("Agregar")}. Listo: queda en tu inicio.`,
        ],
        pointer: "bottom-right",
        copyLink: false,
      };
    }
    return {
      title,
      steps: [`Toca ${SHARE} en la barra de abajo, en el centro.`, `Baja en el menú y elige ${ADD}.`, LAST_STEP],
      pointer: "bottom-center",
      copyLink: false,
    };
  }
  // Chrome, Edge, Firefox… on iOS 16.4 or later: their own share button, then iOS's menu.
  const where =
    place.browser === "chrome"
      ? "junto a la dirección (o en el menú ⋯)"
      : place.browser === "edge" || place.browser === "firefox"
        ? `en el menú ${b("☰")} o ${b("⋯")} del navegador`
        : "en el menú del navegador";
  return {
    title,
    steps: [`Toca ${SHARE} ${where}.`, `Baja en el menú y elige ${ADD}.`, LAST_STEP],
    pointer: null,
    copyLink: false,
  };
}
