import { describe, expect, it } from "vitest";
import { cardItems, flyerKey, scheduleTitles } from "../src/scripts/lib/flyerGroups";
import { eventCardGridHtml, rowPlace, schedulePrice } from "../src/scripts/views/eventCard";
import { formatMoney } from "../src/scripts/lib/format";
import type { DanceEvent } from "../src/scripts/types";
import { event, seriesEvent } from "./factories";

// One card per flyer and day (the owner, 28 Oct 2026): @studiolatindance's Saturday of classes was nine cards in a row
// with the same flyer; now it's one card with the day's schedule. Events of the same post on other days, or of a series
// or several days, keep their own cards.

const base = event();

/** An event announced by post `post` (its main post), with these details. */
function onFlyer(post: string, overrides: Partial<DanceEvent>): DanceEvent {
  return event({ media: [{ ...base.media[0]!, post_id: post, permalink: `https://www.instagram.com/p/${post}/` }], ...overrides });
}

const ids = (items: ReturnType<typeof cardItems>) =>
  items.map((item) => (item.kind === "event" ? item.event.id : item.events.map((e) => e.id)));

describe("which events share a card", () => {
  it("a flyer's events of one day share one card; its events of another day don't", () => {
    const yoga = onFlyer("p1", { id: "yoga-31-oct", date: "2026-10-31", start_time: "09:00" });
    const salsa = onFlyer("p1", { id: "salsa-31-oct", date: "2026-10-31", start_time: "11:00" });
    const sunday = onFlyer("p1", { id: "salsa-1-nov", date: "2026-11-01", start_time: "11:00" });
    expect(ids(cardItems([yoga, salsa, sunday]))).toEqual([["yoga-31-oct", "salsa-31-oct"], "salsa-1-nov"]);
  });

  it("another post, or another account's, is another card", () => {
    const a = onFlyer("p1", { id: "a", date: "2026-10-31" });
    const b = onFlyer("p2", { id: "b", date: "2026-10-31" });
    const c = onFlyer("p1", { id: "c", date: "2026-10-31", account: "otra" });
    expect(ids(cardItems([a, b, c]))).toEqual(["a", "b", "c"]);
  });

  it("the card goes where its first event is, its events in the order they came, even with another between", () => {
    const first = onFlyer("p1", { id: "first", date: "2026-10-31", start_time: "10:00" });
    const other = onFlyer("p2", { id: "other", date: "2026-10-31", start_time: "11:00" });
    const later = onFlyer("p1", { id: "later", date: "2026-10-31", start_time: "12:00" });
    expect(ids(cardItems([first, other, later]))).toEqual([["first", "later"], "other"]);
  });

  it("a series or an event over several days keeps its own card", () => {
    const series = seriesEvent({ id: "series", media: [{ ...base.media[0]!, post_id: "p1" }] });
    const festival = onFlyer("p1", { id: "festival", date: series.date, end_date: "2026-12-07" });
    const day = onFlyer("p1", { id: "day", date: series.date });
    expect(flyerKey(series)).toBeNull();
    expect(flyerKey(festival)).toBeNull();
    expect(ids(cardItems([series, festival, day]))).toEqual(["series", "festival", "day"]);
  });

  it("goes by the day each is listed under (the calendar's day, a series' session)", () => {
    const a = onFlyer("p1", { id: "a", date: "2026-10-31" });
    const b = onFlyer("p1", { id: "b", date: "2026-10-31" });
    expect(ids(cardItems([a, b], (e) => (e.id === "a" ? "2026-10-31" : "2026-11-01")))).toEqual(["a", "b"]);
  });

  it("the filters' leftovers: only the events handed over are rows", () => {
    const bachata = onFlyer("p1", { id: "bachata", date: "2026-10-31", styles: ["bachata"] });
    expect(ids(cardItems([bachata]))).toEqual(["bachata"]); // a schedule of one is an ordinary card
  });
});

describe("a schedule's heading and rows", () => {
  it("what every title shares before a separator heads the card; the rest is each row's", () => {
    expect(scheduleTitles(["Semana Ryan: Dancehall con Erika Díaz", "Semana Ryan: Sexy Style con Cata Velasco"])).toEqual({
      heading: "Semana Ryan",
      rows: ["Dancehall con Erika Díaz", "Sexy Style con Cata Velasco"],
    });
    expect(scheduleTitles(["Taller - Salsa", "taller – Bachata"])).toEqual({ heading: "Taller", rows: ["Salsa", "Bachata"] });
  });

  it("a time's colon is no separator: \"Clase 10:00 Salsa\" isn't \"Clase 10\" and \"00 Salsa\" (bug-squash, 28 Oct)", () => {
    const titles = ["Clase 10:00 Salsa", "Clase 10:00 Bachata"];
    expect(scheduleTitles(titles)).toEqual({ heading: null, rows: titles });
    expect(scheduleTitles(["Social 8:30: Salsa", "Social 8:30: Bachata"]).heading).toBe("Social 8:30");
  });

  it("titles that share nothing stay whole, with no heading", () => {
    const titles = ["Yoga", "Bachata Básica", "Salsa Básica"];
    expect(scheduleTitles(titles)).toEqual({ heading: null, rows: titles });
    expect(scheduleTitles(["Workshops Pro Fondos", "Workshop Pro Fondos: Sabroseo"]).heading).toBeNull();
  });
});

describe("a row's place, when the rows' places differ", () => {
  it("only the part that tells them apart: the venue, else the area, else the address", () => {
    const sede = (venue: string) =>
      onFlyer("p1", { venue, organizer: "Bureo Dance Studio", address: "Calle 127 #15-20", area: "Usaquén" });
    expect([sede("Sede 109"), sede("Sede 127")].map(rowPlace([sede("Sede 109"), sede("Sede 127")]))).toEqual(["Sede 109", "Sede 127"]);
    const area = (name: string) => onFlyer("p1", { venue: null, address: null, area: name });
    const both = [area("Fontibón"), area("Norte")];
    expect(both.map(rowPlace(both))).toEqual(["Fontibón", "Norte"]);
  });
});

describe("a schedule's price", () => {
  const priced = (...amounts: number[]) =>
    onFlyer("p1", { prices: amounts.map((amount_cop) => ({ label: "Entrada", amount_cop, condition: null })) });

  it("the one they all have, else from the lowest; nothing when the lowest is free or none has one", () => {
    expect(schedulePrice([priced(20000), priced(20000)])).toBe(formatMoney(20000));
    expect(schedulePrice([priced(20000), priced(30000)])).toBe(`Desde ${formatMoney(20000)}`);
    expect(schedulePrice([priced(20000), priced()])).toBe(`Desde ${formatMoney(20000)}`);
    expect(schedulePrice([priced(0), priced(30000)])).toBe("");
    expect(schedulePrice([priced(), priced()])).toBe("");
  });
});

describe("the schedule card", () => {
  const classes = [
    onFlyer("p1", { id: "yoga", title: "Yoga", date: "2026-10-31", start_time: "09:00", event_type: "workshop" }),
    onFlyer("p1", { id: "bachata", title: "Bachata Básica", date: "2026-10-31", start_time: "10:00", event_type: "workshop" }),
  ];
  const html = eventCardGridHtml(classes);

  it("is one card with the flyer once, and a row per event that is that event's card", () => {
    expect(html.match(/<article /g)).toHaveLength(1);
    expect(html.match(/class="event-card__flyer"/g)).toHaveLength(1);
    expect(html).toMatch(/<article class="event-card event-card--schedule" data-flyer-card /);
    expect(html.match(/<li class="schedule__row" data-event-card="(yoga|bachata)"/g)).toHaveLength(2);
    expect(html.match(/class="event-card__hit schedule__title"/g)).toHaveLength(2);
    expect(html.match(/data-save="(yoga|bachata)"/g)).toHaveLength(2);
  });

  it("says the time on each row and the type once, on the flyer, when they share it", () => {
    expect(html).toContain("9:00 a. m.");
    expect(html).toContain("10:00 a. m.");
    expect(html.match(/class="tag-type /g)).toHaveLength(1);
    expect(html).not.toContain("schedule__note");
  });

  it("says each row's type when they differ (a competition, then the social)", () => {
    const night = eventCardGridHtml([
      onFlyer("p2", { id: "jj", title: "Clasificatoria", date: "2026-10-31", start_time: "19:00", event_type: "competition" }),
      onFlyer("p2", { id: "social", title: "Social", date: "2026-10-31", start_time: "20:30", event_type: "social" }),
    ]);
    expect(night).not.toContain('class="tag-type ');
    expect(night.match(/class="schedule__note">(Competencia|Social)</g)).toHaveLength(2);
  });

  it("says each row's place when they differ, and the shared one once otherwise", () => {
    const at = (id: string, area: string) =>
      onFlyer("p3", { id, title: id, date: "2026-10-31", start_time: "10:00", area, venue: null, address: null });
    const split = eventCardGridHtml([at("manana", "Fontibón"), at("noche", "Norte")]);
    expect(split.match(/class="schedule__note">(Fontibón|Norte)</g)).toHaveLength(2);
    const same = eventCardGridHtml([at("uno", "Chapinero"), at("dos", "Chapinero")]);
    expect(same).not.toContain("schedule__note");
    expect(same.match(/>Chapinero</g)).toHaveLength(1); // on screen once; each row still says it to screen readers
  });
});
