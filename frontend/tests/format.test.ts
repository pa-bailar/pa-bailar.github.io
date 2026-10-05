import { describe, expect, it } from "vitest";
import { escapeHtml } from "../src/scripts/lib/dom";
import {
  cardWhenLabel,
  eventCountLabel,
  eventDaysLabel,
  formatTime,
  LOCALE,
  priceSummary,
  shortMonthName,
  shortWeekdayAndDay,
  shortWeekdayName,
  stickerDate,
  styleLabel,
  stylesLabel,
} from "../src/scripts/lib/format";
import { addDays, parseIsoDate, sameMonth } from "../src/scripts/lib/dates";
import { eventTimes } from "../src/scripts/lib/links";
import { event } from "./factories";

describe("formatting", () => {
  it("times read as in Colombia", () => {
    expect(formatTime("21:00")).toBe("9:00 p. m.");
    expect(formatTime("00:30")).toBe("12:30 a. m.");
    expect(formatTime(null)).toBe("");
  });

  it("prices: free, a single price, or the lowest of several", () => {
    const price = (amount: number) => ({ label: "General", amount_cop: amount, condition: null });
    expect(priceSummary(event({ prices: [price(0)] }))).toBe("Gratis");
    expect(priceSummary(event({ prices: [price(20000), price(15000)] }))).toMatch(/^Desde \$\s?15\.000$/);
    expect(priceSummary(event())).toBe("");
  });

  it("event counts", () => {
    expect(eventCountLabel(1)).toBe("1 evento");
    expect(eventCountLabel(5)).toBe("5 eventos");
  });

  it("rhythms as the filters name them: capitalized, the catch-all as «Otros ritmos»", () => {
    expect(styleLabel("urbano")).toBe("Urbano");
    expect(styleLabel("salsa caleña")).toBe("Salsa caleña");
    expect(styleLabel("otro")).toBe("Otros ritmos");
    expect(stylesLabel(["salsa", "otro", "urbano"])).toBe("Salsa · Otros ritmos · Urbano");
    expect(stylesLabel(["salsa", "bachata", "tango", "urbano"], 3)).toBe("Salsa · Bachata · Tango");
  });

  it("escapes HTML", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  });
});

describe("short dates", () => {
  it("names weekdays and months without Intl's dot", () => {
    expect(shortWeekdayName("2026-11-08")).toBe("dom");
    expect(shortMonthName("2026-11-08")).toBe("nov");
    expect(shortWeekdayAndDay("2026-10-03")).toBe("sáb 3");
  });

  it("writes a weekday and its day as Intl does, every day of a year", () => {
    const intl = new Intl.DateTimeFormat(LOCALE, { weekday: "short", day: "numeric" });
    for (let day = 0; day < 366; day++) {
      const iso = addDays("2026-01-01", day);
      expect(shortWeekdayAndDay(iso)).toBe(intl.format(parseIsoDate(iso)).replace(".", ""));
    }
  });

  it("tells whether two days share a month", () => {
    expect(sameMonth("2026-10-01", "2026-10-31")).toBe(true);
    expect(sameMonth("2026-10-31", "2026-11-01")).toBe(false);
    expect(sameMonth("2026-10-03", "2027-10-03")).toBe(false);
  });
});

describe("calendar times", () => {
  it("an event without a time is all day", () => {
    expect(eventTimes(event({ date: "2026-10-24" }))).toEqual({ start: "20261024", end: "20261025", allDay: true });
  });

  it("without an end time it lasts four hours, past midnight if needed", () => {
    expect(eventTimes(event({ date: "2026-10-24", start_time: "21:00" }))).toEqual({
      start: "20261024T210000",
      end: "20261025T010000",
      allDay: false,
    });
  });

  it("an end before the start finishes the next day", () => {
    const times = eventTimes(event({ date: "2026-10-24", start_time: "20:00", end_time: "01:00" }));
    expect(times.end).toBe("20261025T010000");
  });
});

describe("events over several days", () => {
  // Level Up: Friday 13 to Sunday 15 November 2026.
  const congress = event({ date: "2026-11-13", end_date: "2026-11-15", start_time: "18:00" });
  const when = (today: string) => cardWhenLabel(congress, today);

  it("the card says when, by where today falls", () => {
    expect(when("2026-10-03")).toBe("Vie 13 – dom 15 nov");
    expect(when("2026-11-09")).toBe("Viernes 13 – domingo 15");
    expect(when("2026-11-12")).toBe("Mañana · hasta el domingo 15");
    expect(when("2026-11-13")).toBe("Hoy · hasta el domingo 15");
    expect(when("2026-11-14")).toBe("En curso · termina mañana");
    expect(when("2026-11-15")).toBe("En curso · último día");
    expect(cardWhenLabel(event({ date: "2026-11-13", end_date: "2026-11-17" }), "2026-11-14")).toBe(
      "En curso · hasta el martes 17",
    );
    expect(cardWhenLabel(event({ date: "2026-10-31", end_date: "2026-11-02" }), "2026-10-03")).toBe("Sáb 31 oct – lun 2 nov");
    expect(cardWhenLabel(event({ date: "2026-11-13", start_time: "21:00" }), "2026-11-13")).toBe("Hoy · 9:00 p. m.");
  });

  it("the sticker shows the days in one month, the first day across months", () => {
    expect(stickerDate(congress)).toEqual({ day: "13–15", month: "NOV", range: true });
    expect(stickerDate(event({ date: "2026-10-31", end_date: "2026-11-02" }))).toEqual({ day: "31", month: "OCT", range: false });
    expect(stickerDate(event({ date: "2026-10-03" }))).toEqual({ day: "03", month: "OCT", range: false });
  });

  it("the detail says its days in full", () => {
    expect(eventDaysLabel(congress)).toBe("Viernes 13 al domingo 15 de noviembre");
    expect(eventDaysLabel(event({ date: "2026-10-31", end_date: "2026-11-02" }))).toBe(
      "Sábado 31 de octubre al lunes 2 de noviembre",
    );
    expect(eventDaysLabel(event({ date: "2026-10-03", end_date: null }))).toBe("Sábado, 3 de octubre");
  });

  it("calendars get it all day, the end being the day after its last", () => {
    expect(eventTimes(congress)).toEqual({ start: "20261113", end: "20261116", allDay: true });
    expect(eventTimes(event({ date: "2026-12-30", end_date: "2027-01-01" }))).toEqual({
      start: "20261230",
      end: "20270102",
      allDay: true,
    });
  });
});
