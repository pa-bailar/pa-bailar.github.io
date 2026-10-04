// Something shown once per browser (a nudge, a hint), remembered in localStorage like the site's other prefs.
// Storage can be missing or throw (private mode, blocked cookies, quota): then it counts as already seen, so a
// visitor without storage isn't nudged on every visit, and saving never breaks the page.

type FlagStorage = Pick<Storage, "getItem" | "setItem">;

export interface OnceFlag {
  /** True once it was marked here, or when storage can't be read. */
  seen(): boolean;
  /** Remember it (nothing happens if storage can't be written). */
  mark(): void;
}

export function onceFlag(key: string, storage: () => FlagStorage = () => localStorage): OnceFlag {
  return {
    seen() {
      try {
        return storage().getItem(key) === "1";
      } catch {
        return true;
      }
    },
    mark() {
      try {
        storage().setItem(key, "1");
      } catch {
        // Not saved: it may show once more next time, which is harmless.
      }
    },
  };
}
