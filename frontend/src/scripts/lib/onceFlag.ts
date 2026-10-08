// Something shown once per browser (a nudge, a hint), remembered in localStorage like the site's other prefs.
// Storage can be missing or throw (private mode, blocked cookies, quota): then it counts as already seen, so a
// visitor without storage isn't nudged on every visit; marked but not kept, it's seen for the rest of the visit; and
// saving never breaks the page.

type FlagStorage = Pick<Storage, "getItem" | "setItem">;

export interface OnceFlag {
  /** True once it was marked here (this visit, or kept from an earlier one), or when storage can't be read. */
  seen(): boolean;
  /** Remember it: for the next visits if storage can keep it, for this one in any case. */
  mark(): void;
}

export function onceFlag(key: string, storage: () => FlagStorage = () => localStorage): OnceFlag {
  let marked = false; // this visit: holds even when storage can't keep it (the bug hunt of 7 Oct 2026)
  return {
    seen() {
      if (marked) return true;
      try {
        return storage().getItem(key) === "1";
      } catch {
        return true;
      }
    },
    mark() {
      marked = true;
      try {
        storage().setItem(key, "1");
      } catch {
        // Not saved: it may show once more next time, which is harmless.
      }
    },
  };
}
