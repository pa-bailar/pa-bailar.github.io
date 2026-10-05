// Each view's page title and description: the home page's head (components/HomePage.astro) and the tab's title
// when the view changes without a page load (views/viewNavigation.ts), so they never disagree.
import type { View } from "../types";

export const VIEW_TITLES: Record<View, { title: string; description: string }> = {
  upcoming: {
    title: "Pa' Bailar · Bogotá",
    description: "Sociales y talleres de baile en Bogotá: salsa, bachata, mambo y más, en un solo lugar.",
  },
  calendar: {
    title: "Calendario · Pa' Bailar · Bogotá",
    description: "El calendario de los sociales y talleres de baile en Bogotá: salsa, bachata, mambo y más, día por día.",
  },
};
