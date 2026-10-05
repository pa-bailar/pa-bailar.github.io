// A value kept in this browser (localStorage), like the site's other prefs: the install offer's dates, and the base of
// storedSwitch.ts. Storage can be missing or throw (private mode, blocked cookies, quota): then it reads as nothing and
// writing does nothing, and the page never breaks.

type ValueStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export interface StoredValue {
  /** What's stored, or null (nothing, or storage that can't be read). */
  get(): string | null;
  /** Store it (null: remove it); nothing happens if storage can't be written. */
  set(value: string | null): void;
}

export function storedValue(key: string, storage: () => ValueStorage = () => localStorage): StoredValue {
  return {
    get() {
      try {
        return storage().getItem(key);
      } catch {
        return null;
      }
    },
    set(value) {
      try {
        if (value === null) storage().removeItem(key);
        else storage().setItem(key, value);
      } catch {
        // Not saved: it lasts for this visit, or not at all.
      }
    },
  };
}
