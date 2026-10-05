import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { emptySavedHtml, savedLists } from "../src/scripts/views/savedView";
import { activeFilterCount, createInitialState, matchesFilters } from "../src/scripts/state";
import { event } from "./factories";

const now = "2026-10-10 12:00";
const past = event({ id: "pasado", title: "Social pasado", date: "2026-10-03" });
const older = event({ id: "viejo", title: "Taller viejo", date: "2026-09-20" });
const soon = event({ id: "pronto", title: "Social de salsa", date: "2026-10-11", styles: ["salsa"] });
const later = event({ id: "luego", title: "Noche de bachata", date: "2026-10-24", styles: ["bachata"] });
const other = event({ id: "otro", title: "Otro social", date: "2026-10-12" });
const events = [older, later, past, soon, other];
const saved = (id: string) => id !== "otro";

describe("Guardados: a place of its own", () => {
  it("the saved events still to come, and the past ones, the latest first; never the unsaved", () => {
    const lists = savedLists(events, { saved, query: "", now });
    expect(lists.upcoming.map((item) => item.id).sort()).toEqual(["luego", "pronto"]);
    expect(lists.past.map((item) => item.id)).toEqual(["pasado", "viejo"]);
  });

  it("the search applies there, as in every view", () => {
    const lists = savedLists(events, { saved, query: "bachata", now });
    expect(lists.upcoming.map((item) => item.id)).toEqual(["luego"]);
    expect(lists.past).toEqual([]);
  });

  it("the filters don't: a saved event is there whatever the list's filters are (they stay set for the list)", () => {
    const state = { ...createInitialState(), view: "saved" as const, styles: ["tango"], dates: ["hoy"] };
    expect(matchesFilters(soon, state)).toBe(false); // the filters themselves are unchanged…
    expect(savedLists(events, { saved, query: state.query, now }).upcoming).toHaveLength(2); // …Guardados ignores them
    expect(activeFilterCount(state)).toBe(2); // Filtros' badge stays as in the list
  });

  it("nothing saved: how to save, and the way to the events; a search with nothing: how to clear it", () => {
    const empty = emptySavedHtml("");
    expect(empty).toContain("Aún no tienes eventos guardados");
    expect(empty).toContain('data-view="upcoming"');
    const searched = emptySavedHtml(" <b>zouk ");
    expect(searched).toContain("No encontramos eventos guardados");
    expect(searched).toContain("«&lt;b&gt;zouk»");
    expect(searched).toContain("data-clear-search");
  });

  it("its own page, /guardados/, not indexed nor in the sitemap, stored for offline use", () => {
    const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
    expect(read("src/pages/guardados/index.astro")).toContain('<HomePage view="saved" />');
    expect(read("src/components/HomePage.astro")).toContain('noindex={view === "saved"}');
    expect(read("astro.config.mjs")).toContain('!page.includes("/guardados/")');
    expect(read("src/pages/sw.js.ts")).toContain('"/guardados/"');
  });
});
