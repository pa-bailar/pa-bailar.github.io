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

  // The cards say "Gratis", yet searching it found nothing (the Instagram audit, 7 Oct 2026).
  it("finds what the cards call free", () => {
    const price = (amount_cop: number) => ({ label: "Entrada", amount_cop, condition: null });
    const free = event({ styles: ["salsa"], prices: [price(0)] });
    const freeEarly = event({ prices: [price(0), price(20000)] }); // "Gratis" on its card: the lowest
    const paid = event({ prices: [price(15000)] });
    expect(matchesQuery(free, "gratis")).toBe(true);
    expect(matchesQuery(free, "Gratuito salsa")).toBe(true);
    expect(matchesQuery(freeEarly, "gratis")).toBe(true);
    expect(matchesQuery(paid, "gratis")).toBe(false);
    expect(matchesQuery(event({ prices: [] }), "gratis")).toBe(false); // no price said: not free
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
