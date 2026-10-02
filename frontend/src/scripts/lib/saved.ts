// Saved events ("Guardados"): the ids of the events a visitor bookmarked, kept in this browser
// (localStorage). No account: they stay on this phone or computer. Past events simply stop showing in
// "Próximos"; their ids are dropped once the event is no longer in the data.
// Storage can be unavailable (private mode, blocked): then saving lasts until the page is closed.

const STORAGE_KEY = "saved-events";

let saved: Set<string> | null = null;

function load(): Set<string> {
  if (saved) return saved;
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    saved = new Set(Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string") : []);
  } catch {
    saved = new Set();
  }
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

/** Save or unsave; returns whether it's saved now. */
export function toggleSaved(id: string): boolean {
  const ids = load();
  if (ids.has(id)) ids.delete(id);
  else ids.add(id);
  persist();
  return ids.has(id);
}

/** Forget saved events that are no longer in the data (expired or removed), so the list doesn't grow forever. */
export function keepOnly(existing: Set<string>) {
  const ids = load();
  const before = ids.size;
  for (const id of ids) if (!existing.has(id)) ids.delete(id);
  if (ids.size !== before) persist();
}
