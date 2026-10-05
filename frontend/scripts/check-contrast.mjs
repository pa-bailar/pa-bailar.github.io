// WCAG 2.2 contrast check for every color pair the site uses, in both themes.
// Reads the tokens from src/styles/tokens.css, so it stays in sync with the design system.
// Usage: node scripts/check-contrast.mjs   (exits 1 if any pair fails; run by `npm run check`)

import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/styles/tokens.css", import.meta.url), "utf8");

// ---------- token resolution ----------

function parseDeclarations(text) {
  const map = new Map();
  for (const [, name, value] of text.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    if (!map.has(name)) map.set(name, value.trim());
  }
  return map;
}

const declarations = parseDeclarations(css);

/** Resolve a token to a hex color for "light" or "dark". */
function resolve(token, theme, depth = 0) {
  if (depth > 10) throw new Error(`Token loop at --${token}`);
  const value = declarations.get(token);
  if (!value) throw new Error(`Unknown token --${token}`);
  const lightDark = value.match(/^light-dark\((.+),\s*(var\(--[\w-]+\)|#[0-9a-f]{3,8}|rgb\([^)]*\))\)$/i);
  if (lightDark) return resolveValue(theme === "light" ? lightDark[1] : lightDark[2], theme, depth);
  return resolveValue(value, theme, depth);
}

function resolveValue(value, theme, depth) {
  const reference = value.trim().match(/^var\(--([\w-]+)\)$/);
  if (reference) return resolve(reference[1], theme, depth + 1);
  if (/^#[0-9a-f]{6}$/i.test(value.trim())) return value.trim().toLowerCase();
  throw new Error(`Unsupported color value: ${value}`);
}

// ---------- WCAG math ----------

function channel(c) {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function rgb(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

function luminance(hex) {
  const [r, g, b] = rgb(hex).map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const MINIMUM = { text: 4.5, large: 3, ui: 3 };

// ---------- the pairs the components actually use ----------
// [what, foreground token, background token, kind]
// Not listed on purpose: --divider (decorative separators) and the stripes (brand motif).
const TYPES = ["social", "workshop", "concert", "festival", "congress", "competition", "show", "other"];
const PAIRS = [
  ["Body text on page", "text", "bg", "text"],
  ["Body text on cards / dialog", "text", "surface", "text"],
  ["Body text on callout", "text", "surface-sunken", "text"],
  ["Period heading (26px display)", "period-title", "bg", "text"],
  ["Muted text on page (updated date, footer, inactive tabs and chips)", "text-muted", "bg", "text"],
  ["Muted text on cards (meta, styles, labels, caption)", "text-muted", "surface", "text"],
  ["Muted text on image well (no-flyer placeholder, large)", "text-muted", "surface-sunken", "large"],
  ["Muted text on image well (\"16 publicaciones sobre este evento\")", "text-muted", "surface-sunken", "text"],
  ["Italic accent on page (tagline)", "text-italic", "bg", "text"],
  ["Italic accent on dialog (subheading)", "text-italic", "surface", "text"],
  ["Logo on page (large)", "logo", "bg", "large"],
  ["Logo on page, 404 (large)", "logo", "bg", "large"],
  ["Accent text on cards (event time, 13px bold)", "accent", "surface", "text"],
  ["Primary button text", "on-action", "action", "text"],
  ["\"Gratis\" price tag", "on-free", "free", "text"],
  ["Selected chip text", "chip-active-text", "chip-active-bg", "text"],
  ["Date sticker text", "sticker-text", "sticker-bg", "text"],
  ["Today number in calendar", "today-text", "today-bg", "text"],
  ["Calendar day number", "text", "surface", "text"],
  ["Calendar day number on a holiday", "text", "holiday-bg", "text"],
  ["Past calendar day number (muted; past cells have no fill)", "text-muted", "bg", "text"],
  ...TYPES.map((t) => [`Type tag / calendar pill text on ${t}`, "on-type", `type-${t}`, "text"]),
  // Non-text (WCAG 1.4.11): boundaries and indicators people need to see.
  ["Card / chip / button outline on page", "border", "bg", "ui"],
  ["Card outline on card surface edge", "border", "surface", "ui"],
  ["Focus ring on page", "focus", "bg", "ui"],
  ["Focus ring on cards", "focus", "surface", "ui"],
  ["Active tab underline on page", "accent", "bg", "ui"],
  ["Selected calendar day border on cell", "accent", "surface", "ui"],
  ["Selected chip fill on page", "chip-active-bg", "bg", "ui"],
  ["Selected chip fill in the filter sheet", "chip-active-bg", "surface", "ui"],
  // The filters (docs/DESIGN.md, "Filters"). Dimmed options (--dimmed) are inactive controls: exempt.
  ["Filter chip label and outline on the page (phone bar)", "text", "bg", "text"],
  ["Filter chip count in the sheet", "text-muted", "surface", "text"],
  ["Badge on Filtros / Guardados in the bar at the bottom (11px bold)", "chip-active-text", "chip-active-bg", "text"],
  // The bar at the bottom (docs/DESIGN.md, "The bar at the bottom").
  ["Bottom bar: an item's icon on the page", "text", "bg", "ui"],
  ["Bottom bar: an item's label on the page (11px bold)", "text-muted", "bg", "text"],
  ["Bottom bar: the view on screen, its icon and label (11px bold)", "accent-text", "bg", "text"],
  ["Bottom bar: the view on screen, the line on its top edge", "accent", "bg", "ui"],
  ["Bottom bar: an item that's on, its pill on the page", "chip-active-bg", "bg", "ui"],
  ["Bottom bar: an item that's on, its icon on the pill", "chip-active-text", "chip-active-bg", "ui"],
  ["Filter line: \"× Limpiar\" on the page (13px bold)", "accent-text", "bg", "text"],
  ["Filter sheet: \"Limpiar\" on the sheet (13px bold)", "accent-text", "surface", "text"],
  ["\"Cuándo\": its calendar on the page (phone bar)", "accent-text", "bg", "ui"],
  ["\"Cuándo\" menu: an option and its count on the menu", "text-muted", "surface", "text"],
  ["\"Cuándo\" menu: the date chosen, on its row", "text", "surface-sunken", "text"],
  ["\"Cuándo\" menu: the chosen row's count", "text-muted", "surface-sunken", "text"],
  ["\"Cuándo\" menu: the check", "accent-text", "surface-sunken", "ui"],
  ["Filter sheet switch: its track's outline, off", "border", "surface", "ui"],
  ["Filter sheet switch: its thumb, off", "text-muted", "surface", "ui"],
  ["Filter sheet switch: its thumb on the filled track, on", "chip-active-text", "chip-active-bg", "ui"],
  ["Filter sheet switch: its hint", "text-muted", "surface", "text"],
  ["Rhythms' families: a family's heading (12px bold) in the sheet and the Ritmo panel", "text-muted", "surface", "text"],
  ["Toolbar pill, open: its label on the sunken fill", "text", "surface-sunken", "text"],
  ["Toolbar pill, open: its outline on the page", "text", "bg", "ui"],
  ["Toolbar panel: its outline on the page", "border", "bg", "ui"],
  ["A series' next session: \"Próxima\" in the drawer (12px bold)", "accent-text", "surface", "text"],
  ["A series' next session: \"Próxima\" on its page (12px bold)", "accent-text", "bg", "text"],
  ["A series' next session: its mark (an accent bar) in the drawer", "accent", "surface", "ui"],
  ["A series' next session: its mark (an accent bar) on its page", "accent", "bg", "ui"],
  ["A series' past session in the drawer", "text-muted", "surface", "text"],
  ["A series' past session on its page", "text-muted", "bg", "text"],
  ["Details: \"@academia ↗\" (its Instagram profile) in the drawer (13px bold)", "accent-text", "surface", "text"],
  ["Details: \"@academia ↗\" (its Instagram profile) on the event's page (13px bold)", "accent-text", "bg", "text"],
  ["Primary button fill on dialog", "action", "surface", "ui"],
  ["Calendar dot outline on day cell (fill color is decorative)", "border", "surface", "ui"],
  ["Install steps: a browser button's outline (.install-key) on its fill", "border", "surface-sunken", "ui"],
  ["Install steps: the arrow toward the browser's button", "accent", "surface", "ui"],
  // The cards' action row and the details drawer (docs/DESIGN.md, "Opening an event").
  ["Card: \"Detalles ›\" label on the page (phones' feed, 15px bold)", "text", "bg", "text"],
  ["Card: \"Detalles ›\" label on a card (wide screens)", "text", "surface", "text"],
  ["Card: \"Detalles ›\" label on its pressed fill", "text", "details-pressed", "text"],
  ["Card: \"Detalles ›\" frame on the page", "details-ink", "bg", "ui"],
  ["Card: \"Detalles ›\" frame on a card (wide screens)", "details-ink", "surface", "ui"],
  ["Drawer: quick action and media link outline", "border", "surface", "ui"],
  ["Drawer: \"Guardado\" quick action (accent, 12px bold)", "accent", "surface", "text"],
  ["Side panel: the open event's card outline on the page", "accent", "bg", "ui"],
];

// ---------- run ----------

let failures = 0;
const THEME_NAMES = {
  light: "Fania de día (light)",
  dark: "Luz de escenario (dark)",
};
for (const theme of ["light", "dark"]) {
  console.log(`\n${THEME_NAMES[theme]}`);
  for (const [what, fgToken, bgToken, kind] of PAIRS) {
    const [fg, bg] = [resolve(fgToken, theme), resolve(bgToken, theme)];
    const ratio = contrast(fg, bg);
    const ok = ratio >= MINIMUM[kind];
    if (!ok) failures++;
    const mark = ok ? "ok  " : "FAIL";
    console.log(`  ${mark} ${ratio.toFixed(2).padStart(5)}:1 (min ${MINIMUM[kind]})  ${what}  [${fg} on ${bg}]`);
  }
}
console.log(failures ? `\n${failures} pair(s) below WCAG AA.` : "\nAll pairs meet WCAG AA.");
process.exit(failures ? 1 : 0);
