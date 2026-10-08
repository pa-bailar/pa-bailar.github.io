// The rhythms' families (the owner's list, 5 Oct 2026): how the "Filtros" sheet and the toolbar's Ritmo panel group
// the rhythms under small headings, so a long list reads at a glance. Every rhythm of the data contract
// (scripts/check-data.mjs, STYLES) is in exactly one family (tests/styleFamilies.test.ts). Only for showing: choosing
// "Salsa" still includes its variants (state.ts, styleMatches).

export interface StyleFamily {
  key: string;
  label: string; // the heading: "Salsa", "Urbanos"
  styles: string[]; // its rhythms, as in the data ("otro" is "Otros ritmos")
}

/** In the order shown. Within a family, the rhythms keep the filters' own order (lib/filterModel.ts). */
export const STYLE_FAMILIES: readonly StyleFamily[] = [
  { key: "salsa", label: "Salsa", styles: ["salsa", "salsa en línea", "salsa caleña", "salsa cubana", "cha cha chá"] },
  { key: "bachata", label: "Bachata", styles: ["bachata", "bachata sensual", "bachata dominicana"] },
  { key: "urbanos", label: "Urbanos", styles: ["urbano", "dancehall", "afro", "heels"] },
  {
    key: "otros",
    label: "Otros",
    styles: ["merengue", "son", "champeta", "tango", "swing", "kizomba", "zouk", "otro"],
  },
];

const OTHERS = STYLE_FAMILIES.at(-1)!;

/** The family a rhythm belongs to; one the list doesn't know (newer data) goes with "Otros". */
export function familyOf(style: string): StyleFamily {
  return STYLE_FAMILIES.find((family) => family.styles.includes(style)) ?? OTHERS;
}

export interface FamilyGroup<T> {
  family: StyleFamily;
  items: T[];
}

/**
 * `items` (rhythm options, in the filters' order) under their families, in the families' order; each family keeps
 * the items' order. A family with nothing in `items` isn't there.
 */
export function groupByFamily<T extends { value: string }>(items: T[]): FamilyGroup<T>[] {
  return STYLE_FAMILIES.map((family) => ({ family, items: items.filter((item) => familyOf(item.value) === family) })).filter(
    (group) => group.items.length > 0,
  );
}
