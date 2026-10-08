// Saved events ("Guardados"): the ids of the events a visitor bookmarked, kept in this browser
// (localStorage). No account: they stay on this phone or computer. Past events simply stop showing in
// "Próximos"; an id whose event is no longer in the data stays stored (an older copy of the page, offline, lacks
// newer events), and only the oldest of those are forgotten once there are many (trimSaved).
// Every tab and window of the site shares them: a save starts from what's stored at that moment, and the others
// hear of it (onSavedElsewhere).
// Storage can be unavailable (private mode, blocked): then saving lasts until the page is closed.

const STORAGE_KEY = "saved-events";
/** More stored ids than this, and the oldest whose events are no longer in the data are forgotten. */
export const SAVED_LIMIT = 200;

let saved: Set<string> | null = null;

/** What's stored, oldest first; null when storage can't be read (blocked, or not a list we wrote). */
function read(): Set<string> | null {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return new Set(Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string") : []);
  } catch {
    return null;
  }
}

function load(): Set<string> {
  saved ??= read() ?? new Set();
  return saved;
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...load()]));
  } catch {
    // Storage unavailable: saving still works for this visit.
  }
}

export function isSaved(id: string): boolean {
  return load().has(id);
}

/** Save or unsave; returns whether it's saved now. From what's stored now, not what the page read when it opened:
 * another tab may have saved since (writing the page's old list back erased those, the bug hunt of 7 Oct 2026). */
export function toggleSaved(id: string): boolean {
  const on = !(read() ?? load()).has(id);
  setSaved(id, on);
  return on;
}

/**
 * Saved (`on`) or not, from what's stored now; returns whether that changed anything. Deshacer saves an event again
 * this way, never by toggling: another tab may have saved it again meanwhile, and toggling then took it away for good
 * (the bug-squash pass of 8 Oct 2026).
 */
export function setSaved(id: string, on: boolean): boolean {
  saved = read() ?? load();
  if (saved.has(id) === on) return false;
  if (on) saved.add(id);
  else saved.delete(id);
  persist();
  return true;
}

/** Past SAVED_LIMIT ids, forgets the oldest whose events are no longer in the data (`existing`), so the list doesn't
 * grow forever. Never all of them: an older copy of the page (stored for offline use) lacks the newest events, and
 * dropping every id it didn't know lost those saves for good (the bug hunt of 7 Oct 2026). */
export function trimSaved(existing: Set<string>) {
  const ids = load();
  let excess = ids.size - SAVED_LIMIT;
  if (excess <= 0) return;
  for (const id of ids) {
    if (excess === 0) break;
    if (existing.has(id)) continue;
    ids.delete(id);
    excess -= 1;
  }
  persist();
}

/** Another tab or window of the site saved or unsaved (or the browser's data was cleared): `onChange` runs once this
 * page has read the saves again. */
export function onSavedElsewhere(onChange: () => void) {
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return; // null: all of the site's storage was cleared
    saved = read() ?? saved;
    onChange();
  });
}
