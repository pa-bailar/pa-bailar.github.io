// The palette as hex, for what can't read CSS custom properties: the images drawn at build time (link previews,
// the app's icons, the favicon), the share card's canvas, and the browser bar's theme-color. Each is a palette
// token of styles/tokens.css with the same name (tests/brandColors.test.ts checks they agree); the app icon's
// marigold is its own.

export const BRAND = {
  wine950: "#1E0A0E",
  wine900: "#2A0F14",
  wine500: "#6E2A33",
  cream50: "#FFF8EC",
  cream75: "#F7EDDC",
  cream150: "#ECDDC6",
  cocoa500: "#6E4A44",
  tomato600: "#C8321C",
  orange600: "#E8791C",
  marigold600: "#E9B021",
  palm600: "#1F7A4A",
  indigo900: "#16122B",
  white: "#FFFFFF",
} as const;

/** The label of the record on the app's icon and the favicon: a marigold brighter than --marigold-600. */
export const ICON_MARIGOLD = "#F2C12E";
