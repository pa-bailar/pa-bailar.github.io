import { describe, expect, it } from "vitest";
import { STYLES } from "../scripts/check-data.mjs";
import { styleLabel, typeLabel } from "../src/scripts/lib/format";
import { fold, matchesWords, singulars, wordsOf } from "../src/scripts/lib/search";
import { ALL_TARGETS, FREE_WORD } from "../src/scripts/lib/searchWords";
import type { EventType } from "../src/scripts/types";
import { toggleSaved, isSaved } from "../src/scripts/lib/saved";
import { event } from "./factories";

const social = event({
  title: "Social de Halloween",
  account: "esferalatinaoficial",
  artists: ["Juanita Quintero"],
  styles: ["bachata sensual"],
  area: "Chapinero",
});

describe("search", () => {
  it("ignores accents and case", () => {
    expect(fold("Salsa Caleña")).toBe("salsa calena");
    expect(matchesWords(event({ styles: ["salsa caleña"] }), "CALEÑA")).toBe(true);
  });

  it("needs every word, anywhere in the event", () => {
    expect(matchesWords(social, "juanita bachata")).toBe(true);
    expect(matchesWords(social, "chapinero halloween")).toBe(true);
    expect(matchesWords(social, "juanita salsa")).toBe(false);
  });

  it("finds an academy written as a handle", () => {
    expect(matchesWords(social, "@esferalatina")).toBe(true);
  });

  it("an empty search matches everything", () => {
    expect(matchesWords(social, "  ")).toBe(true);
  });

  // The cards say "Gratis", yet searching it found nothing (the Instagram audit, 7 Oct 2026); and "free" is written
  // many ways, by visitors and by organizers (the owner, 7 Oct 2026).
  describe("free, however it's written", () => {
    const price = (amount_cop: number, label = "Entrada") => ({ label, amount_cop, condition: null });
    const free = event({ styles: ["salsa"], prices: [price(0, "No Cover")] });
    const paid = event({ styles: ["salsa"], prices: [price(15000)] });

    it.each([
      "gratis",
      "Gratuito",
      "gratuitas",
      "sin costo",
      "SIN  COSTO",
      "entrada libre",
      "ingreso libre",
      "acceso libre",
      "no cover",
      "sin cover",
      "free cover",
      "cover free",
      "free",
    ])("«%s» finds a free event, never a paid one", (query) => {
      expect(matchesWords(free, query)).toBe(true);
      expect(matchesWords(paid, query)).toBe(false);
    });

    it("with other words, all of them still needed", () => {
      expect(matchesWords(free, "sin costo salsa")).toBe(true);
      expect(matchesWords(free, "entrada libre bachata")).toBe(false);
    });

    it("free on the card: the lowest price is nothing", () => {
      expect(matchesWords(event({ prices: [price(0), price(20000)] }), "gratis")).toBe(true); // "Gratis" on its card
      expect(matchesWords(event({ prices: [] }), "gratis")).toBe(false); // no price said: not known to be free
    });

    it("free in the event's own words, with no price read", () => {
      const said = event({ title: "Social gratuito de bachata", prices: [] });
      expect(matchesWords(said, "gratis")).toBe(true);
      expect(matchesWords(said, "sin costo")).toBe(true);
      expect(matchesWords(said, "gratu")).toBe(true); // typed halfway: its own word
      expect(matchesWords(event({ activities: ["Clase con entrada libre"], prices: [] }), "gratis")).toBe(true);
    });

    it("only whole ways of saying it: not «libre» alone, «cover» alone or «freestyle»", () => {
      expect(matchesWords(event({ title: "Rumba libre", prices: [price(20000)] }), "gratis")).toBe(false);
      expect(matchesWords(free, "libre")).toBe(false);
      expect(matchesWords(free, "cover")).toBe(false);
      const freestyle = event({ title: "Freestyle night", prices: [price(20000)] });
      expect(matchesWords(freestyle, "freestyle")).toBe(true);
      expect(matchesWords(freestyle, "gratis")).toBe(false);
    });

    // The bug hunt of 7 Oct 2026 (none in the data that day): "free" alone, in an event's words, is a name more often
    // than a price.
    it("not «free» alone in the event's words: «Free Style» isn't free", () => {
      expect(matchesWords(event({ title: "Batalla de Free Style", prices: [] }), "gratis")).toBe(false);
      expect(matchesWords(event({ title: "Sugar Free Social", prices: [price(25000)] }), "gratis")).toBe(false);
      expect(matchesWords(event({ title: "Free cover hasta las 9", prices: [] }), "gratis")).toBe(true);
      expect(matchesWords(free, "free")).toBe(true); // typed, it still means free
    });
  });
});

// Words joined by a hyphen or an apostrophe (the bug hunt of 7 Oct 2026: "kpop" didn't find "K-POP", "pa'lante" not
// "Palante").
describe("words joined by a hyphen or an apostrophe", () => {
  it("an event's joined words are also one word: «kpop» finds K-POP, «quiebracanto» Quiebra-Canto", () => {
    expect(matchesWords(event({ title: "Gala Premio Danza K-POP" }), "kpop")).toBe(true);
    expect(matchesWords(event({ title: "Gala Premio Danza K-POP" }), "k-pop")).toBe(true);
    expect(matchesWords(event({ venue: "Casa Quiebra-Canto", account: "casa" }), "quiebracanto")).toBe(true);
    expect(matchesWords(event({ venue: "Casa Quiebra-Canto", account: "casa" }), "canto")).toBe(true);
  });

  it("an apostrophe joins what's typed: «pa'lante» is «palante», either way", () => {
    expect(matchesWords(event({ title: "Palante Social" }), "pa'lante")).toBe(true);
    expect(matchesWords(event({ title: "Pa'lante Social" }), "palante")).toBe(true);
    expect(matchesWords(event({ title: "Pa’lante Social" }), "pa’lante")).toBe(true);
    expect(matchesWords(event({ title: "Palante Social" }), "pa' lante")).toBe(false); // with a space, two words
  });
});

// Words, plurals and the visitors' Spanish (the owner, 7 Oct 2026; the search audit that day: "talleres" found 4 of
// 45 workshops, "son" was found inside "Jason", "otros ritmos" found nothing).
describe("the search's Spanish", () => {
  const workshop = event({ title: "Taller de salsa caleña", event_type: "workshop", styles: ["salsa caleña"] });
  const socialWithClass = event({ title: "Social de bachata", styles: ["bachata"], activities: ["Clase de bachata"] });
  const party = event({ title: "Noche de reguetón", event_type: "party", styles: ["urbano"] });
  const fiestaSocial = event({ title: "Fiesta de salsa", styles: ["salsa"] });
  const tango = event({ title: "Noche porteña", styles: ["tango"] });
  const dancehall = event({ title: "Bashment", event_type: "workshop", styles: ["dancehall"] });
  const chachacha = event({ title: "Cha cha chá y mambo", styles: ["cha cha chá"] });
  const champeta = event({ title: "Champeta en Chapinero", styles: ["champeta"], area: "Chapinero" });
  const jason = event({ title: "Jason en La Casona", styles: ["salsa"], venue: "La Casona" });
  const son = event({ title: "Son de la loma", styles: ["son"] });
  const other = event({ title: "Ritmos del Pacífico", styles: ["otro"] });

  it("matches at the start of a word: halfway typing works, the middle of a word doesn't", () => {
    expect(matchesWords(workshop, "tall")).toBe(true);
    expect(matchesWords(champeta, "chapi")).toBe(true);
    expect(matchesWords(son, "son")).toBe(true);
    expect(matchesWords(jason, "son")).toBe(false); // not inside "Jason" or "Casona"
  });

  it("finds inside an academy's handle, as before", () => {
    expect(matchesWords(event({ account: "discojaguar.bta" }), "jaguar")).toBe(true);
  });

  it("finds the singular of a plural", () => {
    expect(singulars("talleres")).toContain("taller");
    expect(singulars("sociales")).toContain("social");
    expect(singulars("clases")).toEqual(["clases", "clase"]); // never "clas", which starts "clásica"
    expect(singulars("dos")).toEqual(["dos"]);
    expect(matchesWords(workshop, "talleres")).toBe(true);
    expect(matchesWords(socialWithClass, "sociales")).toBe(true);
    expect(matchesWords(party, "rumbas")).toBe(true);
  });

  it("the site's own words, as shown: «Otros ritmos», the type's label", () => {
    expect(matchesWords(other, "otros ritmos")).toBe(true);
    expect(matchesWords(workshop, "taller caleña")).toBe(true);
  });

  it("a visitor's word finds the site's word, one way only", () => {
    expect(matchesWords(workshop, "clases")).toBe(true); // a workshop
    expect(matchesWords(socialWithClass, "clase")).toBe(true); // its own word
    expect(matchesWords(socialWithClass, "taller")).toBe(false); // a class first doesn't make it a workshop
    expect(matchesWords(party, "fiesta")).toBe(true); // "Rumba"
    expect(matchesWords(fiestaSocial, "fiesta")).toBe(true); // its own word
    expect(matchesWords(fiestaSocial, "rumba")).toBe(false);
  });

  it.each([
    ["milonga", tango],
    ["reggaeton", party],
    ["perreo", party],
    ["urbanos", dancehall], // the "Urbanos" heading's rhythms
    ["casino", event({ styles: ["salsa cubana"] })],
    ["on2", event({ styles: ["salsa en línea"] })],
    ["caleño", workshop],
    ["salsero", fiestaSocial],
    ["lindy hop", event({ styles: ["swing"] })],
    ["concurso", event({ event_type: "competition" })],
    ["en vivo", event({ event_type: "concert" })],
  ])("«%s» finds the rhythm or type it means", (query, found) => {
    expect(matchesWords(found, query)).toBe(true);
  });

  it("a phrase is found whole: «cha cha cha» isn't three words starting «cha»", () => {
    expect(matchesWords(chachacha, "cha cha cha")).toBe(true);
    expect(matchesWords(chachacha, "chachacha")).toBe(true);
    expect(matchesWords(champeta, "cha cha cha")).toBe(false);
    expect(matchesWords(chachacha, "salsa")).toBe(true); // the "Salsa" heading's rhythm
  });

  it("every word the table finds is one the site shows (a type, a rhythm, «gratis»)", () => {
    const types: EventType[] = ["social", "party", "workshop", "concert", "festival", "congress", "competition", "show", "other"];
    const shown = new Set([
      ...types.map((type) => fold(typeLabel(type))),
      ...STYLES.map((style: string) => wordsOf(fold(styleLabel(style))).join(" ")),
      FREE_WORD,
    ]);
    expect(ALL_TARGETS.filter((target) => !shown.has(target))).toEqual([]);
  });
});

describe("saved events", () => {
  it("saving works without storage, for the visit", () => {
    expect(isSaved(social.id)).toBe(false);
    toggleSaved(social.id);
    expect(isSaved(social.id)).toBe(true);
    toggleSaved(social.id);
    expect(isSaved(social.id)).toBe(false);
  });
});

// Over-matching (the bug hunt of 7 Oct 2026): "calle 7" found Calle 73, "zona t" every word starting with t, "banda"
// and "competencia" the handles they hide in (@proyectourbandance, @jaleocompetencia_), and "andres" found Andrea.
describe("whole, where a word's start would find too much", () => {
  it("a number is whole: «calle 7» isn't Calle 73; joined to letters it's still a number", () => {
    const calle73 = event({ address: "Calle 73 # 14-53" });
    expect(matchesWords(calle73, "calle 7")).toBe(false);
    expect(matchesWords(calle73, "calle 73")).toBe(true);
    expect(matchesWords(event({ address: "Cra. 15 #93A-36" }), "93")).toBe(true);
    expect(matchesWords(event({ title: "Los 25 de la-33" }), "la 33")).toBe(true);
    expect(matchesWords(event({ account: "la33orquesta" }), "33")).toBe(true);
    expect(wordsOf("la33orquesta 93a")).toEqual(["la", "33", "orquesta", "93", "a"]);
  });

  it("a letter after a word starts the event's word that follows it: «zona t» is Zona T, not Zona 6 at Tributo", () => {
    expect(matchesWords(event({ area: "Zona T" }), "zona t")).toBe(true);
    expect(matchesWords(event({ area: "Zona 6", venue: "Tributo Salsa y Jazz" }), "zona t")).toBe(false);
    expect(matchesWords(event({ title: "Tardeo" }), "t")).toBe(true); // a search starting
    // Typing the next word, the list never empties for its first letter ("bachata s" on the way to "bachata sensual").
    expect(matchesWords(event({ styles: ["bachata sensual"] }), "bachata s")).toBe(true);
    expect(matchesWords(event({ title: "Taller de salsa", event_type: "workshop" }), "taller de s")).toBe(true);
    expect(matchesWords(event({ title: "Taller de salsa", event_type: "workshop" }), "talleres d")).toBe(true);
  });

  it("a singular is whole: «andres» isn't Andrea; «talleres» still finds Taller", () => {
    expect(matchesWords(event({ artists: ["Andrea Gómez"] }), "andres")).toBe(false);
    expect(matchesWords(event({ artists: ["Andrés Gómez"] }), "andres")).toBe(true);
    expect(matchesWords(event({ title: "Taller de salsa" }), "talleres")).toBe(true);
  });

  it("inside a handle (its words run together): a name of five letters or more, never the search's own words", () => {
    expect(matchesWords(event({ account: "discojaguar.bta" }), "jaguar")).toBe(true);
    expect(matchesWords(event({ account: "latrinidaddelasalsa" }), "trinidad")).toBe(true);
    expect(matchesWords(event({ account: "frank.de.latorre" }), "torre")).toBe(true);
    expect(matchesWords(event({ account: "proyectourbandance", event_type: "workshop" }), "urban")).toBe(true);
    expect(matchesWords(event({ account: "proyectourbandance", event_type: "workshop" }), "banda")).toBe(false);
    expect(matchesWords(event({ account: "proyectourbandance", event_type: "workshop" }), "tour")).toBe(false);
    expect(matchesWords(event({ account: "jaleocompetencia_" }), "competencia")).toBe(false);
    expect(matchesWords(event({ account: "jaleocompetencia_" }), "competencias")).toBe(false);
    expect(matchesWords(event({ account: "pachanga_y_pochola" }), "cha")).toBe(false);
    expect(matchesWords(event({ account: "frank.de.latorre" }), "torres")).toBe(false); // its singular is whole
  });
});
