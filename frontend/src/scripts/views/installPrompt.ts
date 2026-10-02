// Installing the site on a phone, like an app (no app store): the manifest (pages/manifest.webmanifest.ts)
// and the service worker (pages/sw.js.ts) make it installable; this offers it, on every phone, from the
// first visit:
//   - Chrome/Edge that announce it (beforeinstallprompt): "Instalar" opens the browser's own dialog.
//   - Otherwise a sheet with the steps for where the visitor is: iPhone (Compartir → Agregar a inicio),
//     Android (menu ⋮ → Instalar aplicación), or inside Instagram/WhatsApp/Facebook, which can't install
//     (open it in the browser first).
//   - The offer: a banner under the header on phones (× hides it for DISMISS_DAYS days) and a link in the
//     footer. Nothing once installed, or on a computer whose browser can't install.
//   - Installed, as far as the page can tell: opened as the app; or this browser saw it installed (the
//     app on Android shares the browser's storage, so opening it once is remembered); or Chrome on Android
//     says so (getInstalledRelatedApps, with the manifest's related_applications). Chrome offering to
//     install again (beforeinstallprompt) means it was uninstalled. iPhone keeps the home-screen app's
//     storage apart from Safari and has no way to ask, so there only "×" hides the banner.

import { byId } from "../lib/dom";
import { ICONS } from "../lib/icons";
import { initPanelSheet, openPanelSheet } from "../lib/sheet";

const DISMISS_KEY = "install-dismissed-at";
const INSTALLED_KEY = "installed";
const DISMISS_DAYS = 30;

/** Chrome's install event (not in TypeScript's DOM types yet). */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Place = "iphone" | "android" | "in-app" | "computer";

let installEvent: BeforeInstallPromptEvent | null = null;
let installedHere = false; // Chrome on Android says the app is installed

/** Running as the installed app (not in a browser tab). */
function isApp(): boolean {
  return (
    matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isInstalled(): boolean {
  return isApp() || installedHere || stored(INSTALLED_KEY) === "1";
}

function remember(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage unavailable: the page just can't remember it.
  }
}

/** Ask Chrome on Android whether the app is installed (other browsers can't tell). */
async function checkInstalled() {
  const getRelated = (navigator as Navigator & { getInstalledRelatedApps?: () => Promise<unknown[]> })
    .getInstalledRelatedApps;
  if (!getRelated) return;
  try {
    installedHere = (await getRelated.call(navigator)).length > 0;
  } catch {
    // Not allowed here: keep what's known.
  }
}

function place(): Place {
  const agent = navigator.userAgent;
  // Apps' own browsers (a link opened from Instagram, WhatsApp, Facebook) can't install pages.
  if (/Instagram|FBAN|FBAV|WhatsApp/i.test(agent)) return "in-app";
  // iPadOS reports itself as a Mac with a touch screen.
  if (/iPhone|iPad|iPod/.test(agent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "iphone";
  if (/Android/i.test(agent)) return "android";
  return "computer";
}

const STEPS: Record<Exclude<Place, "computer">, { title: string; steps: string[] }> = {
  iphone: {
    title: "Instalar en tu iPhone",
    steps: [
      `Toca <b>Compartir</b> <span class="install-sheet__share">${ICONS.share}</span>: abajo en Safari, arriba a la derecha en Chrome.`,
      "Elige <b>Agregar a inicio</b>.",
      "Toca <b>Agregar</b>.",
    ],
  },
  android: {
    title: "Instalar en tu celular",
    steps: [
      "Toca el menú <b>⋮</b> del navegador (arriba a la derecha).",
      "Elige <b>Instalar aplicación</b> o <b>Agregar a la pantalla principal</b>.",
      "Confirma con <b>Instalar</b>.",
    ],
  },
  "in-app": {
    title: "Ábrelo en tu navegador",
    steps: [
      "Estás viendo la página dentro de otra app, que no puede instalarla.",
      "Toca el menú <b>⋯</b> o <b>⋮</b> (arriba) y elige <b>Abrir en el navegador</b> (Chrome o Safari).",
      "Ahí toca <b>Instalar</b> en Pa' Bailar.",
    ],
  },
};

function stored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function dismissedRecently(): boolean {
  const at = Number(stored(DISMISS_KEY) ?? 0);
  return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

function render() {
  const canOffer = !isInstalled() && (installEvent !== null || place() !== "computer");
  document.querySelectorAll<HTMLElement>("[data-install-offer]").forEach((offer) => (offer.hidden = !canOffer));
  const banner = document.getElementById("install-banner");
  if (banner) banner.hidden = !canOffer || dismissedRecently();
}

function openSteps() {
  const where = place();
  if (where === "computer") return;
  const { title, steps } = STEPS[where];
  byId("install-sheet-title").textContent = title;
  byId("install-steps").innerHTML = steps.map((step) => `<li>${step}</li>`).join("");
  openPanelSheet(byId<HTMLDialogElement>("install-sheet"));
}

async function install() {
  if (!installEvent) return openSteps();
  const event = installEvent;
  installEvent = null; // used once: Chrome sends a new one if it can offer again
  await event.prompt();
  await event.userChoice;
}

export function initInstallPrompt() {
  if (isApp()) {
    remember(INSTALLED_KEY, "1"); // the browser on the same phone (Android) will know
    return;
  }
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault(); // our own offer instead of the browser's mini bar
    installEvent = event as BeforeInstallPromptEvent;
    // Chrome only offers this when the app isn't installed: if it was, it's been uninstalled.
    remember(INSTALLED_KEY, null);
    installedHere = false;
    render();
  });
  window.addEventListener("appinstalled", () => {
    installEvent = null;
    remember(INSTALLED_KEY, "1");
    render();
  });
  document.addEventListener("click", (domEvent) => {
    const target = domEvent.target as HTMLElement;
    if (target.closest("[data-install]")) void install().then(render);
    else if (target.closest("[data-install-dismiss]")) {
      remember(DISMISS_KEY, String(Date.now()));
      render();
    }
  });
  initPanelSheet(byId<HTMLDialogElement>("install-sheet"));
  render();
  void checkInstalled().then(render);
}

/** The service worker: offline copies and installability (pages/sw.js.ts). Only in the built site. */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL.replace(/\/?$/, "/")}sw.js`).catch(() => {
    // Not installable or not offline-ready this time: the site itself works the same.
  });
}
