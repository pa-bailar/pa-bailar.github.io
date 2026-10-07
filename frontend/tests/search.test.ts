import { describe, expect, it } from "vitest";
import { fold, matchesQuery } from "../src/scripts/lib/search";
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

describe("saved events", () => {
  it("saving works without storage, for the visit", () => {
    expect(isSaved(social.id)).toBe(false);
    toggleSaved(social.id);
    expect(isSaved(social.id)).toBe(true);
    toggleSaved(social.id);
    expect(isSaved(social.id)).toBe(false);
  });
});
