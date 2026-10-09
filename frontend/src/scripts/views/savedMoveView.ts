// Moving the saves from Safari to the installed app on iPhone, by hand (lib/savedMove.ts says why and where): the
// clipboard both ways. Both run right in the visitor's tap, as iOS allows the clipboard only there; reading it, iOS
// asks first with its own "Pegar" bubble.

import { BASE_URL } from "../lib/links";
import { savedIds, setSaved } from "../lib/saved";
import { idsFromMove, moveText } from "../lib/savedMove";

/** "Copiar para la app": the saves on the clipboard, as a link; `say` tells how it went. */
export function copySavesForApp(say: (text: string) => void) {
  const text = moveText(savedIds(), new URL(BASE_URL, location.origin).href);
  const write = navigator.clipboard?.writeText(text) ?? Promise.reject(new Error("no clipboard"));
  write.then(
    () => say("Copiados. En la app, abre Guardados y toca «Pegar mis guardados de Safari»."),
    () => say("No pudimos copiarlos. Inténtalo otra vez."),
  );
}

/** What "Pegar" found: how many saves were new here, nothing of ours on the clipboard, or no reading it. */
export type PasteResult = { added: number } | "nothing" | "denied";

/** "Pegar mis guardados de Safari": the saves in what was copied, saved here; only events this page knows (`known`). */
export async function pasteSavesFromSafari(known: (id: string) => boolean): Promise<PasteResult> {
  let text: string;
  try {
    text = await navigator.clipboard.readText();
  } catch {
    return "denied"; // the visitor didn't tap iOS's "Pegar", or no clipboard here
  }
  const ids = idsFromMove(text).filter(known);
  if (!ids.length) return "nothing";
  return { added: ids.filter((id) => setSaved(id, true)).length };
}

/** The notice after pasting. */
export function pastedText(result: PasteResult): string {
  if (result === "denied") return "No pudimos leer lo copiado. Toca otra vez y elige «Pegar».";
  if (result === "nothing") return "No hay guardados en lo copiado. En Safari, abre Guardados y toca «Copiar para la app».";
  if (result.added === 0) return "Ya tenías esos guardados aquí.";
  return result.added === 1 ? "Listo: 1 guardado de Safari." : `Listo: ${result.added} guardados de Safari.`;
}
