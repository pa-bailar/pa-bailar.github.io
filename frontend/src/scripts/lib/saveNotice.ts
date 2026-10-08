// Which notice a save or an unsave gets (views/saveNotice.ts shows it, at the bottom of the screen): like Instagram's,
// "Guardado · Ver guardados"; in Guardados, where unsaving takes the card away, "Quitado de tus guardados · Deshacer".
// Inside an app's own browser (Instagram, Facebook…: where a Story's link opens), the visit's first save says it
// stays there, not in the phone's browser. None where the change is already in sight: unsaving in the list (the
// bookmark empties), or saving again in Guardados (Deshacer: the card comes back).

export type SaveNotice = "saved" | "saved-here-only" | "unsaved";

/** `undo`: its button undoes, so Ctrl+Z (⌘Z) does it too (views/notice.ts). */
export const SAVE_NOTICES: Record<SaveNotice, { text: string; action: string; track: string; undo?: boolean }> = {
  saved: { text: "Guardado", action: "Ver guardados", track: "aviso-ver-guardados" },
  "saved-here-only": {
    text: "Guardado solo en este navegador",
    action: "Ábrela en tu navegador",
    track: "aviso-abrir-navegador",
  },
  unsaved: { text: "Quitado de tus guardados", action: "Deshacer", track: "aviso-deshacer", undo: true },
};

interface Where {
  /** Guardados is on screen. */
  inSaved: boolean;
  /** Inside an app's own browser, not yet told this visit. */
  inAppFirst: boolean;
}

export function saveNotice(saved: boolean, { inSaved, inAppFirst }: Where): SaveNotice | null {
  if (inSaved) return saved ? null : "unsaved";
  if (!saved) return null;
  return inAppFirst ? "saved-here-only" : "saved";
}

/**
 * Whether the install reminder (views/installPrompt.ts) may take the place of the notice a save got: a new save's
 * "Guardado" only. Not the in-app note, which matters more there (in its place, it never showed that visit), nor a save
 * that brings an event back to Guardados (Deshacer: no notice of its own), which isn't a new save (the bug hunt of 7
 * Oct 2026).
 */
export const reminderMayReplace = (kind: SaveNotice | null): boolean => kind === "saved";
