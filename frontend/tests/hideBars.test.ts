import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { addDays, todayIso } from "../src/scripts/lib/dates";
import { HIDDEN_BARS, filterModel, summaryLine } from "../src/scripts/lib/filterModel";
import { storedSwitch } from "../src/scripts/lib/storedSwitch";
import {
  HIDE_BARS_KEY,
  activeFilterCount,
  clearFilters,
  createInitialState,
  hasActiveFilters,
  isBar,
  matchesFilters,
  visibleEvents,
} from "../src/scripts/state";
import { calendarDays, dotsHtml } from "../src/scripts/views/calendarView";
import { barsSwitchHtml } from "../src/scripts/views/filters";
import { event } from "./factories";

// "Ocultar eventos de bares" (docs/DESIGN.md, "Filters"): events with `bar: true` stay visible by default; the switch
// hides them wherever the filters apply, counts one on ⚙'s badge, is cleared by "Limpiar" and is remembered.

const today = todayIso();
const list = { ...createInitialState(), view: "upcoming" as const };
const academy = event({ id: "academia-hoy", date: today, styles: ["salsa"] });
const older = event({ id: "sin-campo", date: today, styles: ["bachata"] }); // data written before `bar` existed
delete older.bar;
const notBar = event({ id: "no-es-bar", date: today, styles: ["salsa"], bar: false });
const barTonight = event({ id: "bar-hoy", date: today, styles: ["salsa"], bar: true });
const barLater = event({ id: "bar-luego", date: addDays(today, 3), styles: ["bachata"], event_type: "concert", bar: true });
const all = [academy, older, notBar, barTonight, barLater];
const ids = (events: { id: string }[]) => events.map((e) => e.id);

describe("which events are a bar's", () => {
  it("only `bar: true`; absent or false is not a bar", () => {
    expect(all.filter(isBar).map((e) => e.id)).toEqual(["bar-hoy", "bar-luego"]);
    expect(isBar(older)).toBe(false);
    expect(isBar(notBar)).toBe(false);
  });
});

describe("the filter", () => {
  const shown = (changes: Partial<typeof list>) => ids(all.filter((e) => matchesFilters(e, { ...list, ...changes })));

  it("is off by default: every event shows, bars included", () => {
    expect(list.hideBars).toBe(false);
    expect(shown({})).toEqual(ids(all));
  });

  it("on, it leaves out the bars' events, and only those (absent `bar` stays)", () => {
    expect(shown({ hideBars: true })).toEqual(["academia-hoy", "sin-campo", "no-es-bar"]);
  });

  it("works with the other filters and the search, in the list and the calendar", () => {
    expect(shown({ hideBars: true, styles: ["salsa"] })).toEqual(["academia-hoy", "no-es-bar"]);
    expect(shown({ hideBars: true, query: "social" })).toEqual(["academia-hoy", "sin-campo", "no-es-bar"]);
    expect(ids(visibleEvents(all, { ...list, hideBars: true }))).not.toContain("bar-hoy");
    const calendar = { ...list, view: "calendar" as const, selectedDay: today, hideBars: true };
    expect(ids(visibleEvents(all, calendar))).toEqual(["academia-hoy", "sin-campo", "no-es-bar"]);
  });
});

describe("⚙'s badge, the chips and Limpiar", () => {
  it("hiding the bars counts one, in the list and in the calendar; off, nothing", () => {
    expect(activeFilterCount(list)).toBe(0);
    expect(activeFilterCount({ ...list, hideBars: true })).toBe(1);
    expect(activeFilterCount({ ...list, hideBars: true, styles: ["salsa", "bachata"] })).toBe(3);
    expect(activeFilterCount({ ...list, view: "calendar", hideBars: true })).toBe(1);
    expect(hasActiveFilters({ ...list, hideBars: true })).toBe(true);
  });

  it("shows as \"Sin bares\": last among the choices, removable after ⚙, in the line under the bar", () => {
    const state = { ...list, hideBars: true, types: ["social" as const] };
    const model = filterModel(all, state, today);
    expect(model.hideBars).toBe(true);
    expect(model.active).toBe(2);
    expect(model.applied.at(-1)).toEqual(HIDDEN_BARS);
    expect(model.extra.map((item) => item.label)).toEqual(["Social", "Sin bares"]);
    expect(summaryLine(model, state).names).toBe("Social, Sin bares");
    expect(filterModel(all, list, today).applied).toEqual([]);
  });

  it("the options' counts and the sheet's button leave the bars out while hidden", () => {
    const pick = (hideBars: boolean, value: string) =>
      filterModel(all, { ...list, hideBars }, today).styles.find((option) => option.value === value)!.count;
    expect([pick(false, "salsa"), pick(true, "salsa")]).toEqual([3, 2]);
    expect([pick(false, "bachata"), pick(true, "bachata")]).toEqual([2, 1]);
    const concerts = (hideBars: boolean) => filterModel(all, { ...list, hideBars }, today).types.find((t) => t.value === "concert")!;
    expect(concerts(true)).toMatchObject({ count: 0, dimmed: true }); // only a bar has one: dimmed in place
    expect(filterModel(all, { ...list, hideBars: true }, today).shown).toBe(3);
  });

  it("Limpiar shows the bars again", () => {
    const state = { ...list, hideBars: true };
    clearFilters(state);
    expect(state.hideBars).toBe(false);
  });

  it("the sheet's switch: off by default, a named switch with its hint, the chip's data so one handler toggles it", () => {
    const off = barsSwitchHtml(false);
    expect(off).toContain('role="switch"');
    expect(off).toContain('aria-checked="false"');
    expect(off).toContain('data-filter="bars" data-value="ocultar"');
    expect(off).toContain("Ocultar eventos de bares");
    expect(off).toContain('aria-describedby="filter-bars-hint"');
    expect(barsSwitchHtml(true)).toContain('aria-checked="true"');
  });
});

describe("the calendar", () => {
  const month = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, 1);
  const calendar = { ...list, view: "calendar" as const, month, selectedDay: today };
  const dots = (html: string) => (html.match(/class="cal-dot /g) ?? []).length;

  it("its days' dots, counts and lists leave the bars out while hidden", () => {
    const shown = calendarDays(all, calendar).get(today)!;
    const hidden = calendarDays(all, { ...calendar, hideBars: true }).get(today)!;
    expect([shown.length, hidden.length]).toEqual([4, 3]);
    expect(ids(hidden)).not.toContain("bar-hoy");
    expect([dots(dotsHtml(shown)), dots(dotsHtml(hidden))]).toEqual([4, 3]);
    // A day with only a bar's event has nothing left: no dots, no count.
    expect(calendarDays(all, { ...calendar, hideBars: true }).get(addDays(today, 3))).toBeUndefined();
  });
});

describe("remembered in this browser", () => {
  function memoryStorage() {
    const items = new Map<string, string>();
    return {
      items,
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => void items.set(key, value),
      removeItem: (key: string) => void items.delete(key),
    };
  }
  const broken = {
    getItem: (): string | null => {
      throw new Error("SecurityError");
    },
    setItem: () => {
      throw new Error("QuotaExceededError");
    },
    removeItem: () => {
      throw new Error("SecurityError");
    },
  };
  const startWith = (setting: ReturnType<typeof storedSwitch>) => createInitialState({ hideBars: setting.on() });

  it("off on a first visit; on, read at the start of the next one; off again, forgotten", () => {
    const storage = memoryStorage();
    expect(startWith(storedSwitch(HIDE_BARS_KEY, () => storage)).hideBars).toBe(false);
    storedSwitch(HIDE_BARS_KEY, () => storage).set(true);
    expect(storage.items.get("hide-bars")).toBe("1");
    expect(startWith(storedSwitch(HIDE_BARS_KEY, () => storage)).hideBars).toBe(true); // the next visit
    storedSwitch(HIDE_BARS_KEY, () => storage).set(false);
    expect(storage.items.has("hide-bars")).toBe(false);
    expect(startWith(storedSwitch(HIDE_BARS_KEY, () => storage)).hideBars).toBe(false);
  });

  it("an unexpected stored value reads as off", () => {
    const storage = memoryStorage();
    storage.items.set("hide-bars", "true");
    expect(storedSwitch(HIDE_BARS_KEY, () => storage).on()).toBe(false);
  });

  it("with storage blocked: off at the start, and what the visitor sets holds for the visit without throwing", () => {
    const setting = storedSwitch(HIDE_BARS_KEY, () => broken);
    expect(startWith(setting).hideBars).toBe(false);
    expect(() => setting.set(true)).not.toThrow();
    expect(setting.on()).toBe(true);
    setting.set(false);
    expect(setting.on()).toBe(false);
  });

  it("no localStorage at all (outside a browser) is the same", () => {
    const setting = storedSwitch(HIDE_BARS_KEY);
    expect(setting.on()).toBe(false);
    expect(() => setting.set(true)).not.toThrow();
    expect(setting.on()).toBe(true);
  });
});

describe("one rule for every path (guard)", () => {
  const scripts = path.resolve(__dirname, "../src/scripts");
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name);
      return statSync(full).isDirectory() ? files(full) : full.endsWith(".ts") ? [full] : [];
    });
  const source = (relative: string) => readFileSync(path.join(scripts, relative), "utf8");

  it("only state.ts decides what a bar's event is: no other script reads `bar` off an event", () => {
    const readers = files(scripts)
      .filter((file) => !/[\\/](state|types)\.ts$/.test(file))
      .filter((file) => /\b\w*(?:event|Event|e)\??\.bar\b|\.bar\s*[=!]==|["']bar["']\s+in\b/.test(readFileSync(file, "utf8")));
    expect(readers.map((file) => path.relative(scripts, file))).toEqual([]);
  });

  it("the list, the calendar and the filters' counts all filter through matchesFilters", () => {
    for (const file of ["views/upcomingView.ts", "views/calendarView.ts", "lib/filterModel.ts"]) {
      expect(source(file), file).toMatch(/matchesFilters\(event, state/);
    }
  });
});
