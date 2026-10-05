// The events as the home page embeds them (<script type="application/json" id="events-data">, HomePage.astro), which
// main.ts reads. Build time only.

import type { DanceEvent } from "./scripts/types";
import { jsValue } from "./csp";

/**
 * The events as JSON for the page: without `doubts` (the extraction's notes on what it assumed, which the site never
 * shows: data/events.json keeps them), and with "<" escaped so a caption can never end the script block early
 * (`jsValue`).
 */
export function pageEventsJson(events: DanceEvent[]): string {
  return jsValue(events.map(({ doubts: _doubts, ...event }) => event));
}
