// A setting the visitor turns on or off and finds the same on the next visit ("Ocultar eventos de bares"), remembered in
// localStorage like the site's other prefs (the theme, saved events, things shown once): "1" while on, nothing while
// off. Storage can be missing or throw (private mode, blocked cookies, quota): then it reads as off at first, and what
// the visitor sets still holds for the rest of the visit; saving never breaks the page.

import { storedValue } from "./storedValue";

type SwitchStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export interface StoredSwitch {
  /** Whether it's on: what was set during this visit, else what's stored (off when storage can't be read). */
  on(): boolean;
  /** Turn it on or off, for this visit and, when storage can be written, the next ones. */
  set(on: boolean): void;
}

export function storedSwitch(key: string, storage: () => SwitchStorage = () => localStorage): StoredSwitch {
  const value = storedValue(key, storage);
  let current: boolean | null = null; // set during this visit: holds even when storage can't keep it
  return {
    on: () => current ?? value.get() === "1",
    set(on) {
      current = on;
      value.set(on ? "1" : null);
    },
  };
}
