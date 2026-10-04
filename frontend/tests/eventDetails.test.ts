import { describe, expect, it } from "vitest";
import { detailsEventName } from "../src/scripts/lib/analytics";
import { detailsTeaser } from "../src/scripts/views/eventCard";
import { eventSheetHtml, sheetPrice } from "../src/scripts/views/eventDetail";
import { event } from "./factories";

describe("the analytics event for opened details", () => {
  it("names where they were opened from", () => {
    expect(detailsEventName("tarjeta")).toBe("detalles-tarjeta");
    expect(detailsEventName("boton")).toBe("detalles-boton");
    expect(detailsEventName("linea")).toBe("detalles-linea");
    expect(detailsEventName("enlace")).toBe("detalles-enlace");
  });

  it("anything else counts as the card", () => {
    expect(detailsEventName(undefined)).toBe("detalles-tarjeta");
    expect(detailsEventName("<script>")).toBe("detalles-tarjeta");
  });
});

describe("the line under a card: what the details add", () => {
  const price = { label: "General", amount_cop: 25000, condition: null };

  it("names the time, the prices and the way there when the event has them", () => {
    expect(detailsTeaser(event({ start_time: "20:00", prices: [price], venue: "La Topa" }))).toBe(
      "Ver horario, precios y cómo llegar",
    );
  });

  it("leaves out what's missing", () => {
    expect(detailsTeaser(event({ start_time: "20:00", prices: [price] }))).toBe("Ver horario y precios");
    expect(detailsTeaser(event({ address: "Calle 85 # 12-20" }))).toBe("Ver cómo llegar");
  });

  it("with none of them, all the details", () => {
    expect(detailsTeaser(event())).toBe("Ver todos los detalles");
  });
});

describe("the viewer's sheet", () => {
  const bar = `<div class="viewer-bar"></div>`;
  const html = (overrides = {}) => eventSheetHtml(event(overrides), 0, { titleId: "event-title-3", bar });

  it("starts with the thumbnail, when and the title, then the quick actions", () => {
    const sheet = html({ title: "Social de salsa", start_time: "20:00", venue: "La Topa" });
    const order = ["viewer-bar", "event-sheet__thumb", "event-dialog__when", 'id="event-title-3"', "event-sheet__quick", "detail-list"];
    const positions = order.map((part) => sheet.indexOf(part));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(sheet).toContain("Social de salsa");
  });

  it("offers Cómo llegar only when there's a place to go", () => {
    expect(html({ venue: "La Topa" })).toContain("<span>Cómo llegar</span>");
    expect(html()).not.toContain("<span>Cómo llegar</span>");
    expect(html()).toContain("<span>Compartir</span>");
    expect(html()).toContain("<span>Guardar</span>");
  });

  it("lists when, where, the price and who organizes, in that order", () => {
    const sheet = html();
    const terms = ["<dt>Cuándo</dt>", "<dt>Lugar</dt>", "<dt>Precio</dt>", "<dt>Organiza</dt>"].map((term) => sheet.indexOf(term));
    expect(terms.every((position) => position >= 0)).toBe(true);
    expect([...terms].sort((a, b) => a - b)).toEqual(terms);
  });

  it("escapes the event's text", () => {
    expect(html({ title: `<img src=x onerror="alert(1)">` })).not.toContain("<img src=x");
  });

  it("says the price in one line", () => {
    const options = [
      { label: "Preventa", amount_cop: 25000, condition: null },
      { label: "Taquilla", amount_cop: 30000, condition: null },
    ];
    expect(sheetPrice(event({ prices: options }))).toMatch(/^Desde \$\s?25\.000 <span class="to-confirm">· 2 opciones<\/span>$/);
    expect(sheetPrice(event({ prices: [{ label: "Entrada", amount_cop: 0, condition: null }] }))).toBe("Gratis");
    expect(sheetPrice(event())).toContain("Por confirmar");
  });
});
