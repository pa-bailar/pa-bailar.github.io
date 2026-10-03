// Instagram's own embed of a public post (https://developers.facebook.com/documentation/instagram-platform/oembed):
// the standard blockquote with the post's link, turned into Instagram's player by its embed.js. A video
// plays in place, and a carousel swipes through all its slides. It needs no API call and no token, only
// the link (Meta made embedding tokenless in June 2026).
// The script is Meta's and heavy, so it's loaded the first time a visitor asks to see a post, never with
// the page.

import { escapeHtml } from "./dom";

const SCRIPT_URL = "https://www.instagram.com/embed.js";
const TIMEOUT_MS = 10_000; // longer than this and our copy of the flyer stays, with the link to Instagram

interface InstagramEmbeds {
  Embeds: { process(): void };
}

declare global {
  interface Window {
    instgrm?: InstagramEmbeds;
  }
}

let script: Promise<void> | null = null;

/** embed.js, once per visit. A failed load (blocked, offline) can be tried again on the next post. */
function loadScript(): Promise<void> {
  script ??= new Promise<void>((resolve, reject) => {
    const element = document.createElement("script");
    element.src = SCRIPT_URL;
    element.async = true;
    element.onload = () => resolve();
    element.onerror = () => {
      element.remove();
      script = null;
      reject(new Error("Instagram's embed script didn't load"));
    };
    document.head.append(element);
  });
  return script;
}

/** "https://www.instagram.com/reel/abc/?igsh=…" → "https://www.instagram.com/reel/abc/". */
function canonicalLink(permalink: string): string {
  const url = new URL(permalink);
  return `${url.origin}${url.pathname.replace(/\/?$/, "/")}`;
}

/**
 * Shows the post in `holder` with Instagram's player. Resolves true once the player has loaded, false if
 * it couldn't: the script was blocked, the visitor is offline, or it took longer than TIMEOUT_MS. (An
 * account that disabled embedding shows Instagram's own notice inside the player, which can't be read
 * from here; the sheet's "Abrir en Instagram" covers it.)
 */
export async function renderInstagramPost(
  holder: HTMLElement,
  permalink: string,
  { captioned = true } = {},
): Promise<boolean> {
  const caption = captioned ? " data-instgrm-captioned" : "";
  holder.innerHTML = `<blockquote class="instagram-media" data-instgrm-permalink="${escapeHtml(canonicalLink(permalink))}" data-instgrm-version="14"${caption}></blockquote>`;
  try {
    await loadScript();
  } catch {
    return false;
  }
  window.instgrm?.Embeds.process();
  return new Promise<boolean>((resolve) => {
    const finish = (shown: boolean) => {
      observer.disconnect();
      clearTimeout(timer);
      resolve(shown);
    };
    const watch = () => {
      const iframe = holder.querySelector("iframe");
      if (!iframe) return;
      observer.disconnect();
      iframe.addEventListener("load", () => finish(true), { once: true });
    };
    const observer = new MutationObserver(watch);
    const timer = setTimeout(() => finish(false), TIMEOUT_MS);
    observer.observe(holder, { childList: true, subtree: true });
    watch();
  });
}
