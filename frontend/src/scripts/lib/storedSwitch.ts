// A setting the visitor turns on or off and finds the same on the next visit ("Ocultar eventos de bares"), remembered in
// localStorage like the site's other prefs (the theme, saved events, things shown once): "1" while on, nothing while
// off. Storage can be missing or throw (private mode, blocked cookies, quota): then it reads as off at first, and what
// the visitor sets still holds for the rest of the visit; saving never breaks the page.

type SwitchStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export interface StoredSwitch {
  /** Whether it's on: what was set during this visit, else what's stored (off when storage can't be read). */
  on(): boolean;
  /** Turn it on or off, for this visit and, when storage can be written, the next ones. */
  set(on: boolean): void;
}

export function storedSwitch(key: string, storage: () => SwitchStorage = () => localStorage): StoredSwitch {
  let current: boolean | null = null; // set during this visit: holds even when storage can't keep it
  return {
    on() {
      if (current !== null) return current;
      try {
        return storage().getItem(key) === "1";
      } catch {
        return false;
      }
    },
    set(on) {
      current = on;
      try {
        if (on) storage().setItem(key, "1");
        else storage().removeItem(key);
      } catch {
        // Not saved: it's on (or off) for this visit only.
      }
    },
  };
}
