// Search over the events already in the page (no server): accent- and case-insensitive, every word must
// appear somewhere in the event (title, academy, organizer, venue, area, artists, rhythms, activities, type).
// "juanita bachata" finds Juanita Quintero's bachata events; "halloween" every Halloween social.
// "Free", however it's written, is one word: "gratis", "gratuito", "sin costo", "entrada libre", "no cover"… in the
// search or in the event (its own text, or "Gratis" on its card) all mean "gratis", so "sin costo salsa" finds a
// social whose flyer said "entrada libre" (the owner, 7 Oct 2026: careful with the synonyms).

import type { DanceEvent } from "../types";
import { FREE, priceSummary, typeLabel } from "./format";

/** "Salsa Caleña" → "salsa calena": for comparing, never for showing. */
export function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/**
 * The ways of saying "free", folded: Spanish, and Bogotá nightlife's "cover" (the entry fee). Whole words only, the
 * longest first ("free cover" before "free"). "libre" alone isn't one ("estilo libre", "rumba libre").
 */
const FREE_PHRASES = [
  "gratis",
  "gratuito",
  "gratuita",
  "gratuitos",
  "gratuitas",
  "sin costo",
  "sin cover",
  "no cover",
  "free cover",
  "cover free",
  "entrada libre",
  "ingreso libre",
  "acceso libre",
  "free",
];
const FREE_PATTERN = [...FREE_PHRASES]
  .sort((a, b) => b.length - a.length)
  .map((phrase) => phrase.replace(/ /g, "\\s+"))
  .join("|");
const SAYS_FREE = new RegExp(`\\b(?:${FREE_PATTERN})\\b`);
const EVERY_FREE = new RegExp(SAYS_FREE.source, "g");
const FREE_WORD = "gratis";

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
        ...event.styles,
        ...event.artists,
        ...event.activities,
      ]
        .filter(Boolean)
        .join(" "),
    );
    // Its own words stay (a search typed halfway, "gratu", still finds "gratuito"); "gratis" is added.
    if (priceSummary(event) === FREE || SAYS_FREE.test(text)) text += ` ${FREE_WORD}`;
    searchable.set(event, text);
  }
  return text;
}

/** The words searched for: folded, every way of saying "free" made "gratis". */
export function queryWords(query: string): string[] {
  return fold(query).replace(EVERY_FREE, FREE_WORD).split(/\s+/).filter(Boolean);
}

/** True when every word of `query` appears in the event ("" matches everything). */
export function matchesQuery(event: DanceEvent, query: string): boolean {
  const words = queryWords(query);
  if (!words.length) return true;
  const text = searchText(event);
  return words.every((word) => text.includes(word.replace(/^@/, "")));
}
