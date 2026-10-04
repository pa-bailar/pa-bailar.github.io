// Theme settings and rules shared by scripts/theme.ts (the toggle) and the pre-paint script (themeScript.ts,
// inlined by BaseLayout.astro), so the two can't drift apart.

export type Theme = "light" | "dark";

/** localStorage key with the visitor's choice: "light" or "dark". */
export const THEME_STORAGE_KEY = "theme";
/** Browser UI color (address bar on phones) per theme: the page background token (--bg). */
export const THEME_COLORS: Record<Theme, string> = { light: "#ECDDC6", dark: "#16122B" };

/** The theme a stored value asks for. Light ("Fania de día") is the default: only a saved "dark" is dark;
 * nothing saved, "light", blocked storage and anything else (the old "auto" mode, unknown values) are light. */
export function storedTheme(value: string | null | undefined): Theme {
  return value === "dark" ? "dark" : "light";
}

/** Whether a stored value is one this version writes; anything else is left from an older one. */
export const isThemeValue = (value: string | null | undefined): value is Theme => value === "light" || value === "dark";

/** The toggle switches between the two. */
export const otherTheme = (theme: Theme): Theme => (theme === "dark" ? "light" : "dark");
