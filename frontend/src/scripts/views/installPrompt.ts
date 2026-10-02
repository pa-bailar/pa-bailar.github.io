// Installing the site on a phone, like an app (no app store): the manifest (pages/manifest.webmanifest.ts)
// and the service worker (pages/sw.js.ts) make it installable; this offers it.
//   - Android and desktop Chrome/Edge announce it (beforeinstallprompt): "Instalar" opens the browser's own
//     install dialog.
//   - iPhone and iPad don't: "Instalar" opens a sheet with the steps (Compartir → Agregar a inicio).
//   - The offer: a banner under the header from the second visit on, until "×" (then not for
//     DISMISS_DAYS days), and a link in the footer while installing is possible. Nothing once installed.

import { byId } from "../lib/dom";
import { openPanelSheet, initPanelSheet } from "../lib/sheet";

const VISITS_KEY = "visits";
const DISMISS_KEY = "install-dismissed-at";
const DISMISS_DAYS = 30;

/** Chrome's install event (not in TypeScript's DOM types yet). */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let installEvent: BeforeInstallPromptEvent | null = null;

function isInstalled(): boolean {
  return matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** iPhone or iPad (iPadOS reports itself as a Mac with a touch screen). */
function isAppleMobile(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function stored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable: the banner just comes back next visit.
  }
}

/** Counted once per visit (a tab session), not per page. */
function visitCount(): number {
  let visits = Number(stored(VISITS_KEY) ?? 0);
  try {
    if (!sessionStorage.getItem(VISITS_KEY)) {
      sessionStorage.setItem(VISITS_KEY, "1");
      store(VISITS_KEY, String(++visits));
    }
  } catch {
    // Storage unavailable: treat it as a first visit.
  }
  return visits;
}

function dismissedRecently(): boolean {
  const at = Number(stored(DISMISS_KEY) ?? 0);
  return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

function render(visits: number) {
  const canInstall = !isInstalled() && (installEvent !== null || isAppleMobile());
  document.querySelectorAll<HTMLElement>("[data-install-offer]").forEach((offer) => (offer.hidden = !canInstall));
  const banner = document.getElementById("install-banner");
  if (banner) banner.hidden = !canInstall || visits < 2 || dismissedRecently();
}

async function install() {
  if (installEvent) {
    const event = installEvent;
    await event.prompt();
    await event.userChoice;
    installEvent = null; // used once: Chrome sends a new one if it can offer again
  } else if (isAppleMobile()) {
    openPanelSheet(byId<HTMLDialogElement>("install-sheet"));
  }
}

export function initInstallPrompt() {
  if (isInstalled()) return;
  const visits = visitCount();
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault(); // our own offer instead of the browser's mini bar
    installEvent = event as BeforeInstallPromptEvent;
    render(visits);
  });
  window.addEventListener("appinstalled", () => {
    installEvent = null;
    render(visits);
  });
  document.addEventListener("click", (domEvent) => {
    const target = domEvent.target as HTMLElement;
    if (target.closest("[data-install]")) void install().then(() => render(visits));
    else if (target.closest("[data-install-dismiss]")) {
      store(DISMISS_KEY, String(Date.now()));
      render(visits);
    }
  });
  const sheet = document.getElementById("install-sheet");
  if (sheet instanceof HTMLDialogElement) initPanelSheet(sheet);
  render(visits);
}

/** The service worker: offline copies and installability (pages/sw.js.ts). Only in the built site. */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL.replace(/\/?$/, "/")}sw.js`).catch(() => {
    // Not installable or not offline-ready this time: the site itself works the same.
  });
}
