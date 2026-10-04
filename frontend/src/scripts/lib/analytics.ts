// Visit statistics with GoatCounter (https://www.goatcounter.com): no cookies and no personal data, so
// no consent banner is needed. Page loads are counted by its script (layouts/BaseLayout.astro); this
// adds what a static page can't see on its own:
//   - each event opened (or swiped to) in the viewer, as a visit to that event's page;
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

/** A page seen without a page load (the event viewer changes the URL itself). */
export function trackPageview(path: string, title: string) {
  count({ path, title });
}

/**
 * Where an event's details were opened from: a tap on the card, its "Detalles" button, the line under it
 * ("Ver horario, precios y cómo llegar") or a shared link (/?evento=<id>).
 */
export type DetailsSource = "tarjeta" | "boton" | "linea" | "enlace";

const DETAILS_SOURCES: readonly DetailsSource[] = ["tarjeta", "boton", "linea", "enlace"];

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
