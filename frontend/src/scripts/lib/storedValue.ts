// A value kept in this browser (localStorage), like the site's other prefs: the install offer's dates, and the base of
// storedSwitch.ts. Storage can be missing or throw (private mode, blocked cookies, quota): then it reads as nothing,
// what's set holds for the rest of the visit, and the page never breaks.

type ValueStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export interface StoredValue {
  /** What's stored, or what was set this visit that storage couldn't keep; null: nothing. */
  get(): string | null;
  /** Store it (null: remove it); if storage can't keep it, it holds for the rest of the visit. */
  set(value: string | null): void;
}

export function storedValue(key: string, storage: () => ValueStorage = () => localStorage): StoredValue {
  // Set this visit but not kept by storage. Without it, the install banner's × did nothing with storage blocked: the
  // date was lost, and the banner read as never dismissed (the bug hunt of 7 Oct 2026).
  let unkept: { value: string | null } | null = null;
  return {
    get() {
      if (unkept) return unkept.value;
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
        unkept = null; // kept: what's stored is read again (another tab may change it)
      } catch {
        unkept = { value };
      }
    },
  };
}
