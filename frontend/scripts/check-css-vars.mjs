// Every CSS custom property the site reads (`var(--name)`) is defined somewhere: in a stylesheet, a component's
// <style>, or set from a script (the list below). An undefined one fails silently in the browser: the property
// falls back to inherited or initial values (the search fields got 15 px text from an undefined --text-base, and
// iPhones zoomed in on them). Run by `npm run check`.
//
// Usage: node scripts/check-css-vars.mjs

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("../src/", import.meta.url));

/** Set from scripts with style.setProperty(), never in a stylesheet. Each must still be set somewhere. */
export const SET_FROM_SCRIPTS = [
  "--drawer-duration", // views/eventDrawer.ts: how long the drawer's move takes
  "--drawer-easing", // …and its curve
  "--drawer-y", // …where it sits
  "--scrim-opacity", // …and its scrim
  "--flyer-ratio", // views/eventCard.ts: each flyer's shape (data-flyer-ratio)
  "--drag", // lib/sheet.ts: how far a sheet is dragged down (its backdrop fades with it)
  "--sheet-exit-duration", // …and how fast it leaves, at the finger's speed
  "--keyboard-inset", // views/bottomNav.ts: how far the bar at the bottom rises to sit above the keyboard
];

const files = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "vendor" ? [] : files(full);
    return /\.(css|astro|ts)$/.test(entry.name) ? [full] : [];
  });

const withoutComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "");

/** Custom properties read (`var(--name`), defined (`--name:` in CSS) and set from scripts (setProperty). */
export function scan(sources) {
  const used = new Map(); // name → first file
  const defined = new Set();
  const setByScripts = new Set();
  for (const { file, text } of sources) {
    const code = withoutComments(text);
    for (const [, name] of code.matchAll(/var\(\s*(--[\w-]+)/g)) if (!used.has(name)) used.set(name, file);
    if (/\.(css|astro)$/.test(file)) {
      for (const [, name] of code.matchAll(/(?:^|[\s{;])(--[\w-]+)\s*:/g)) defined.add(name);
    }
    for (const [, name] of code.matchAll(/setProperty\(\s*["'`](--[\w-]+)/g)) setByScripts.add(name);
  }
  return { used, defined, setByScripts };
}

/** The problems: properties read but never defined, and listed ones no script sets anymore. */
export function problems({ used, defined, setByScripts }, allowed = SET_FROM_SCRIPTS) {
  const found = [];
  for (const [name, file] of used) {
    if (!defined.has(name) && !allowed.includes(name)) found.push(`${name} is read (${file}) but never defined`);
  }
  for (const name of allowed) {
    if (!setByScripts.has(name)) found.push(`${name} is listed as set from scripts, but no script sets it`);
  }
  return found;
}

// Run as a command (not imported by the tests).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const sources = files(SRC).map((file) => ({ file: path.relative(SRC, file).replaceAll("\\", "/"), text: readFileSync(file, "utf8") }));
  const found = problems(scan(sources));
  if (found.length) {
    console.error(`Undefined CSS custom properties:\n${found.map((line) => `  - ${line}`).join("\n")}`);
    process.exit(1);
  }
  console.log(`CSS custom properties: all ${scan(sources).used.size} read are defined.`);
}
