import { describe, expect, it } from "vitest";
import { dateRangeLabel, eventShareText, periodShareText, plansShareText, shortDayLabel } from "../src/scripts/lib/shareText";
import { event } from "./factories";

const salsa = event({ id: "salsa", title: "Salsa Freestyle", date: "2026-10-03", start_time: "18:00", account: "madyumdance" });
const social = event({ id: "social", title: "Social Espacio Seguro", date: "2026-10-04", start_time: null, account: "zafradance" });

describe("shared texts", () => {
  it("date ranges read naturally, across months too", () => {
    expect(dateRangeLabel("2026-10-02", "2026-10-04")).toBe("Viernes 2 al domingo 4 de octubre");
    expect(dateRangeLabel("2026-10-30", "2026-11-01")).toBe("Viernes 30 de octubre al domingo 1 de noviembre");
    expect(dateRangeLabel("2026-10-04", "2026-10-04")).toBe("Domingo 4 de octubre");
    expect(shortDayLabel("2026-10-03")).toBe("SÁB 3");
  });

  it("a period is its title and one line per event, for WhatsApp", () => {
    expect(periodShareText("Este finde en Bogotá", [salsa, social]).split("\n")).toEqual([
      "*Este finde en Bogotá* 💃🕺",
      "• Sáb 3 · 6:00 p. m. — *Salsa Freestyle* (@madyumdance)",
      "• Dom 4 — *Social Espacio Seguro* (@zafradance)",
    ]);
  });

  it("plans carry each event's link", () => {
    const text = plansShareText([salsa, social], (item) => `https://x/${item.id}`);
    expect(text).toContain("*Mis planes para bailar* 💃🕺 (2 eventos)");
    expect(text).toContain("  https://x/salsa");
    expect(text).toContain("  https://x/social");
  });

  it("an event says what, when and where", () => {
    expect(eventShareText(salsa).split("\n")[0]).toBe("*Salsa Freestyle*");
  });
});
