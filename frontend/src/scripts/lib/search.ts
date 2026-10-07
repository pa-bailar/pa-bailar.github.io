// Search over the events already in the page (no server): accent- and case-insensitive, every word of the search
// must be found in the event (title, academy, organizer, venue, area, artists, rhythms, activities, type, as the site
// shows them). "juanita bachata" finds Juanita Quintero's bachata events; "halloween" every Halloween social.
// A word is found at the start of one of the event's words, so a search typed halfway works ("bach") and "son" isn't
// found inside "Jason" or "casona"; inside an academy's handle too ("jaguar" finds @discojaguar.bta). Plurals find
// their singular ("talleres", "sociales"), and the Spanish a visitor may use finds the site's words for it (lib/
// searchWords.ts: "clase" finds the workshops, "milonga" the tango, "sin costo" the free events: the owner, 7 Oct
// 2026). "Free", however it's written, is "gratis", which an event whose card says "Gratis", or whose own words say
// free ("entrada libre"), gets too.
// Days are found by date, not in the words (lib/searchDays.ts: "hoy", "sábado", "este finde", "15 de octubre"…), and
// the words that only join others ("el", "de", "con") are left out ("clase de salsa el sábado").

import type { DanceEvent } from "../types";
import { daysFrom, todayIso } from "./dates";
import { FREE, priceSummary, styleLabel, typeLabel } from "./format";
import { daysAt, type DayTest } from "./searchDays";
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

/** A search, read: its parts (all needed) and the days it names (any of them). */
interface Query {
  terms: Term[];
  days: DayTest[];
}

// Words that only join others, left out unless the search is nothing else ("la" typed alone still finds "La Casona").
// And the words before a day: "este sábado", "el próximo viernes".
const JOINING = new Set("de del el la los las y o en con para por un una al a este esta proximo proxima".split(" "));

/** The known phrase starting at `words[at]`, longest first, and how many words it takes. */
function phraseAt(words: string[], at: number): [string, number] | null {
  for (let length = Math.min(LONGEST_PHRASE, words.length - at); length >= 2; length--) {
    const phrase = words.slice(at, at + length).join(" ");
    if (PHRASES.has(phrase)) return [phrase, length];
  }
  return null;
}

const wordTerm = (word: string): Term => {
  const forms = singulars(word);
  return { starts: forms, phrases: forms.flatMap(alsoFinds) };
};

/** A search, read: the days it names, known phrases whole ("sin costo", "cha cha cha"), every other word on its own. */
export function parseQuery(query: string, today: string): Query {
  const words = wordsOf(fold(query));
  const read: Query = { terms: [], days: [] };
  const joining: string[] = [];
  for (let at = 0; at < words.length; ) {
    const days = daysAt(words, at, today);
    const phrase = days ? null : phraseAt(words, at);
    if (days) {
      read.days.push(days[0]);
      at += days[1];
    } else if (phrase) {
      const [text, length] = phrase;
      read.terms.push({ starts: [], phrases: [text, ...alsoFinds(text)] });
      at += length;
    } else {
      const word = words[at]!;
      if (JOINING.has(word)) joining.push(word);
      else read.terms.push(wordTerm(word));
      at += 1;
    }
  }
  if (!read.terms.length && !read.days.length) read.terms = joining.map(wordTerm);
  return read;
}

let lastQuery: { text: string; today: string; read: Query } | null = null;

/** The search read once for all the events it's checked against. */
function readQuery(query: string, today: string): Query {
  if (lastQuery?.text !== query || lastQuery.today !== today) lastQuery = { text: query, today, read: parseQuery(query, today) };
  return lastQuery.read;
}

function hasTerm(event: Searchable, term: Term): boolean {
  return (
    term.starts.some((start) => event.account.includes(start) || event.words.some((word) => word.startsWith(start))) ||
    term.phrases.some((phrase) => event.text.includes(` ${phrase} `))
  );
}

/** True when every part of `query` is found in the event, on one of the days it names if any ("" matches everything). */
export function matchesQuery(event: DanceEvent, query: string, today = todayIso()): boolean {
  const { terms, days } = readQuery(query, today);
  if (days.length && !daysFrom(event, today).some((day) => days.some((test) => test(day)))) return false;
  if (!terms.length) return true;
  const found = searchableOf(event);
  return terms.every((term) => hasTerm(found, term));
}
