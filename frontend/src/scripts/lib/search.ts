// Search over the events already in the page (no server): accent- and case-insensitive, every word must
// appear somewhere in the event (title, academy, organizer, venue, area, artists, rhythms, activities, type, and
// "gratis" when its card says so). "juanita bachata" finds Juanita Quintero's bachata events; "halloween" every
// Halloween social; "gratis salsa" the free salsa ones.

import type { DanceEvent } from "../types";
import { FREE, priceSummary, typeLabel } from "./format";

/** "Salsa Caleña" → "salsa calena": for comparing, never for showing. */
export function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

const searchable = new WeakMap<DanceEvent, string>();

function searchText(event: DanceEvent): string {
  let text = searchable.get(event);
  if (text === undefined) {
    text = fold(
      [
        event.title,
        event.account,
        event.organizer,
        event.venue,
        event.address,
        event.area,
        typeLabel(event.event_type),
        // The card's "Gratis" (the lowest price free), with its other word: the Instagram audit, 7 Oct 2026.
        priceSummary(event) === FREE && "gratis gratuito",
        ...event.styles,
        ...event.artists,
        ...event.activities,
      ]
        .filter(Boolean)
        .join(" "),
    );
    searchable.set(event, text);
  }
  return text;
}

/** True when every word of `query` appears in the event ("" matches everything). */
export function matchesQuery(event: DanceEvent, query: string): boolean {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const text = searchText(event);
  return words.every((word) => text.includes(word.replace(/^@/, "")));
}
