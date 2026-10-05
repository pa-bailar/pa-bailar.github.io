// Wide screens: the toolbar's dropdown pills (Cuándo, Ritmo, Tipo), their panels and the status row under them, and a
// guard that the old rows of chips (dates, types, rhythms) are gone.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { addDays, todayIso } from "../src/scripts/lib/dates";
import { TOMORROW, createInitialState } from "../src/scripts/state";
import { filterModel } from "../src/scripts/lib/filterModel";
import { panelHtml, pillHtml, pillsRowHtml, statusHtml } from "../src/scripts/views/filters";
import { arrowKey, panelId } from "../src/scripts/views/filterPanels";
import { event } from "./factories";

const today = todayIso();
const list = { ...createInitialState(), view: "upcoming" as const };
const events = [
  event({ id: "hoy", date: today, styles: ["salsa caleña"], event_type: "social" }),
  event({ id: "manana", date: addDays(today, 1), styles: ["bachata"], event_type: "workshop" }),
  event({ id: "luego", date: addDays(today, 40), styles: ["kizomba", "otro"], event_type: "workshop" }),
  event({ id: "bar", date: addDays(today, 2), styles: ["salsa"], event_type: "social", bar: true }),
];
type State = typeof list;
const model = (changes: Partial<State> = {}) => filterModel(events, { ...list, ...changes }, today);
const month = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, 1);
const calendar = { ...list, view: "calendar" as const, month };

describe("the toolbar's pills", () => {
  it("are Cuándo, Ritmo and Tipo in the list; the calendar keeps its month, so no Cuándo", () => {
    expect(model().pills.map((pill) => pill.label)).toEqual(["Cuándo", "Ritmo", "Tipo"]);
    expect(filterModel(events, calendar, today).pills.map((pill) => pill.key)).toEqual(["styles", "types"]);
  });

  it("say how many are chosen, and their names say it in words", () => {
    const pills = model({ styles: ["salsa", "kizomba"], types: ["social"] }).pills;
    expect(pills.map((pill) => [pill.label, pill.name, pill.count])).toEqual([
      ["Cuándo", "Cuándo: Cualquier fecha", 0],
      ["Ritmo · 2", "Ritmo, 2 elegidos", 2],
      ["Tipo · 1", "Tipo, 1 elegido", 1],
    ]);
  });

  it("Cuándo says the date chosen, as the phone bar's does", () => {
    expect(model({ dates: [TOMORROW] }).pills[0]).toMatchObject({ label: "Mañana", name: "Cuándo: Mañana", count: 1 });
    expect(model({ dates: ["hoy", TOMORROW] }).pills[0]).toMatchObject({ label: "Hoy +1", count: 2 });
  });

  it("the counts are the phone sheet's: the same chosen options", () => {
    const chosen = model({ styles: ["salsa", "bachata"], types: ["workshop"] });
    expect(chosen.pills[1].count).toBe(chosen.styles.filter((item) => item.chosen).length);
    expect(chosen.pills[2].count).toBe(chosen.types.filter((item) => item.chosen).length);
  });

  it("are buttons that open their panel: aria-haspopup, aria-expanded, aria-controls, chosen colors when in use", () => {
    const [when, styles] = model({ styles: ["salsa", "bachata"] }).pills;
    const ritmo = pillHtml(styles, true);
    expect(ritmo).toContain('aria-haspopup="dialog"');
    expect(ritmo).toContain('aria-expanded="true"');
    expect(ritmo).toContain(`aria-controls="${panelId("styles")}"`);
    expect(ritmo).toContain('aria-label="Ritmo, 2 elegidos"');
    expect(ritmo).toContain("is-chosen");
    expect(ritmo).toContain("Ritmo · 2");
    const cuando = pillHtml(when, false);
    expect(cuando).toContain('aria-haspopup="menu"');
    expect(cuando).toContain('aria-expanded="false"');
    expect(cuando).not.toContain("is-chosen");
  });

  it("the row ends with the toggle chip \"Ocultar bares\", pressed while the bars are hidden", () => {
    const row = pillsRowHtml(model({ hideBars: true }), null);
    expect(row.match(/data-pill=/g)).toHaveLength(3);
    expect(row).toMatch(/data-filter="bars"[^>]*aria-pressed="true"/);
    expect(row.indexOf("Ocultar bares")).toBeGreaterThan(row.lastIndexOf("data-pill="));
  });
});

describe("the pills' panels", () => {
  it("Ritmo: the rhythms under their families, each with its count, as toggle chips", () => {
    const html = panelHtml("styles", model({ styles: ["kizomba"] }));
    const families = [...html.matchAll(/class="filter-family__name"[^>]*>([^<]+)</g)].map((match) => match[1]);
    expect(families).toEqual(["Salsa", "Bachata", "Urbanos", "Otros"]);
    expect(html).toContain('id="panel-family-salsa"');
    expect(html).toMatch(/data-value="kizomba"\s+aria-pressed="true"/);
    expect(html).toContain('aria-label="Salsa, 2 eventos"');
  });

  it("Tipo: every type with its count; Cuándo: the phone's menu", () => {
    const types = panelHtml("types", model());
    expect(types).toContain('data-filter="types" data-value="workshop"');
    expect(types).toContain('aria-label="Taller, 2 eventos"');
    expect(panelHtml("when", model())).toContain('role="menuitemradio"');
    expect(panelHtml("when", filterModel(events, calendar, today))).toBe("");
  });

  it("the arrows move along the chips: → as ↓, ← as ↑", () => {
    expect([arrowKey("ArrowRight"), arrowKey("ArrowLeft"), arrowKey("Home")]).toEqual(["ArrowDown", "ArrowUp", "Home"]);
  });
});

describe("the status row under the pills", () => {
  it("only while filtering: the count, every choice as a removable chip, and Limpiar", () => {
    expect(statusHtml(model(), list)).toBe("");
    const state = { ...list, dates: ["hoy"], styles: ["salsa"], types: ["social" as const], hideBars: true };
    const html = statusHtml(filterModel(events, state, today), state);
    expect(html).toContain("<b>1 evento</b>");
    const chips = [...html.matchAll(/aria-label="(Quitar [^"]+|Mostrar[^"]+)"/g)].map((match) => match[1]);
    // The bars: no chip here, their "Ocultar bares" pill shows it's on (the owner, 5 Oct 2026).
    expect(chips).toEqual(["Quitar Hoy", "Quitar Salsa", "Quitar Social"]);
    expect(html).toContain('data-clear-filters aria-label="Limpiar filtros"');
  });

  it("in the calendar it says the month, and no date", () => {
    const state = { ...calendar, styles: ["salsa"], dates: ["hoy"] };
    const html = statusHtml(filterModel(events, state, today), state);
    expect(html).toMatch(/<b>\d+ eventos?<\/b> en [a-z]+/);
    expect(html).not.toContain('data-filter="dates"');
  });
});

describe("the toolbar on wide screens (ViewToolbar.astro)", () => {
  const source = readFileSync(new URL("../src/components/ViewToolbar.astro", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/styles/components/toolbar.css", import.meta.url), "utf8");

  it("no longer has rows of date, type and rhythm chips: one row of pills, their panels and the status row", () => {
    for (const gone of ["date-filters", "type-filters", "style-filters", "chip-row"]) {
      expect(source).not.toContain(gone);
      expect(css).not.toContain(gone);
    }
    expect(source).toContain('id="filter-pills"');
    for (const key of ["when", "styles", "types"] as const) expect(source).toContain(`id="${panelId(key)}"`);
    expect(source).toMatch(/id="pill-panel-when" role="menu" aria-label="Cuándo"/);
    expect(source).toMatch(/id="pill-panel-styles" role="dialog" aria-label="Ritmo"/);
    expect(source).toContain('id="filter-status"');
  });
});
