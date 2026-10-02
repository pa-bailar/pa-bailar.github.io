import { describe, expect, it } from "vitest";
import { escapeHtml } from "../src/scripts/lib/dom";
import { eventCountLabel, formatTime, priceSummary } from "../src/scripts/lib/format";
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

  it("escapes HTML", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
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
