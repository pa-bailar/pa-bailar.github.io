// "Este finde": the weekend the site shares on WhatsApp (pages/finde.jpg.ts, views/upcomingView.ts).
// Friday to Sunday of the current week (Friday night counts as weekend, as in the upcoming list); from
// Friday on, only what's left of it, from today.

import type { DanceEvent } from "../types";
import { addDays, endOfWeek } from "./dates";

export interface Weekend {
  start: string; // YYYY-MM-DD: Friday, or today if the weekend has started
  end: string; // the Sunday
}

export function weekendOf(today: string): Weekend {
  const end = endOfWeek(today);
  const friday = addDays(end, -2);
  return { start: today > friday ? today : friday, end };
}

/** The weekend's events, in date order (`events` must be sorted). */
export function weekendEvents(events: DanceEvent[], today: string): DanceEvent[] {
  const { start, end } = weekendOf(today);
  return events.filter((event) => event.date >= start && event.date <= end);
}
