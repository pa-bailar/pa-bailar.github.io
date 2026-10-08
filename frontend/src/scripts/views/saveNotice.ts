// What saving says, at the bottom of the screen (views/notice.ts): lib/saveNotice.ts picks the notice, this gives its
// button something to do. "Ver guardados" goes there, "Deshacer" saves the event again, and "Ábrela en tu navegador"
// shows the steps to open the site in the phone's browser (installPrompt.ts, the same sheet as "Instalar").

import { SAVE_NOTICES, type SaveNotice, saveNotice } from "../lib/saveNotice";
import { inAppBrowser, showInstallSteps } from "./installPrompt";
import { hideNotice, showNotice } from "./notice";

let toldInApp = false; // inside an app's browser, said once a visit
let told: { event: string; notice: number } | null = null; // the last notice about a save, and its event

interface SaveContext {
  /** Guardados is on screen. */
  inSaved: boolean;
  /** "Ver guardados". */
  seeSaved: () => void;
  /** "Deshacer": the event saved again. */
  undo: () => void;
}

/**
 * After the event `id` was saved or unsaved: its notice, if any; one about it said before goes, no longer true.
 * Returns the notice shown (null: none), which the install reminder may replace (main.ts, lib/saveNotice.ts).
 */
export function tellSaveChange(
  id: string,
  saved: boolean,
  { inSaved, seeSaved, undo }: SaveContext,
): SaveNotice | null {
  const kind = saveNotice(saved, { inSaved, inAppFirst: !toldInApp && inAppBrowser() });
  if (!kind) {
    if (told?.event === id) hideNotice(told.notice); // "Guardado", then unsaved at once
    return null;
  }
  const { text, action, track, undo: undoes } = SAVE_NOTICES[kind];
  const run = { saved: seeSaved, "saved-here-only": showInstallSteps, unsaved: undo }[kind];
  const notice = showNotice(text, { label: action, run, track, undo: undoes });
  if (!notice) return null;
  told = { event: id, notice };
  if (kind === "saved-here-only") toldInApp = true;
  return kind;
}
