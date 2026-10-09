// Installing the site on a phone, like an app (no app store): the manifest (pages/manifest.webmanifest.ts)
// and the service worker (pages/sw.js.ts) make it installable; this offers it, on every phone, from the
// first visit:
//   - Chrome/Edge that announce it (beforeinstallprompt): "Instalar" opens the browser's own dialog.
//   - Otherwise a sheet with the steps for where the visitor is (lib/installPlace.ts): iPhone, by browser
//     and iOS version (Safari 27: the page's menu → Compartir; Safari 26: ⋯ → Compartir; earlier: Compartir; then
//     Agregar a Inicio, under Ver más on 26 and 27),
//     with an arrow toward the browser's button; Android (menu ⋮ → Instalar aplicación); inside Instagram,
//     Facebook, TikTok…, which can't install (open it in the browser, or copy the link to paste it there). Where an
//     app lets a link do it, "Abrir en Safari" / "Abrir en el navegador" opens the page there in one tap, marked
//     (ARRIVAL): the browser's page offers the install again, and on iPhone opens its steps by itself.
//     The sheet stays open while the visitor taps the browser's buttons, so the steps are in view. Safari 26 and 27
//     on iPhone get the steps as a clip, big, and the buttons to tap beside it, one per line, no written steps (the
//     owner, 8 Oct 2026: visitors look, they don't read). The clip loads when the sheet opens and is dropped when it
//     closes, never stored by the service worker; with reduced motion, its poster only.
//   - On iPhone the page can't see the result: "Ya la agregué" hides the offer for good, and closing the
//     steps rests the banner like × does (the footer's link stays).
//   - The offer: a banner under the header on phones (× hides it for DISMISS_DAYS days) and a link in the
//     footer. Nothing once installed, or on a computer whose browser can't install. On iPhone and iPad the footer's
//     link is "Cómo instalar Pa' Bailar en tu iPhone" instead, always there (outside the installed app): the page can't
//     tell it was added, so after "Ya la agregué" (by mistake, say) or the steps closed, the steps stay one tap away
//     (the owner, 8 Oct 2026).
//   - Installed, as far as the page can tell: opened as the app; or this browser saw it installed (the
//     app on Android shares the browser's storage, so opening it once is remembered); or Chrome on Android
//     says so (getInstalledRelatedApps, with the manifest's related_applications). Chrome offering to
//     install again (beforeinstallprompt) means it was uninstalled. iPhone keeps the home-screen app's
//     storage apart from Safari and has no way to ask, so there "×", the steps or "Ya la agregué" hide it.

import { byId, prefersReducedMotion } from "../lib/dom";
import {
  ARRIVAL,
  howToInstallLabel,
  installGuide,
  reminderText,
  installPlace,
  withoutArrival,
  type InstallClip,
} from "../lib/installPlace";
import { savedIds } from "../lib/saved";
import { savedMove, type SavedMove } from "../lib/savedMove";
import { storedSwitch } from "../lib/storedSwitch";
import { storedValue } from "../lib/storedValue";
import { BASE_URL } from "../lib/links";
import { dismissSheet, initPanelSheet, openPanelSheet } from "../lib/sheet";
import { showNotice } from "./notice";

// Kept in this browser (blocked storage: for this visit, or not at all): when the banner was dismissed, whether the
// app is installed ("1"), when the reminder after saving was shown.
const dismissedAt = storedValue("install-dismissed-at");
const installedHere = storedSwitch("installed");
const nudgedAt = storedValue("install-nudged");
const NUDGE_SECONDS = 10;
const DISMISS_DAYS = 30;
const DISMISS_MS = DISMISS_DAYS * 24 * 60 * 60 * 1000;
/** When this page opened: an answer given since (the banner's ×, the steps closed) holds for the rest of the visit. */
const OPENED_AT = Date.now();

/** Chrome's install event (not in TypeScript's DOM types yet). */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let installEvent: BeforeInstallPromptEvent | null = null;
let relatedInstalled = false; // Chrome on Android says the app is installed
let arrived = false; // opened from an app's browser to install (ARRIVAL): the banner shows even if dismissed

/** Running as the installed app (not in a browser tab). */
function isApp(): boolean {
  return (
    matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isInstalled(): boolean {
  return isApp() || relatedInstalled || installedHere.on();
}

/** Ask Chrome on Android whether the app is installed (other browsers can't tell). */
async function checkInstalled() {
  const getRelated = (navigator as Navigator & { getInstalledRelatedApps?: () => Promise<unknown[]> })
    .getInstalledRelatedApps;
  if (!getRelated) return;
  try {
    relatedInstalled = (await getRelated.call(navigator)).length > 0;
  } catch {
    // Not allowed here: keep what's known.
  }
}

const NOTE = "Pa' Bailar queda en tu pantalla de inicio y se abre como una app.";

const place = () => installPlace(navigator.userAgent, navigator);
/** The home page, marked, for an app's browser to open in the phone's browser (installPlace.ts openInBrowser). */
const arrivalUrl = () => new URL(`${BASE_URL}?${ARRIVAL}`, location.origin);
const guide = () => installGuide(place(), arrivalUrl());

/** Whether the saves can be copied for the installed app here (Safari on iPhone) or pasted from Safari (the app). */
export const savedMoveHere = (): SavedMove => savedMove(place(), isApp());

/** Inside an app's own browser (Instagram, Facebook, TikTok…), where saved events stay apart from the phone's browser. */
export const inAppBrowser = () => place().kind === "in-app";

/** When the banner was last dismissed (0: never, or unreadable). */
const dismissedTime = () => Number(dismissedAt.get() ?? 0) || 0;

const dismissedRecently = () => Date.now() - dismissedTime() < DISMISS_MS;

const canOffer = () => !isInstalled() && (installEvent !== null || guide() !== null);

function render() {
  const offer = canOffer();
  const howTo = howToInstallLabel(place());
  document.querySelectorAll<HTMLElement>("[data-install-offer]").forEach((element) => (element.hidden = !offer || !!howTo));
  document.querySelectorAll<HTMLElement>("[data-install-howto]").forEach((element) => {
    element.hidden = !howTo;
    if (howTo) element.querySelector("button")!.textContent = howTo;
  });
  const banner = document.getElementById("install-banner");
  if (banner) banner.hidden = !offer || (dismissedRecently() && !arrived);
}

/** The sheet with the steps for where the visitor is (also "Ábrela en tu navegador" after a save: saveNotice.ts). */
export function showInstallSteps() {
  const steps = guide();
  if (!steps) return;
  byId("install-sheet-title").textContent = steps.title;
  const list = byId("install-steps");
  list.innerHTML = steps.steps.map((step) => `<li>${step}</li>`).join("");
  // With the clip: the clip and the taps beside it, then only "Ya la agregué" (under the clip, not beside the taps, so
  // it isn't tapped by the way: the owner, 8 Oct 2026) and the arrow.
  byId("install-sheet").classList.toggle("install-sheet--watch", Boolean(steps.taps));
  byId("install-watch").hidden = !steps.taps;
  byId("install-taps").innerHTML = (steps.taps ?? []).map((tap) => `<li>${tap}</li>`).join("");
  list.hidden = steps.steps.length === 0;
  const pointer = byId("install-pointer");
  pointer.hidden = !steps.pointer;
  pointer.dataset.at = steps.pointer ?? "";
  const open = byId<HTMLAnchorElement>("install-open");
  open.hidden = !steps.open;
  open.href = steps.open?.href ?? "";
  open.textContent = steps.open?.label ?? "";
  byId("install-copy").hidden = !steps.copyLink;
  byId("install-done").hidden = place().kind !== "ios" || steps.copyLink; // only where it can be added here
  // With saves, on iPhone: copy them now for the app, which starts with none of them (lib/savedMove.ts). Counted
  // as Guardados shows them: ids of events gone from the data said "Copiar mis 5" over 3 saves (8 Oct 2026).
  const saves = savedIds().filter(known).length;
  const copySaved = byId("install-copy-saved");
  copySaved.hidden = savedMoveHere() !== "copy" || steps.copyLink || saves === 0;
  copySaved.textContent = saves === 1 ? "Copiar mi guardado para la app" : `Copiar mis ${saves} guardados para la app`;
  byId("install-status").textContent = "";
  const note = byId("install-note");
  note.textContent = steps.note ?? NOTE;
  note.hidden = Boolean(steps.taps); // the clip ends on the home screen with the icon
  showClip(steps.clip);
  openPanelSheet(byId<HTMLDialogElement>("install-sheet"));
}

/** The steps' clip (pages/install/[name].ts), or none. Its address is set only now, so it loads only when asked for;
 * with reduced motion, the poster alone (a still of the step that differs: the menu with Compartir). */
function showClip(clip: InstallClip | undefined) {
  const video = byId<HTMLVideoElement>("install-clip");
  video.hidden = !clip;
  if (!clip) return dropClip();
  video.poster = `${BASE_URL}install/${clip}.jpg`;
  if (prefersReducedMotion()) return dropClip();
  const src = `${BASE_URL}install/${clip}.mp4`;
  if (video.getAttribute("src") !== src) video.src = src;
}

/** Stops the clip and its download (the sheet closed, or no clip to play). */
function dropClip() {
  const video = byId<HTMLVideoElement>("install-clip");
  if (!video.hasAttribute("src")) return;
  video.pause();
  video.removeAttribute("src");
  video.load();
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
  if (!installEvent) return showInstallSteps();
  const event = installEvent;
  installEvent = null; // used once: Chrome sends a new one if it can offer again
  await event.prompt();
  await event.userChoice;
}

/** Whether an id is an event in the data (main.ts): the saves to copy are counted as Guardados shows them. */
let known: (id: string) => boolean = () => true;

export function initInstallPrompt(isKnown: (id: string) => boolean = known) {
  known = isKnown;
  const unmarked = withoutArrival(location.href);
  if (unmarked !== null) {
    arrived = true;
    history.replaceState(history.state, "", unmarked); // not again on a reload, nor in a link shared from here
  }
  if (isApp()) {
    installedHere.set(true); // the browser on the same phone (Android) will know
    return;
  }
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault(); // our own offer instead of the browser's mini bar
    installEvent = event as BeforeInstallPromptEvent;
    // Chrome only offers this when the app isn't installed: if it was, it's been uninstalled.
    installedHere.set(false);
    relatedInstalled = false;
    render();
  });
  window.addEventListener("appinstalled", () => {
    installEvent = null;
    installedHere.set(true);
    render();
  });
  document.addEventListener("click", (domEvent) => {
    const target = domEvent.target as HTMLElement;
    if (target.closest("[data-install]")) void install().then(render);
    else if (target.closest("[data-install-copy]")) void copyLink();
    else if (target.closest("[data-install-done]")) {
      installedHere.set(true); // iPhone can't tell: the visitor says so
      dismissSheet(byId<HTMLDialogElement>("install-sheet"));
      render();
    }
    else if (target.closest("[data-install-dismiss]")) {
      dismissedAt.set(String(Date.now()));
      render();
    }
  });
  const sheet = byId<HTMLDialogElement>("install-sheet");
  initPanelSheet(sheet);
  // Having seen the steps counts as an answer: the banner rests like after ×, and the footer's link stays.
  sheet.addEventListener("close", () => {
    dismissedAt.set(String(Date.now()));
    dropClip();
    render();
  });
  render();
  void checkInstalled().then(render);
}

/**
 * Once the page has started (main.ts, after the screens' history: the sheet takes a history entry), for whoever came
 * from an app's browser to install: on iPhone the steps open by themselves; elsewhere the banner's "Instalar" is back
 * (Chrome's own dialog wants a tap of the visitor's, so it can't open by itself).
 */
export function stepsOnArrival() {
  if (arrived && canOffer() && place().kind === "ios") showInstallSteps();
}

interface ReminderMoment {
  /** Saved events to come, this save included. */
  savedCount: number;
  /** When the banner was last dismissed (0: never). */
  dismissedAt: number;
  /** Reminded already. */
  nudged: boolean;
  /** When this page opened. */
  openedAt: number;
  now: number;
}

/**
 * Whether a save brings the one reminder: two saved events or more, never reminded, and the banner dismissed (still
 * resting: DISMISS_DAYS) on an earlier visit. Not in the visit it was dismissed or the steps were closed: that answer
 * holds for the visit (the bug hunt of 7 Oct 2026: it came right after the steps were closed). Pure (tested).
 */
export function reminderDue({ savedCount, dismissedAt, nudged, openedAt, now }: ReminderMoment): boolean {
  return savedCount >= 2 && !nudged && dismissedAt > 0 && dismissedAt < openedAt && now - dismissedAt < DISMISS_MS;
}

/**
 * After a new save (its "Guardado": lib/saveNotice.ts reminderMayReplace): whoever dismissed the banner on an earlier
 * visit gets one reminder, once, when they have two saved events (a moment the app clearly helps; Google's advice is to
 * offer again then, not to nag). It takes the place of the save's own notice (views/notice.ts) for NUDGE_SECONDS.
 */
export function offerAfterSaving(savedCount: number) {
  const moment = { savedCount, dismissedAt: dismissedTime(), nudged: Boolean(nudgedAt.get()), openedAt: OPENED_AT };
  if (!canOffer() || !reminderDue({ ...moment, now: Date.now() })) return;
  const reminder = { label: "Instalar", run: () => void install().then(render), track: "instalar" };
  if (showNotice(reminderText(place()), reminder, { seconds: NUDGE_SECONDS, closable: true })) {
    nudgedAt.set(String(Date.now()));
  }
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
