// What saving says, at the bottom of the screen (views/notice.ts): lib/saveNotice.ts picks the notice, this gives its
// button something to do. "Ver guardados" goes there, "Deshacer" saves the event again, and "Ábrela en tu navegador"
// shows the steps to open the site in the phone's browser (installPrompt.ts, the same sheet as "Instalar").

import { SAVE_NOTICES, saveNotice } from "../lib/saveNotice";
import { inAppBrowser, showInstallSteps } from "./installPrompt";
import { showNotice } from "./notice";

let toldInApp = false; // inside an app's browser, said once a visit

interface SaveContext {
  /** Guardados is on screen. */
  inSaved: boolean;
  /** "Ver guardados". */
  seeSaved: () => void;
  /** "Deshacer": the event saved again. */
  undo: () => void;
}

export function tellSaveChange(saved: boolean, { inSaved, seeSaved, undo }: SaveContext) {
  const kind = saveNotice(saved, { inSaved, inAppFirst: !toldInApp && inAppBrowser() });
  if (!kind) return;
  const { text, action, track } = SAVE_NOTICES[kind];
  const run = { saved: seeSaved, "saved-here-only": showInstallSteps, unsaved: undo }[kind];
  if (showNotice(text, { label: action, run, track }) && kind === "saved-here-only") toldInApp = true;
}
