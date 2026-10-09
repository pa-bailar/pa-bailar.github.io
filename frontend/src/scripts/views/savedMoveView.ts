// Moving the saves from Safari to the installed app on iPhone, by hand (lib/savedMove.ts says why and where): the
// clipboard both ways. Both run right in the visitor's tap, as iOS allows the clipboard only there; reading it, iOS
// asks first with its own "Pegar" bubble.

import { homeUrl } from "../lib/links";
import { savedIds, setSaved } from "../lib/saved";
import { COPY_LABEL, PASTE_LABEL, idsFromMove, moveText } from "../lib/savedMove";

/** "Copiar para la app": the saves on the clipboard, as a link; `say` tells how it went. */
export function copySavesForApp(say: (text: string) => void) {
  const text = moveText(savedIds(), homeUrl().href);
  const write = navigator.clipboard?.writeText(text) ?? Promise.reject(new Error("no clipboard"));
  write.then(
    () => say(`Copiados. En la app, abre Guardados y toca «${PASTE_LABEL}».`),
    () => say("No pudimos copiarlos. Inténtalo otra vez."),
  );
}

/** What "Pegar" found: how many saves were new here, nothing of ours on the clipboard, or no reading it. */
export type PasteResult = { added: number } | "nothing" | "denied";

/**
 * "Pegar mis guardados de Safari": the saves in what was copied, saved here. Every one, also an event this page doesn't
 * know: the app may show an older stored copy of the page (offline, a slow network) than Safari's, and the saved list
 * keeps such ids for when the page catches up (lib/saved.ts). Dropped, they were lost, and "No hay guardados" was
 * wrong (the bug-squash pass of 8 Oct 2026).
 */
export async function pasteSavesFromSafari(): Promise<PasteResult> {
  let text: string;
  try {
    text = await navigator.clipboard.readText();
  } catch {
    return "denied"; // the visitor didn't tap iOS's "Pegar", or no clipboard here
  }
  const ids = idsFromMove(text);
  if (!ids.length) return "nothing";
  return { added: ids.filter((id) => setSaved(id, true)).length };
}

/** The notice after pasting. */
export function pastedText(result: PasteResult): string {
  if (result === "denied") return "No pudimos leer lo copiado. Toca otra vez y elige «Pegar».";
  if (result === "nothing") return `No hay guardados en lo copiado. En Safari, abre Guardados y toca «${COPY_LABEL}».`;
  if (result.added === 0) return "Ya tenías esos guardados aquí.";
  return result.added === 1 ? "Listo: 1 guardado de Safari." : `Listo: ${result.added} guardados de Safari.`;
}
