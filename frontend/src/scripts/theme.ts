// The theme switch: Claro ("Fania de día", the default for everyone) or Oscuro ("Luz de escenario"). Clicking it
// switches and remembers the choice in localStorage; where storage is blocked (private mode) it still switches,
// just for this visit. The pre-paint script (themeScript.ts) has already applied the saved theme; this keeps
// the toggle, the attribute and the address bar color in step. Rules and settings: themeConfig.ts.

import { byId } from "./lib/dom";
import { isThemeValue, otherTheme, storedTheme, THEME_COLORS, THEME_STORAGE_KEY, type Theme } from "./themeConfig";

const THEME_NAMES: Record<Theme, string> = { light: "claro", dark: "oscuro" };

/** The saved theme. Cleans up a value left by an older version (the old "auto" mode): it reads as light. */
function savedTheme(): Theme {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    if (value !== null && !isThemeValue(value)) localStorage.removeItem(THEME_STORAGE_KEY);
    return storedTheme(value);
  } catch {
    return "light"; // storage blocked (private mode, etc.)
  }
}

function saveTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Not persisted; still applies for this visit.
  }
}

/** The page shows `theme`; the button's visible label (Claro / Oscuro) follows it through CSS. */
function apply(theme: Theme, button: HTMLButtonElement) {
  document.documentElement.dataset.theme = theme;
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[theme]);
  button.setAttribute("aria-label", `Modo ${THEME_NAMES[theme]}. Cambiar a modo ${THEME_NAMES[otherTheme(theme)]}`);
}

export function initThemeToggle() {
  const button = byId<HTMLButtonElement>("theme-toggle");
  let theme = savedTheme();
  apply(theme, button);

  button.addEventListener("click", () => {
    theme = otherTheme(theme);
    saveTheme(theme);
    apply(theme, button);
  });
}
