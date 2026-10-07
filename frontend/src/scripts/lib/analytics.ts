// Visit statistics with GoatCounter (https://www.goatcounter.com): no cookies and no personal data, so
// no consent banner is needed. Page loads are counted by its script (layouts/BaseLayout.astro); this
// adds what a static page can't see on its own:
//   - each event opened in the details drawer, as a visit to that event's page (`seenCounter`: once while it stays
//     open; one the side panel only passes, following the keyboard, once it stayed on for 2 s);
//   - clicks on the actions marked with data-track="<name>" (Instagram, WhatsApp, sharing…);
//   - an event's details opened, by where they were opened from ("detalles-tarjeta"…, `detailsEventName`).
// GoatCounter ignores localhost, so local testing isn't counted. If its script is blocked, nothing breaks.

interface GoatCounter {
  count(vars: { path: string; title?: string; event?: boolean }): void;
}

declare global {
  interface Window {
    goatcounter?: GoatCounter;
  }
}

function count(vars: { path: string; title?: string; event?: boolean }) {
  try {
    window.goatcounter?.count(vars);
  } catch {
    // Statistics must never break the page.
  }
}

/** A page seen without a page load (the details drawer changes the URL itself). */
export function trackPageview(path: string, title: string) {
  count({ path, title });
}

/** How long something shown in passing has to stay on screen to count as seen (ms). */
export const SEEN_AFTER_MS = 2000;

/**
 * Counts what a visitor looks at, once while it stays shown. Opened on purpose (a tap, Enter, a link), it counts at
 * once. Shown in passing (the side panel following the keyboard's arrows or Tab through the list), it counts only if
 * it's still the one shown after `seenAfterMs`: read, not walked past. `hide()` when nothing is shown any more.
 * `show` says whether it counted the item right then.
 */
export function seenCounter<T extends { id: string }>(onSeen: (item: T) => void, seenAfterMs = SEEN_AFTER_MS) {
  let shown: string | null = null;
  let counted: string | null = null; // shown again (Enter on the event the panel already shows): not twice
  let timer: ReturnType<typeof setTimeout> | undefined;
  const seen = (item: T) => {
    counted = item.id;
    onSeen(item);
  };
  return {
    show(item: T, { passing }: { passing: boolean }): boolean {
      clearTimeout(timer);
      shown = item.id;
      if (counted === item.id) return false;
      if (!passing) {
        seen(item);
        return true;
      }
      timer = setTimeout(() => {
        if (shown === item.id) seen(item);
      }, seenAfterMs);
      return false;
    },
    hide() {
      clearTimeout(timer);
      shown = null;
      counted = null;
    },
  };
}

/**
 * Where an event's details were opened from: a tap on the card, its "Detalles" button or a shared link
 * (/?evento=<id>). Retired: "linea", the line that ended each card until October 2026 ("detalles-linea" in the
 * statistics before then).
 */
export type DetailsSource = "tarjeta" | "boton" | "enlace";

const DETAILS_SOURCES: readonly DetailsSource[] = ["tarjeta", "boton", "enlace"];

/** The GoatCounter event for details opened from `source` ("detalles-boton"); an unknown source counts as the card. */
export function detailsEventName(source: string | undefined): string {
  const known = DETAILS_SOURCES.find((item) => item === source);
  return `detalles-${known ?? "tarjeta"}`;
}

/** An event (not a page view) named `name`, like the clicks: "detalles-boton". */
export function trackEvent(name: string) {
  count({ path: name, title: name, event: true });
}

/** Clicks on elements with data-track="<name>", counted as events named "click-<name>". */
export function initClickTracking() {
  document.addEventListener("click", (domEvent) => {
    const tracked = (domEvent.target as HTMLElement).closest<HTMLElement>("[data-track]");
    if (tracked) count({ path: `click-${tracked.dataset.track}`, title: tracked.dataset.track, event: true });
  });
}
