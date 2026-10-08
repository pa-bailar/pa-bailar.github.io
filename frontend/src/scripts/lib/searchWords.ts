// The search's Spanish (the owner, 7 Oct 2026: "list synonyms based on the Spanish language"): what a visitor may
// type, and the site's own words it should also find (lib/search.ts). Folded (no accents, lowercase), whole words.
// One way only: "clase" also finds the workshops ("Taller"), while "taller" doesn't find the socials that open with
// a class. No entry is needed for a plural ("talleres": search.ts tries the singular) or for the start of a word
// ("bach" finds "bachata").
// Left out on purpose, because they'd find unrelated events (the data, 7 Oct 2026): "libre" alone ("rumba libre"),
// "parche" (academies named so), "noche", "presentacion", "encuentro", "feria" ("Feria de Cali" is a party), "cali"
// ("Calixta"), "practica" (not a social), "toque".

/** "Free", however it's written: in a search or in an event's own words, they all mean "gratis" (search.ts). */
export const FREE_WORD = "gratis";
export const FREE_PHRASES = [
  FREE_WORD,
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

/** The site's own words for the event types (format.ts TYPE_LABELS) and the rhythms (format.ts styleLabel), folded. */
const SOCIAL = "social";
const PARTY = "rumba";
const WORKSHOP = "taller";
const CONCERT = "concierto";
const CONGRESS = "congreso";
const COMPETITION = "competencia";
const SHOW = "show";
const URBAN_FAMILY = ["urbano", "dancehall", "afro", "heels"]; // the "Urbanos" heading (styleFamilies.ts)

/** [what a visitor may type, what it also finds]. */
const ALSO: [string[], string[]][] = [
  // Event types
  [["clase", "workshop", "masterclass", "master class", "curso", "intensivo", "bootcamp", "seminario"], [WORKSHOP]],
  [["baile social", "social dance"], [SOCIAL]],
  [["fiesta", "farra", "party", "parranda", "rumbita"], [PARTY]],
  [["en vivo", "musica en vivo", "orquesta", "banda", "live", "recital"], [CONCERT]],
  [["concurso", "campeonato", "torneo", "battle", "batalla"], [COMPETITION]],
  [["espectaculo"], [SHOW]],
  [["congress", "convencion"], [CONGRESS]],
  // Rhythms
  [["salsa"], ["cha cha cha"]], // the "Salsa" heading's rhythm that doesn't start with "salsa"
  [["salsero", "salsera"], ["salsa"]],
  [["caleno", "estilo caleno"], ["salsa calena"]],
  [["cubano", "casino", "rueda", "rueda de casino", "timba"], ["salsa cubana"]],
  [["en linea", "on 1", "on 2", "mambo", "la style", "ny style"], ["salsa en linea"]], // "on1" is read "on 1"
  [["chachacha", "chacha", "cha cha"], ["cha cha cha"]],
  [["bachatero", "bachatera"], ["bachata"]],
  [["dominicano"], ["bachata dominicana"]],
  [["urbano"], URBAN_FAMILY],
  [["reggaeton", "regueton", "reggeaton", "perreo", "dembow", "trap", "hip hop", "hiphop"], ["urbano"]],
  [["dance hall", "ragga"], ["dancehall"]],
  [["afrobeat", "afrohouse", "amapiano"], ["afro"]],
  [["tacones", "sexy style"], ["heels"]],
  [["milonga", "tanguero", "tanguera"], ["tango"]],
  [["sonero", "son cubano"], ["son"]],
  [["champetu"], ["champeta"]],
  [["urban kiz", "semba"], ["kizomba"]],
  [["lambazouk", "brazilian zouk"], ["zouk"]],
  [["lindy", "lindy hop", "charleston", "balboa", "west coast", "wcs"], ["swing"]],
  // Free
  [FREE_PHRASES.filter((phrase) => phrase !== FREE_WORD), [FREE_WORD]],
];

const ALSO_FINDS = new Map<string, string[]>();
for (const [typed, finds] of ALSO) {
  for (const word of typed) ALSO_FINDS.set(word, [...(ALSO_FINDS.get(word) ?? []), ...finds]);
}

/** What `typed` (folded) also finds: the site's words, whole. */
export function alsoFinds(typed: string): string[] {
  return ALSO_FINDS.get(typed) ?? [];
}

/** Everything the table says a typed word finds, for its test (every target must be one of the site's own words). */
export const ALL_TARGETS = [...new Set(ALSO.flatMap(([, finds]) => finds))];

/**
 * The search's own words (a type, a rhythm, a visitor's word for them): they find what they mean, never the inside of
 * a handle (lib/search.ts; the bug hunt of 7 Oct 2026: "competencia" found @jaleocompetencia_'s social, "banda"
 * @proyectourbandance's workshops).
 */
export const OWN_WORDS = new Set([...ALSO_FINDS.keys(), ...ALL_TARGETS].filter((word) => !word.includes(" ")));

/**
 * Words left out of a search unless it's nothing else ("la" alone still finds "La Casona"): the ones that only join
 * others ("clase de salsa el sábado"), the words before a day ("este sábado", "el próximo viernes"), and those of a
 * question or a wish around what's looked for ("qué hay hoy", "dónde bailar salsa", "quiero ir a bailar": the bug hunt
 * of 7 Oct 2026; in the data that day only "que", in 3 titles, and "eventos", in 1, are an event's words). Not "baile":
 * academies' names ("Academia de Baile", 14 events).
 */
export const LEFT_OUT = new Set([
  ..."de del el la los las y o en con para por un una al a".split(" "),
  ..."este esta proximo proxima".split(" "),
  ..."que hay donde quiero ir bailar algo evento eventos plan planes".split(" "),
]);

/**
 * The phrases searched whole, not word by word: the table's own, and the site's labels of more than one word (so
 * "cha cha cha" isn't three "cha"s, each starting "champeta" or "chapinero").
 */
export const PHRASES = new Set(
  [
    ...ALSO_FINDS.keys(),
    "salsa en linea",
    "salsa calena",
    "salsa cubana",
    "cha cha cha",
    "bachata sensual",
    "bachata dominicana",
    "otros ritmos",
  ].filter((phrase) => phrase.includes(" ")),
);
