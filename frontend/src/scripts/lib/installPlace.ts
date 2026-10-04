// Where the visitor is, for installing the site (views/installPrompt.ts), and the steps for that place.
// Pure functions of the user agent, so they're tested (tests/installPlace.test.ts).
//
// iPhone has no install dialog: the page is added from the browser's share menu ("Agregar a inicio"), and
// where that menu is depends on the browser and the iOS version:
//   - Safari on iOS 26 (Safari 26): the default "compact" bar hides Compartir under ⋯ (Más), at the bottom
//     right; with the top or bottom bar layouts, Compartir is in the bar. iOS 26 reports itself as iOS 18.6
//     in the user agent, so the version is Safari's own ("Version/26.0").
//   - Safari on iOS 18 and earlier: Compartir in the bottom bar, in the middle (iPad: at the top right).
//   - Chrome, Edge and Firefox on iOS 16.4 or later: Compartir next to the address, then the same menu.
//     Earlier, only Safari can add a page to the home screen.
//   - Apps' own browsers (a link opened in Instagram, Facebook, TikTok…) can't: open it in the browser first.
// Labels are iOS's in Spanish (Latin America): Compartir, Agregar a inicio, Agregar, Abrir como app web.

import { ICONS } from "./icons";

export type IosBrowser = "safari" | "chrome" | "edge" | "firefox" | "other";

export type InstallPlace =
  | { kind: "ios"; browser: IosBrowser; ipad: boolean; safariVersion: number; canAdd: boolean }
  | { kind: "in-app"; ios: boolean }
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
  if (IN_APP.test(agent)) return { kind: "in-app", ios };
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

/** The steps for `place`, or null where there's nothing to do (a computer whose browser can't install). */
export function installGuide(place: InstallPlace): InstallGuide | null {
  switch (place.kind) {
    case "in-app":
      return {
        title: "Ábrela en tu navegador",
        steps: [
          `Toca ${MORE} o ${b("⋮")} arriba a la derecha y elige ${b("Abrir en el navegador")}${place.ios ? ` (${b("Safari")})` : ""}.`,
          `¿No aparece? Toca ${b("Copiar enlace")} y pégalo en ${place.ios ? b("Safari") : "tu navegador"}.`,
          `Ahí toca ${b("Instalar")} en Pa' Bailar.`,
        ],
        pointer: null,
        copyLink: true,
        note: "Instagram, Facebook y otras apps abren las páginas en su propio navegador, que no puede instalarlas.",
      };
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
