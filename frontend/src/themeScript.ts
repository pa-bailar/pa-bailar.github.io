// The theme before first paint: an inline script in every page's <head> (BaseLayout.astro, allowed by its hash),
// so a visitor who chose Oscuro never sees a flash of the light theme. Same rule as storedTheme() in
// scripts/themeConfig.ts: only a saved "dark" is dark, everything else is light (the default, also the CSS's
// when the script can't run). Build time only; tests/theme.test.ts runs it.
import { jsValue } from "./csp";
import { THEME_COLORS, THEME_STORAGE_KEY } from "./scripts/themeConfig";

export const themePrePaintScript = `(function () {
  var theme = "light";
  try {
    if (localStorage.getItem(${jsValue(THEME_STORAGE_KEY)}) === "dark") theme = "dark";
  } catch (e) {}
  document.documentElement.dataset.theme = theme;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", ${jsValue(THEME_COLORS)}[theme]);
})();`;
