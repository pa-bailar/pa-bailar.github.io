// Installing the site on a phone, like an app (no app store): the manifest (pages/manifest.webmanifest.ts)
// and the service worker (pages/sw.js.ts) make it installable; this offers it, on every phone, from the
// first visit:
//   - Chrome/Edge that announce it (beforeinstallprompt): "Instalar" opens the browser's own dialog.
//   - Otherwise a sheet with the steps for where the visitor is (lib/installPlace.ts): iPhone, by browser
//     and iOS version (Safari 26: ⋯ → Compartir → Agregar a inicio; earlier: Compartir → Agregar a inicio),
//     with an arrow toward the browser's button; Android (menu ⋮ → Instalar aplicación); inside Instagram,
//     Facebook, TikTok…, which can't install (open it in the browser, or copy the link to paste it there).
//     The sheet stays open while the visitor taps the browser's buttons, so the steps are in view.
//   - On iPhone the page can't see the result: "Ya la agregué" hides the offer for good, and closing the
//     steps rests the banner like × does (the footer's link stays).
//   - The offer: a banner under the header on phones (× hides it for DISMISS_DAYS days) and a link in the
//     footer. Nothing once installed, or on a computer whose browser can't install.
//   - Installed, as far as the page can tell: opened as the app; or this browser saw it installed (the
//     app on Android shares the browser's storage, so opening it once is remembered); or Chrome on Android
//     says so (getInstalledRelatedApps, with the manifest's related_applications). Chrome offering to
//     install again (beforeinstallprompt) means it was uninstalled. iPhone keeps the home-screen app's
//     storage apart from Safari and has no way to ask, so there "×", the steps or "Ya la agregué" hide it.

import { byId } from "../lib/dom";
import { installGuide, installPlace } from "../lib/installPlace";
import { BASE_URL } from "../lib/links";
import { dismissSheet, initPanelSheet, openPanelSheet } from "../lib/sheet";

const DISMISS_KEY = "install-dismissed-at";
const INSTALLED_KEY = "installed";
const NUDGED_KEY = "install-nudged";
const NUDGE_SECONDS = 10;
const DISMISS_DAYS = 30;

/** Chrome's install event (not in TypeScript's DOM types yet). */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

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

const NOTE = "Pa' Bailar queda en tu pantalla de inicio y se abre como una app.";

const place = () => installPlace(navigator.userAgent, navigator);
const guide = () => installGuide(place());

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

const canOffer = () => !isInstalled() && (installEvent !== null || guide() !== null);

function render() {
  const offer = canOffer();
  document.querySelectorAll<HTMLElement>("[data-install-offer]").forEach((element) => (element.hidden = !offer));
  const banner = document.getElementById("install-banner");
  if (banner) banner.hidden = !offer || dismissedRecently();
}

function openSteps() {
  const steps = guide();
  if (!steps) return;
  byId("install-sheet-title").textContent = steps.title;
  byId("install-steps").innerHTML = steps.steps.map((step) => `<li>${step}</li>`).join("");
  const pointer = byId("install-pointer");
  pointer.hidden = !steps.pointer;
  pointer.dataset.at = steps.pointer ?? "";
  byId("install-copy").hidden = !steps.copyLink;
  byId("install-done").hidden = place().kind !== "ios" || steps.copyLink; // only where it can be added here
  byId("install-status").textContent = "";
  byId("install-note").textContent = steps.note ?? NOTE;
  openPanelSheet(byId<HTMLDialogElement>("install-sheet"));
}

/** The home page's address, for pasting it in the browser (apps' own browsers can't install). */
async function copyLink() {
  const url = new URL(BASE_URL, location.origin).href;
  let copied = false;
  try {
    await navigator.clipboard.writeText(url);
    copied = true;
  } catch {
    // No clipboard here (an old in-app browser, or not allowed): the link is shown to copy by hand.
  }
  byId("install-status").textContent = copied
    ? "Enlace copiado. Ábrelo en tu navegador y pégalo en la barra de direcciones."
    : `Copia este enlace: ${url}`;
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
    else if (target.closest("[data-install-copy]")) void copyLink();
    else if (target.closest("[data-install-done]")) {
      remember(INSTALLED_KEY, "1"); // iPhone can't tell: the visitor says so
      dismissSheet(byId<HTMLDialogElement>("install-sheet"));
      render();
    }
    else if (target.closest("[data-nudge-close]")) byId("install-nudge").hidden = true;
    else if (target.closest("[data-install-dismiss]")) {
      remember(DISMISS_KEY, String(Date.now()));
      render();
    }
  });
  const sheet = byId<HTMLDialogElement>("install-sheet");
  initPanelSheet(sheet);
  // Having seen the steps counts as an answer: the banner rests like after ×, and the footer's link stays.
  sheet.addEventListener("close", () => {
    remember(DISMISS_KEY, String(Date.now()));
    render();
  });
  render();
  void checkInstalled().then(render);
}

/**
 * After a save: whoever dismissed the banner gets one reminder, once, when they have two saved events
 * (a moment the app clearly helps; Google's advice is to offer again then, not to nag). It goes after
 * NUDGE_SECONDS.
 */
export function offerAfterSaving(savedCount: number) {
  if (!canOffer() || savedCount < 2 || !dismissedRecently() || stored(NUDGED_KEY)) return;
  remember(NUDGED_KEY, String(Date.now()));
  const nudge = byId("install-nudge");
  nudge.hidden = false;
  window.setTimeout(() => (nudge.hidden = true), NUDGE_SECONDS * 1000);
}

/** At most this many flyers sent to the worker (pages/sw.js.ts, SHOWN_IMAGES_LIMIT). */
const SHOWN_IMAGES_LIMIT = 60;

/** The flyers and thumbnails this page already loaded (this site's, once each), for the worker to store. */
export function shownImageUrls(
  images: Iterable<Pick<HTMLImageElement, "currentSrc" | "src" | "complete" | "naturalWidth">>,
  origin: string,
): string[] {
  const urls = new Set<string>();
  for (const image of images) {
    if (!image.complete || !image.naturalWidth) continue;
    const url = new URL(image.currentSrc || image.src, origin);
    if (url.origin === origin && /^\/(flyers|thumbs)\//.test(url.pathname)) urls.add(url.href);
  }
  return [...urls].slice(0, SHOWN_IMAGES_LIMIT);
}

/**
 * The service worker: offline copies and installability (pages/sw.js.ts). Only in the built site. On a first visit the
 * page loads before the worker controls it, so its flyers never go through it: once it takes over, it's sent them.
 */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  const workers = navigator.serviceWorker;
  if (!workers.controller) {
    const send = (images: Iterable<HTMLImageElement>) => {
      const urls = shownImageUrls(images, location.origin);
      if (urls.length) workers.controller?.postMessage({ type: "cache-images", urls });
    };
    workers.addEventListener(
      "controllerchange",
      () => {
        send(document.images);
        // Those still loading came from before it took over, so they don't go through it either: sent once loaded.
        for (const image of document.images) {
          if (!image.complete) image.addEventListener("load", () => send([image]), { once: true });
        }
      },
      { once: true },
    );
  }
  workers.register(`${import.meta.env.BASE_URL.replace(/\/?$/, "/")}sw.js`).catch(() => {
    // Not installable or not offline-ready this time: the site itself works the same.
  });
}
