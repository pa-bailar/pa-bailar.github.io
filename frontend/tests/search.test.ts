import { describe, expect, it } from "vitest";
import { STYLES } from "../scripts/check-data.mjs";
import { styleLabel, typeLabel } from "../src/scripts/lib/format";
import { fold, matchesQuery, singulars, wordsOf } from "../src/scripts/lib/search";
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
    expect(matchesQuery(event({ styles: ["salsa caleña"] }), "CALEÑA")).toBe(true);
  });

  it("needs every word, anywhere in the event", () => {
    expect(matchesQuery(social, "juanita bachata")).toBe(true);
    expect(matchesQuery(social, "chapinero halloween")).toBe(true);
    expect(matchesQuery(social, "juanita salsa")).toBe(false);
  });

  it("finds an academy written as a handle", () => {
    expect(matchesQuery(social, "@esferalatina")).toBe(true);
  });

  it("an empty search matches everything", () => {
    expect(matchesQuery(social, "  ")).toBe(true);
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
      expect(matchesQuery(free, query)).toBe(true);
      expect(matchesQuery(paid, query)).toBe(false);
    });

    it("with other words, all of them still needed", () => {
      expect(matchesQuery(free, "sin costo salsa")).toBe(true);
      expect(matchesQuery(free, "entrada libre bachata")).toBe(false);
    });

    it("free on the card: the lowest price is nothing", () => {
      expect(matchesQuery(event({ prices: [price(0), price(20000)] }), "gratis")).toBe(true); // "Gratis" on its card
      expect(matchesQuery(event({ prices: [] }), "gratis")).toBe(false); // no price said: not known to be free
    });

    it("free in the event's own words, with no price read", () => {
      const said = event({ title: "Social gratuito de bachata", prices: [] });
      expect(matchesQuery(said, "gratis")).toBe(true);
      expect(matchesQuery(said, "sin costo")).toBe(true);
      expect(matchesQuery(said, "gratu")).toBe(true); // typed halfway: its own word
      expect(matchesQuery(event({ activities: ["Clase con entrada libre"], prices: [] }), "gratis")).toBe(true);
    });

    it("only whole ways of saying it: not «libre» alone, «cover» alone or «freestyle»", () => {
      expect(matchesQuery(event({ title: "Rumba libre", prices: [price(20000)] }), "gratis")).toBe(false);
      expect(matchesQuery(free, "libre")).toBe(false);
      expect(matchesQuery(free, "cover")).toBe(false);
      const freestyle = event({ title: "Freestyle night", prices: [price(20000)] });
      expect(matchesQuery(freestyle, "freestyle")).toBe(true);
      expect(matchesQuery(freestyle, "gratis")).toBe(false);
    });
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
    expect(matchesQuery(workshop, "tall")).toBe(true);
    expect(matchesQuery(champeta, "chapi")).toBe(true);
    expect(matchesQuery(son, "son")).toBe(true);
    expect(matchesQuery(jason, "son")).toBe(false); // not inside "Jason" or "Casona"
  });

  it("finds inside an academy's handle, as before", () => {
    expect(matchesQuery(event({ account: "discojaguar.bta" }), "jaguar")).toBe(true);
  });

  it("finds the singular of a plural", () => {
    expect(singulars("talleres")).toContain("taller");
    expect(singulars("sociales")).toContain("social");
    expect(singulars("clases")).toEqual(["clases", "clase"]); // never "clas", which starts "clásica"
    expect(singulars("dos")).toEqual(["dos"]);
    expect(matchesQuery(workshop, "talleres")).toBe(true);
    expect(matchesQuery(socialWithClass, "sociales")).toBe(true);
    expect(matchesQuery(party, "rumbas")).toBe(true);
  });

  it("the site's own words, as shown: «Otros ritmos», the type's label", () => {
    expect(matchesQuery(other, "otros ritmos")).toBe(true);
    expect(matchesQuery(workshop, "taller caleña")).toBe(true);
  });

  it("a visitor's word finds the site's word, one way only", () => {
    expect(matchesQuery(workshop, "clases")).toBe(true); // a workshop
    expect(matchesQuery(socialWithClass, "clase")).toBe(true); // its own word
    expect(matchesQuery(socialWithClass, "taller")).toBe(false); // a class first doesn't make it a workshop
    expect(matchesQuery(party, "fiesta")).toBe(true); // "Rumba"
    expect(matchesQuery(fiestaSocial, "fiesta")).toBe(true); // its own word
    expect(matchesQuery(fiestaSocial, "rumba")).toBe(false);
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
    expect(matchesQuery(found, query)).toBe(true);
  });

  it("a phrase is found whole: «cha cha cha» isn't three words starting «cha»", () => {
    expect(matchesQuery(chachacha, "cha cha cha")).toBe(true);
    expect(matchesQuery(chachacha, "chachacha")).toBe(true);
    expect(matchesQuery(champeta, "cha cha cha")).toBe(false);
    expect(matchesQuery(chachacha, "salsa")).toBe(true); // the "Salsa" heading's rhythm
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
