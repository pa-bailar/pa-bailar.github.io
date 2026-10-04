import { describe, expect, it } from "vitest";
import { detailsEventName } from "../src/scripts/lib/analytics";
import { eventDetailHtml, eventDrawerHtml, sheetPrice } from "../src/scripts/views/eventDetail";
import { event } from "./factories";

describe("the analytics event for opened details", () => {
  it("names where they were opened from", () => {
    expect(detailsEventName("tarjeta")).toBe("detalles-tarjeta");
    expect(detailsEventName("boton")).toBe("detalles-boton");
    expect(detailsEventName("enlace")).toBe("detalles-enlace");
  });

  it("anything else counts as the card (also the retired line under it, \"linea\")", () => {
    expect(detailsEventName(undefined)).toBe("detalles-tarjeta");
    expect(detailsEventName("linea")).toBe("detalles-tarjeta");
    expect(detailsEventName("<script>")).toBe("detalles-tarjeta");
  });
});

describe("the details drawer", () => {
  const html = (overrides = {}) => eventDrawerHtml(event(overrides), { titleId: "drawer-title" });

  it("starts with when, the title, the type and the account, ×, then the quick actions and the details", () => {
    const drawer = html({ title: "Social de salsa", start_time: "20:00", venue: "La Topa", account: "latopa" });
    const order = [
      "event-dialog__when",
      'id="drawer-title"',
      "tag-type",
      "@latopa",
      "data-close-drawer",
      "quick-actions",
      "stripes",
      "detail-list",
      "Ver en Instagram",
      "Repórtalo",
    ];
    const positions = order.map((part) => drawer.indexOf(part));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(drawer).toContain("Social de salsa");
  });

  it("has no flyer and no thumbnail: the card is right there", () => {
    expect(html()).not.toContain("<img");
    expect(html()).not.toContain("<video");
    expect(eventDetailHtml(event(), 0)).toContain("<img"); // the event's own page keeps the flyer on top
  });

  it("offers Cómo llegar only when there's a place to go", () => {
    expect(html({ venue: "La Topa" })).toContain("<span>Cómo llegar</span>");
    expect(html()).not.toContain("<span>Cómo llegar</span>");
    expect(html()).toContain("<span>Compartir</span>");
    expect(html()).toContain("<span>Guardar</span>");
  });

  it("lists when, where, the price and who organizes, in that order", () => {
    const drawer = html();
    const terms = ["<dt>Cuándo</dt>", "<dt>Lugar</dt>", "<dt>Precio</dt>", "<dt>Organiza</dt>"].map((term) => drawer.indexOf(term));
    expect(terms.every((position) => position >= 0)).toBe(true);
    expect([...terms].sort((a, b) => a - b)).toEqual(terms);
  });

  it("links to the video with sound and to the other posts, only when there are", () => {
    const [post] = event().media;
    const video = { ...post, post_id: "v", media_type: "VIDEO" as const, preview: "previews/v.mp4" };
    expect(html()).not.toContain("data-media-link");
    expect(html({ media: [video] })).toContain("Ver el video con sonido");
    expect(html({ media: [post, video, { ...post, post_id: "p3" }] })).toContain("Ver las 3 publicaciones");
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
