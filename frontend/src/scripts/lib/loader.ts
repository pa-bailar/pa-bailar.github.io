// A loader (styles/components/loader.css): a ring turning while something loads. Decorative: the words beside it say
// what is loading, and they carry role="status" where it matters.

/** The ring, inline, before the words that say what loads. */
export const LOADER_HTML = '<span class="loader" aria-hidden="true"></span>';

/** The ring on a dark disc, in the middle of an image (its parent is positioned). */
export const LOADER_OVER_IMAGE_HTML = `<span class="loader-disc" aria-hidden="true">${LOADER_HTML}</span>`;

/** The inline ring as an element, for code that builds nodes (inlinePlayer.ts). */
export function loaderElement(): HTMLElement {
  const ring = document.createElement("span");
  ring.className = "loader";
  ring.setAttribute("aria-hidden", "true");
  return ring;
}
