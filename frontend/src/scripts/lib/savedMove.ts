// Moving the saved events (lib/saved.ts) from Safari to the installed app, on iPhone. There the home-screen app keeps
// its own storage, apart from Safari's, and nothing can carry them across by itself: the app opens on the manifest's
// start_url whatever the page's address was when it was added (seen in the iOS 27 Simulator, 8 Oct 2026, with a query
// and with the address rewritten), and links always open in Safari. So the visitor carries them: "Copiar para la app"
// in Safari puts them on the clipboard as a link, and "Pegar mis guardados de Safari" in the app reads it back (the
// owner, 8 Oct 2026). Nowhere else: on Android the installed app shares the browser's storage, and computers have no
// home-screen app. Pure, so it's tested (tests/savedMove.test.ts).

import type { InstallPlace } from "./installPlace";

/** What the saves can do here: be copied (a browser on iPhone or iPad), be pasted (the installed app there), neither. */
export type SavedMove = "copy" | "paste" | null;

/** The buttons' words, also named in the notices that point to them (views/savedView.ts, views/savedMoveView.ts). */
export const COPY_LABEL = "Copiar para la app";
export const PASTE_LABEL = "Pegar mis guardados de Safari";

/** The parameter of the link that carries them: `?guardados=<id>,<id>`. */
export const MOVE_PARAM = "guardados";

/** An event id as the backend writes them (pa_bailar/ids.py: lowercase words and dashes). */
const ID = /^[a-z0-9][a-z0-9-]{0,120}$/;

/** Where the visitor is, for moving the saves: `app`, running as the installed app. */
export function savedMove(place: InstallPlace, app: boolean): SavedMove {
  if (place.kind !== "ios") return null;
  return app ? "paste" : "copy";
}

/** The text copied: a line, and the link with the ids (`home`: the site's home page, absolute). */
export function moveText(ids: Iterable<string>, home: string): string {
  const url = new URL(home);
  url.search = `${MOVE_PARAM}=${[...ids].filter((id) => ID.test(id)).join(",")}`;
  return `Mis eventos guardados en Pa' Bailar: ${url.href}`;
}

/** The ids in what was pasted (the link, wherever it is in the text), each once; none when it isn't ours. */
export function idsFromMove(text: string): string[] {
  const match = new RegExp(`[?&]${MOVE_PARAM}=([^\\s&#]*)`).exec(text);
  if (!match) return [];
  let value = match[1]!;
  try {
    value = decodeURIComponent(value);
  } catch {
    return [];
  }
  return [...new Set(value.split(",").map((id) => id.trim()).filter((id) => ID.test(id)))];
}
