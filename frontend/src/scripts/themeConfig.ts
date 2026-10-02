// Theme settings shared by scripts/theme.ts and the inline pre-paint script in BaseLayout.astro, so the
// two can't drift apart.

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";
export const DAY_START_HOUR = 6; // "Fania de día" from 6:00…
export const NIGHT_START_HOUR = 18; // …to 17:59, "Noche Fania" the rest of the day
/** Browser UI color (address bar on phones) per theme: the page background token (--bg). */
export const THEME_COLORS: Record<Theme, string> = { light: "#ECDDC6", dark: "#2A0F14" };
