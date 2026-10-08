// Search over the events already in the page (no server): accent- and case-insensitive, every word of the search
// must be found in the event (title, academy, organizer, venue, area, artists, rhythms, activities, type, as the site
// shows them). "juanita bachata" finds Juanita Quintero's bachata events; "halloween" every Halloween social.
// A word is found at the start of one of the event's words, so a search typed halfway works ("bach") and "son" isn't
// found inside "Jason" or "casona"; inside an academy's handle too, where its words run together ("jaguar" finds
// @discojaguar.bta). Plurals find their singular ("talleres", "sociales"), and the Spanish a visitor may use finds the
// site's words for it (lib/searchWords.ts: "clase" finds the workshops, "milonga" the tango, "sin costo" the free
// events: the owner, 7 Oct 2026). "Free", however it's written, is "gratis", which an event whose card says "Gratis",
// or whose own words say free ("entrada libre"), gets too.
// Whole, where a word's start would find too much (the bug hunt of 7 Oct 2026): a number ("calle 7" isn't Calle 73),
// a letter after other words ("zona t" isn't Zona 6 at Tributo), a singular ("andres" isn't Andrea). Inside a handle,
// only a name of five letters or more, never the search's own words ("banda" isn't @proyectourbandance, nor
// "competencia" @jaleocompetencia_).
// Days are found by date, not in the words (lib/searchDays.ts: "hoy", "sábado", "este finde", "15 de octubre"…): they
// narrow the days an event is shown on, as "Cuándo" does (state.ts shownDays). The words that only join others ("el",
// "de", "con") are left out ("clase de salsa el sábado").

import type { DanceEvent } from "../types";
import { todayIso } from "./dates";
import { FREE, priceSummary, styleLabel, typeLabel } from "./format";
import { DAY_NAMES, daysAt, type DayTest, timeOfDayAt } from "./searchDays";
import { alsoFinds, FREE_SAID, FREE_WORD, LEFT_OUT, OWN_WORDS, PHRASES } from "./searchWords";

/** "Salsa Caleña" → "salsa calena": for comparing, never for showing. */
export function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/**
 * A folded text's words: runs of letters, and of digits, so a number is one even joined to letters ("#93A-36" → 93, a,
 * 36; "la33orquesta" → la, 33, orquesta; "@esfera" → esfera; "cha-cha" → cha, cha).
 */
export function wordsOf(folded: string): string[] {
  return folded.match(/[a-z]+|\d+/g) ?? [];
}

const LONGEST_PHRASE = Math.max(...[...PHRASES].map((phrase) => phrase.split(" ").length));
const MIN_STEM = 4; // shorter singulars would start too many words ("dos" → "do")
const MIN_IN_HANDLE = 5; // shorter words were found in the middle of others ("tour", "and" in @proyectourbandance)
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
  /** The handle, folded: names are also searched inside it ("discojaguar.bta"). */
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
    const folded = fold(shown.filter(Boolean).join(" "));
    const words = wordsOf(folded);
    const said = ` ${words.join(" ")} `;
    const free = priceSummary(event) === FREE || FREE_SAID.some((phrase) => said.includes(` ${phrase} `));
    // Words joined by a hyphen or an apostrophe are also one: "K-POP" is kpop, "Pa'lante" palante, "Quiebra-Canto"
    // quiebracanto (the bug hunt of 7 Oct 2026). After the others, so no phrase runs into them.
    const joined = (folded.match(/[a-z]+(?:['’-][a-z]+)+/g) ?? []).map((compound) => compound.replace(/['’-]/g, ""));
    const all = [...words, ...joined, ...(free ? [FREE_WORD] : [])];
    found = { words: all, text: ` ${all.join(" ")} `, account: fold(event.account) };
    searchable.set(event, found);
  }
  return found;
}

/** One part of a search: a typed word starting one of the event's words, a whole word or phrase, a name in the handle. */
interface Term {
  starts: string[];
  phrases: string[];
  handle?: string;
}

/** A day a search names; `name`: its word, when it's also a first name (searchDays.ts DAY_NAMES). */
interface NamedDay {
  test: DayTest;
  name?: string;
}

/** A search, read: its parts (all needed) and the days it names (any of them). */
interface Query {
  terms: Term[];
  days: NamedDay[];
}

/** The known phrase starting at `words[at]`, longest first, and how many words it takes. */
function phraseAt(words: string[], at: number): [string, number] | null {
  for (let length = Math.min(LONGEST_PHRASE, words.length - at); length >= 2; length--) {
    const phrase = words.slice(at, at + length).join(" ");
    if (PHRASES.has(phrase)) return [phrase, length];
  }
  return null;
}

/**
 * A typed word: found at the start of the event's words; whole when it's a number, a letter (unless it's `alone`: a
 * search starting) or a singular; inside the handle when it's a name of five letters or more (not one of OWN_WORDS).
 */
function wordTerm(word: string, { alone = false } = {}): Term {
  if (/^\d+$/.test(word) || (word.length === 1 && !alone)) return { starts: [], phrases: [word] };
  const forms = singulars(word);
  const name = word.length >= MIN_IN_HANDLE && !forms.some((form) => OWN_WORDS.has(form));
  return { starts: [word], phrases: [...forms.slice(1), ...forms.flatMap(alsoFinds)], ...(name && { handle: word }) };
}

/**
 * A search, read: the days it names, known phrases whole ("sin costo", "cha cha cha"), every other word on its own. A
 * part of the day said alone ("clases en la mañana": no hours here) and the words left out (searchWords.ts LEFT_OUT:
 * "de", "el próximo", "qué hay") count only when the search is nothing else ("la" alone still finds "La Casona").
 */
export function parseQuery(query: string, today: string): Query {
  // An apostrophe between letters joins them, as in the events ("pa'lante" is palante; "pa' bailar" stays two words).
  const words = wordsOf(fold(query).replace(/(?<=[a-z])['’](?=[a-z])/g, ""));
  const read: Query = { terms: [], days: [] };
  const leftOut: string[] = [];
  for (let at = 0; at < words.length; ) {
    const days = daysAt(words, at, today);
    const time = days ? 0 : timeOfDayAt(words, at);
    const phrase = days || time ? null : phraseAt(words, at);
    if (days) {
      const [test, length] = days;
      const word = words[at]!;
      read.days.push(length === 1 && DAY_NAMES.has(word) ? { test, name: word } : { test });
      at += length;
    } else if (time) {
      leftOut.push(...words.slice(at, at + time));
      at += time;
    } else if (phrase) {
      const [text, length] = phrase;
      read.terms.push({ starts: [], phrases: [text, ...alsoFinds(text)] });
      at += length;
    } else {
      const word = words[at]!;
      if (LEFT_OUT.has(word)) leftOut.push(word);
      else read.terms.push(wordTerm(word, { alone: words.length === 1 }));
      at += 1;
    }
  }
  if (!read.terms.length && !read.days.length) read.terms = leftOut.map((word) => wordTerm(word, { alone: true }));
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
    term.starts.some((start) => event.words.some((word) => word.startsWith(start))) ||
    term.phrases.some((phrase) => event.text.includes(` ${phrase} `)) ||
    (term.handle !== undefined && event.account.includes(term.handle))
  );
}

/** True when every word of `query` is found in the event ("" matches everything). Its days apart: searchedDays. */
export function matchesWords(event: DanceEvent, query: string, today = todayIso()): boolean {
  const { terms } = readQuery(query, today);
  if (!terms.length) return true;
  const found = searchableOf(event);
  return terms.every((term) => hasTerm(found, term));
}

/**
 * The days `query` names for `event`, any of them, as one test; null when it names none. A day word that's also a
 * first name isn't a day for an event with that name among its words ("julio": Julio's workshop on any of its days;
 * "julio sábado": on a Saturday). Which of an event's days are shown is the filters' model's (state.ts shownDays), as
 * for "Cuándo".
 */
export function searchedDays(query: string, today = todayIso(), event?: DanceEvent): DayTest | null {
  const { days } = readQuery(query, today);
  const named = event ? days.filter(({ name }) => name === undefined || !searchableOf(event).words.includes(name)) : days;
  return named.length ? (day) => named.some(({ test }) => test(day)) : null;
}
