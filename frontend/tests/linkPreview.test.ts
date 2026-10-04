import { describe, expect, it } from "vitest";
import {
  previewCard,
  previewDescription,
  previewImageAlt,
  previewTitle,
  previewVersion,
  shortWhen,
  whatLabel,
} from "../src/scripts/lib/linkPreview";
import { previewImagePath } from "../src/scripts/lib/links";
import type { DanceEvent } from "../src/scripts/types";
import { event } from "./factories";

const TODAY = "2026-10-04";
const NBSP = " ";
/** Intl puts a no-break space after "$": compared as plain spaces. */
const plain = (text: string) => text.replaceAll(NBSP, " ");

const cubanos = event({
  id: "intensivo-ritmos-cubanos-4-oct",
  title: "Intensivo Ritmos Cubanos",
  event_type: "workshop",
  styles: ["salsa cubana"],
  address: "Cra 16 #52-46",
  date: "2026-10-04",
  start_time: "09:00",
  prices: [
    { label: "Individual", amount_cop: 90000, condition: null },
    { label: "Clase suelta", amount_cop: 35000, condition: null },
  ],
});

const levelUp = event({
  title: "Level Up Bachata Fusion Congress",
  event_type: "congress",
  styles: ["bachata"],
  date: "2026-11-13",
  end_date: "2026-11-15",
  start_time: "20:00",
});

describe("previewTitle", () => {
  it("adds the short date and time, never 'Hoy' even on the day", () => {
    expect(previewTitle(cubanos, TODAY)).toBe("Intensivo Ritmos Cubanos — dom 4 oct, 9:00 a. m.");
  });

  it("gives an event over several days its days, without the time", () => {
    expect(previewTitle(levelUp, TODAY)).toBe("Level Up Bachata Fusion Congress — 13–15 nov");
  });

  it("spells out both months when the days cross one", () => {
    expect(shortWhen(event({ date: "2026-10-31", end_date: "2026-11-02" }), TODAY)).toBe("31 oct – 2 nov");
  });

  it("adds the year when it isn't this one", () => {
    expect(shortWhen(event({ date: "2027-02-18", end_date: "2027-02-22" }), TODAY)).toBe("18–22 feb 2027");
    expect(shortWhen(event({ date: "2027-01-09" }), TODAY)).toBe("sáb 9 ene 2027");
  });

  it("leaves the time out when the post doesn't give one", () => {
    expect(shortWhen(event({ date: "2026-10-24" }), TODAY)).toBe("sáb 24 oct");
  });
});

describe("previewDescription", () => {
  it("says what, where and how much, then the site", () => {
    expect(plain(previewDescription(cubanos))).toBe("Taller de salsa cubana · Cra 16 #52-46 · Desde $ 35.000 · Pa' Bailar");
  });

  it("joins up to three styles and says when it's free", () => {
    const social = event({
      styles: ["salsa", "bachata", "kizomba", "zouk"],
      venue: "Distrito Social",
      prices: [{ label: "Entrada", amount_cop: 0, condition: null }],
    });
    expect(plain(previewDescription(social))).toBe("Social de salsa, bachata y kizomba · Distrito Social · Gratis · Pa' Bailar");
  });

  it("skips what it doesn't know", () => {
    expect(previewDescription(event({ event_type: "concert", styles: [] }))).toBe("Concierto · Pa' Bailar");
    expect(whatLabel(event({ event_type: "other", styles: ["yoga"] }))).toBe("Yoga");
    expect(whatLabel(event({ event_type: "other", styles: [] }))).toBe("");
    expect(whatLabel(event({ event_type: "workshop", styles: ["salsa cubana", "otro", "afro"] }))).toBe("Taller de salsa cubana y afro");
    expect(whatLabel(event({ event_type: "other", styles: ["otro"] }))).toBe("");
  });
});

describe("previewCard", () => {
  it("has the full date with a real day, the time and the sticker", () => {
    const card = previewCard(cubanos, TODAY);
    expect(card).toMatchObject({ days: "Domingo 4 de octubre", time: "9:00 a. m." });
    expect(plain(card.price)).toBe("Desde $ 35.000");
    expect(card.free).toBe(false);
    expect(card.sticker).toEqual({ day: "04", month: "OCT", range: false });
  });

  it("shows an event over several days as its days, the sticker as a range within a month", () => {
    const card = previewCard(levelUp, TODAY);
    expect(card).toMatchObject({ days: "Viernes 13 al domingo 15 de noviembre", time: "" });
    expect(card.sticker).toEqual({ day: "13–15", month: "NOV", range: true });
  });

  it("keeps the first day on the sticker across months, and the year in the date when it isn't this one", () => {
    expect(previewCard(event({ date: "2026-10-31", end_date: "2026-11-02" }), TODAY).sticker).toEqual({
      day: "31",
      month: "OCT",
      range: false,
    });
    expect(previewCard(event({ date: "2027-02-18", end_date: "2027-02-22" }), TODAY).days).toBe(
      "Jueves 18 al lunes 22 de febrero de 2027",
    );
  });

  it("marks free events", () => {
    const card = previewCard(event({ prices: [{ label: "Entrada", amount_cop: 0, condition: null }] }), TODAY);
    expect(card).toMatchObject({ price: "Gratis", free: true });
  });

  it("gives the image a description", () => {
    expect(previewImageAlt(cubanos, TODAY)).toBe(
      "Flyer de Intensivo Ritmos Cubanos · Domingo 4 de octubre · 9:00 a. m. · Cra 16 #52-46 · Desde $ 35.000",
    );
  });
});

describe("previewVersion", () => {
  const version = previewVersion(cubanos, TODAY);
  const changed = (overrides: Partial<DanceEvent>) => previewVersion({ ...cubanos, ...overrides }, TODAY);

  it("is short and stable", () => {
    expect(version).toMatch(/^[0-9a-z]{1,7}$/);
    expect(previewVersion({ ...cubanos }, TODAY)).toBe(version);
  });

  it("changes when what the image shows changes", () => {
    expect(changed({ title: "Intensivo de Ritmos Cubanos" })).not.toBe(version);
    expect(changed({ date: "2026-10-11" })).not.toBe(version);
    expect(changed({ end_date: "2026-10-05" })).not.toBe(version);
    expect(changed({ start_time: "10:00" })).not.toBe(version);
    expect(changed({ venue: "Casa de la Salsa" })).not.toBe(version);
    expect(changed({ address: "Cra 16 #52-48" })).not.toBe(version);
    expect(changed({ prices: [{ label: "Clase suelta", amount_cop: 40000, condition: null }] })).not.toBe(version);
    expect(changed({ media: [{ ...cubanos.media[0], flyer: "flyers/p2.webp" }] })).not.toBe(version);
    expect(changed({ media: [{ ...cubanos.media[0], width: 1080, height: 1350 }] })).not.toBe(version);
  });

  it("stays when only what the image doesn't show changes", () => {
    expect(changed({ styles: ["salsa cubana", "son"] })).toBe(version);
    expect(changed({ event_type: "social" })).toBe(version);
    expect(changed({ end_time: "12:00", contact: "3001234567", confidence: "low", doubts: ["¿hora?"] })).toBe(version);
    expect(changed({ artists: ["Yoel"], activities: ["clase"], organizer: "Zafra" })).toBe(version);
    expect(changed({ media: [{ ...cubanos.media[0], caption: "¡Nos vemos!", permalink: "https://www.instagram.com/p/x/" }] })).toBe(
      version,
    );
    // A price that doesn't change the lowest one shown ("Desde $ 35.000").
    expect(changed({ prices: [...cubanos.prices, { label: "Pareja", amount_cop: 150000, condition: null }] })).toBe(version);
  });

  it("goes on the image's URL", () => {
    expect(previewImagePath(cubanos, version)).toBe(`og/intensivo-ritmos-cubanos-4-oct.jpg?v=${version}`);
  });
});
