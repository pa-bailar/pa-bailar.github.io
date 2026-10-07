// Search over the events already in the page (no server): accent- and case-insensitive, every word of the search
// must be found in the event (title, academy, organizer, venue, area, artists, rhythms, activities, type, as the site
// shows them). "juanita bachata" finds Juanita Quintero's bachata events; "halloween" every Halloween social.
// A word is found at the start of one of the event's words, so a search typed halfway works ("bach") and "son" isn't
// found inside "Jason" or "casona"; inside an academy's handle too ("jaguar" finds @discojaguar.bta). Plurals find
// their singular ("talleres", "sociales"), and the Spanish a visitor may use finds the site's words for it (lib/
// searchWords.ts: "clase" finds the workshops, "milonga" the tango, "sin costo" the free events: the owner, 7 Oct
// 2026). "Free", however it's written, is "gratis", which an event whose card says "Gratis", or whose own words say
// free ("entrada libre"), gets too.

import type { DanceEvent } from "../types";
import { FREE, priceSummary, styleLabel, typeLabel } from "./format";
import { alsoFinds, FREE_PHRASES, FREE_WORD, PHRASES } from "./searchWords";

/** "Salsa Caleña" → "salsa calena": for comparing, never for showing. */
export function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/** A folded text's words: letters and digits ("#12-34" → 12, 34; "@esfera" → esfera; "cha-cha" → cha, cha). */
export function wordsOf(folded: string): string[] {
  return folded.split(/[^a-z0-9]+/).filter(Boolean);
}

const LONGEST_PHRASE = Math.max(...[...PHRASES].map((phrase) => phrase.split(" ").length));
const MIN_STEM = 4; // shorter singulars would start too many words ("dos" → "do")
const ES_PLURAL = /[lrndzjy]$/; // Spanish adds "-es" after these: taller → talleres, social → sociales

/** `word` and the singulars it may be the plural of: "talleres" → taller; "clases" → clase (not "clas"). */
export function singulars(word: string): string[] {
  const forms = [word];
  if (word.endsWith("s") && word.length - 1 >= MIN_STEM) forms.push(word.slice(0, -1));
  const stem = word.slice(0, -2);
  if (word.endsWith("es") && stem.length >= MIN_STEM && ES_PLURAL.test(stem)) forms.push(stem);
  return forms;
}

interface Searchable {
  words: string[];
  /** " word word … ": a whole word or phrase is " it " in here. */
  text: string;
  /** The handle, folded: also searched inside ("discojaguar.bta"). */
  account: string;
}

const searchable = new WeakMap<DanceEvent, Searchable>();

function searchableOf(event: DanceEvent): Searchable {
  let found = searchable.get(event);
  if (found === undefined) {
    const shown = [
      event.title,
      event.account,
      event.organizer,
      event.venue,
      event.address,
      event.area,
      typeLabel(event.event_type),
      ...event.styles.map(styleLabel),
      ...event.artists,
      ...event.activities,
    ];
    let text = ` ${wordsOf(fold(shown.filter(Boolean).join(" "))).join(" ")} `;
    const free = priceSummary(event) === FREE || FREE_PHRASES.some((phrase) => text.includes(` ${phrase} `));
    if (free) text += `${FREE_WORD} `;
    found = { words: text.trim().split(" "), text, account: fold(event.account) };
    searchable.set(event, found);
  }
  return found;
}

/** One part of a search: a typed word (or its singular) starting one of the event's words, or a whole phrase. */
interface Term {
  starts: string[];
  phrases: string[];
}

/** The known phrase starting at `words[at]`, longest first, and how many words it takes. */
function phraseAt(words: string[], at: number): [string, number] | null {
  for (let length = Math.min(LONGEST_PHRASE, words.length - at); length >= 2; length--) {
    const phrase = words.slice(at, at + length).join(" ");
    if (PHRASES.has(phrase)) return [phrase, length];
  }
  return null;
}

/** The parts of a search: known phrases whole ("sin costo", "cha cha cha"), every other word on its own. */
export function queryTerms(query: string): Term[] {
  const words = wordsOf(fold(query));
  const terms: Term[] = [];
  for (let at = 0; at < words.length; ) {
    const phrase = phraseAt(words, at);
    if (phrase) {
      const [text, length] = phrase;
      terms.push({ starts: [], phrases: [text, ...alsoFinds(text)] });
      at += length;
    } else {
      const forms = singulars(words[at]!);
      terms.push({ starts: forms, phrases: forms.flatMap(alsoFinds) });
      at += 1;
    }
  }
  return terms;
}

function hasTerm(event: Searchable, term: Term): boolean {
  return (
    term.starts.some((start) => event.account.includes(start) || event.words.some((word) => word.startsWith(start))) ||
    term.phrases.some((phrase) => event.text.includes(` ${phrase} `))
  );
}

/** True when every part of `query` is found in the event ("" matches everything). */
export function matchesQuery(event: DanceEvent, query: string): boolean {
  const terms = queryTerms(query);
  if (!terms.length) return true;
  const found = searchableOf(event);
  return terms.every((term) => hasTerm(found, term));
}
