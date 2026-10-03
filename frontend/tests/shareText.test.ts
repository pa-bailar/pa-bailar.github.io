import { describe, expect, it } from "vitest";
import { dateRangeLabel } from "../src/scripts/lib/format";
import { eventShareText, periodShareText, plansShareText, shortDayLabel } from "../src/scripts/lib/shareText";
import { event } from "./factories";

const salsa = event({ id: "salsa", title: "Salsa Freestyle", date: "2026-10-03", start_time: "18:00", account: "madyumdance" });
const social = event({ id: "social", title: "Social Espacio Seguro", date: "2026-10-04", start_time: null, account: "zafradance" });

describe("shared texts", () => {
  it("date ranges read naturally, across months too", () => {
    expect(dateRangeLabel("2026-10-02", "2026-10-04")).toBe("Viernes 2 al domingo 4 de octubre");
    expect(dateRangeLabel("2026-10-30", "2026-11-01")).toBe("Viernes 30 de octubre al domingo 1 de noviembre");
    expect(dateRangeLabel("2026-10-04", "2026-10-04")).toBe("Domingo 4 de octubre");
    expect(shortDayLabel(event({ date: "2026-10-03" }))).toBe("SÁB 3");
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

describe("shared texts of events over several days", () => {
  const congress = event({ title: "Level Up", date: "2026-11-13", end_date: "2026-11-15", account: "levelupbfc" });
  const festival = event({ title: "Aniversario", date: "2026-10-31", end_date: "2026-11-02", account: "distritosocialbog" });

  it("lists and share cards show their days", () => {
    expect(periodShareText("Hoy en Bogotá", [congress, festival]).split("\n").slice(1)).toEqual([
      "• Vie 13 – dom 15 — *Level Up* (@levelupbfc)",
      "• Sáb 31 oct – lun 2 nov — *Aniversario* (@distritosocialbog)",
    ]);
    expect(shortDayLabel(congress)).toBe("VIE 13 – DOM 15");
  });

  it("one event says its days in full", () => {
    expect(eventShareText(congress).split("\n")[1]).toBe("Viernes 13 al domingo 15 de noviembre");
  });
});
