import { describe, expect, it } from "vitest";
import { todayIso } from "../src/scripts/lib/dates";
import { FREE_FILTER, filterModel } from "../src/scripts/lib/filterModel";
import {
  activeFilterCount,
  clearFilters,
  createInitialState,
  isFilterGroup,
  isFree,
  matchesFilters,
  withoutFilters,
} from "../src/scripts/state";
import { freeSwitchHtml, pillsRowHtml, statusHtml } from "../src/scripts/views/filters";
import type { DanceEvent } from "../src/scripts/types";
import { event } from "./factories";

// The "Gratis" filter (the owner, 28 Oct 2026; docs/DESIGN.md, "Filters"): only events every price of which is $0, the
// same rule as the cards' green "Gratis". A filter like the types and rhythms: it counts on the badge, "Limpiar" clears
// it, the other filters count against it, and it isn't remembered.

const today = todayIso();
const list = { ...createInitialState(), view: "upcoming" as const };
const priced = (id: string, ...amounts: number[]): DanceEvent =>
  event({ id, date: today, prices: amounts.map((amount_cop) => ({ label: "Entrada", amount_cop, condition: null })) });
const free = priced("libre", 0);
const freeTwice = priced("libre-dos", 0, 0);
const paid = priced("pago", 20000);
const fromFree = priced("desde-cero", 0, 20000); // free with a condition, paid otherwise: not free
const unknown = priced("sin-precio"); // no price known: not free either
const all = [free, freeTwice, paid, fromFree, unknown];
const ids = (events: DanceEvent[]) => events.map((e) => e.id);

describe("which events are free", () => {
  it("every price $0, and at least one price known", () => {
    expect(ids(all.filter(isFree))).toEqual(["libre", "libre-dos"]);
  });
});

describe("the filter", () => {
  it("shows only the free events while on, every event while off", () => {
    expect(ids(all.filter((e) => matchesFilters(e, { ...list, onlyFree: true })))).toEqual(["libre", "libre-dos"]);
    expect(ids(all.filter((e) => matchesFilters(e, list)))).toEqual(ids(all));
  });

  it("goes with the others (AND): a free social, not a free workshop", () => {
    const workshop = { ...free, id: "taller-libre", event_type: "workshop" as const };
    const state = { ...list, onlyFree: true, types: ["social" as const] };
    expect(ids([free, workshop, paid].filter((e) => matchesFilters(e, state)))).toEqual(["libre"]);
  });

  it("counts one on the badge, and Limpiar and the search alone take it away", () => {
    const state = { ...list, onlyFree: true, styles: ["salsa"] };
    expect(activeFilterCount(state)).toBe(2);
    expect(withoutFilters(state).onlyFree).toBe(false);
    clearFilters(state);
    expect(state.onlyFree).toBe(false);
  });

  it("starts off, and is a filter group a chip can name", () => {
    expect(createInitialState({ hideBars: true }).onlyFree).toBe(false);
    expect(isFilterGroup(FREE_FILTER.group)).toBe(true);
  });
});

describe("its option and chips", () => {
  it("counts the free events the other filters leave, and dims at none", () => {
    expect(filterModel(all, list).free).toMatchObject({ count: 2, chosen: false, dimmed: false });
    const bachata = { ...list, styles: ["bachata"] }; // the factory's events are salsa
    expect(filterModel(all, bachata).free).toMatchObject({ count: 0, dimmed: true });
  });

  it("is a choice in use while on: \"Gratis\", said \"Solo eventos gratis\"", () => {
    const model = filterModel(all, { ...list, onlyFree: true });
    expect(model.applied).toContainEqual({ ...FREE_FILTER, label: "Gratis", name: "Solo eventos gratis" });
    expect(model.shown).toBe(2);
    expect(statusHtml(model, { ...list, onlyFree: true })).toContain('aria-label="Quitar Solo eventos gratis"');
  });

  it("the toolbar's chip comes before \"Ocultar bares\"; the sheet's switch says how many", () => {
    const model = filterModel(all, list);
    const row = pillsRowHtml(model, null);
    expect(row.indexOf('data-filter="free"')).toBeGreaterThan(-1);
    expect(row.indexOf('data-filter="free"')).toBeLessThan(row.indexOf('data-filter="bars"'));
    const sheet = freeSwitchHtml(model.free);
    expect(sheet).toContain('role="switch" aria-checked="false"');
    expect(sheet).toContain("2 eventos con entrada libre.");
    expect(freeSwitchHtml(filterModel(all, { ...list, styles: ["bachata"] }).free)).toContain('aria-disabled="true"');
  });
});
