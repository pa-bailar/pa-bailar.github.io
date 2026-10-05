// A browser's session history for unit tests (Vitest runs in Node): history, location and window's popstate, and the
// document's focus (`document.activeElement`, moved by `fakeFocusable`'s focus()).
// Like the browser's, back() and go() are asynchronous: popstate arrives on a later task (`settle` waits for it).

import { vi } from "vitest";

interface Entry {
  state: unknown;
  url: URL;
}

export interface FakeHistory {
  entries: Entry[];
  index: number;
  /** The current entry's state. */
  readonly state: unknown;
  /** The address bar's path. */
  readonly path: string;
}

export const settle = async (rounds = 5) => {
  for (let round = 0; round < rounds; round++) await new Promise((resolve) => setTimeout(resolve, 0));
};

/** Installs the fakes as globals (undone by vi.unstubAllGlobals) and returns the history to inspect. */
export function installFakeHistory(start = "https://pa-bailar.github.io/"): FakeHistory {
  const target = new EventTarget();
  const fake: FakeHistory = {
    entries: [{ state: null, url: new URL(start) }],
    index: 0,
    get state() {
      return clone(fake.entries[fake.index]?.state ?? null);
    },
    get path() {
      return fake.entries[fake.index]!.url.pathname;
    },
  };
  const clone = <T>(value: T): T => (value == null ? value : structuredClone(value));
  const current = () => fake.entries[fake.index]!;
  const resolve = (url?: string | URL | null) => (url == null || url === "" ? current().url : new URL(url, current().url));
  const traverse = (delta: number) => {
    setTimeout(() => {
      const next = fake.index + delta;
      if (next < 0 || next >= fake.entries.length || delta === 0) return;
      fake.index = next;
      target.dispatchEvent(Object.assign(new Event("popstate"), { state: clone(current().state) }));
    }, 0);
  };
  const history = {
    scrollRestoration: "auto",
    get length() {
      return fake.entries.length;
    },
    get state() {
      return fake.state;
    },
    pushState(state: unknown, _title: string, url?: string | URL | null) {
      const entry = { state: clone(state), url: resolve(url) };
      fake.entries.splice(fake.index + 1, Infinity, entry);
      fake.index++;
    },
    replaceState(state: unknown, _title: string, url?: string | URL | null) {
      fake.entries[fake.index] = { state: clone(state), url: resolve(url) };
    },
    back: () => traverse(-1),
    forward: () => traverse(1),
    go: (delta = 0) => traverse(delta),
  };
  const location = {
    get pathname() {
      return current().url.pathname;
    },
    get search() {
      return current().url.search;
    },
    get hash() {
      return current().url.hash;
    },
  };
  const window = {
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
    dispatchEvent: target.dispatchEvent.bind(target),
    matchMedia: () => ({ matches: true }), // reduced motion: sheets close at once
    setTimeout,
    clearTimeout,
  };
  const body = fakeFocusable("body");
  vi.stubGlobal("history", history);
  vi.stubGlobal("location", location);
  vi.stubGlobal("window", window);
  vi.stubGlobal("document", { body, activeElement: body });
  return fake;
}

/** An element that takes the focus (a button), as `document.activeElement` (after installFakeHistory). */
export function fakeFocusable(name: string) {
  const element = {
    name,
    isConnected: true,
    focus() {
      Object.assign(document, { activeElement: element });
    },
  };
  return element as unknown as HTMLElement;
}

/** A <dialog> as lib/sheet.ts uses it: showModal, close (its "close" event on a later task), open, id. */
export function fakeDialog(id: string) {
  const target = new EventTarget();
  const dialog = Object.assign(target, {
    id,
    open: false,
    scrollTop: 0,
    style: { setProperty() {}, removeProperty() {} },
    classList: { add() {}, remove() {} },
    showModal() {
      dialog.open = true;
    },
    close() {
      if (!dialog.open) return;
      dialog.open = false;
      setTimeout(() => target.dispatchEvent(new Event("close")), 0);
    },
  });
  return dialog as unknown as HTMLDialogElement;
}
