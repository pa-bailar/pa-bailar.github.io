// The notice at the bottom of the screen (views/notice.ts): how long it stays, what holds it, what its button does.
// Vitest runs in Node: the page is a fake with just what the notice touches (its element, the focus, the timers).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Notice = typeof import("../src/scripts/views/notice");

/** One of the notice's parts (its words, its button, its ×), as notice.ts builds them. */
class FakePart {
  className = "";
  textContent = "";
  type = "";
  dataset: Record<string, string> = {};
  attributes = new Map<string, string>();
  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }
  /** Only the selectors notice.ts asks for: one class (".notice__action"). */
  closest(selector: string) {
    return this.className.split(" ").includes(selector.replace(/^\./, "")) ? this : null;
  }
  /** Its click, as the browser sends it to the notice (the part as its target). */
  click() {
    const domEvent = new Event("click");
    Object.defineProperty(domEvent, "target", { value: this });
    element.dispatchEvent(domEvent);
  }
}

/** The element #notice: its parts, and the events it listens to. */
class FakeNotice extends EventTarget {
  parts: FakePart[] = [];
  replaceChildren(...parts: FakePart[]) {
    this.parts = parts;
  }
  hasChildNodes() {
    return this.parts.length > 0;
  }
  contains(node: unknown) {
    return node === this || this.parts.includes(node as FakePart);
  }
  closest() {
    return null;
  }
  querySelector(selector: string) {
    return this.part(selector.replace(/^\./, "")) ?? null;
  }
  get text() {
    return this.parts.map((part) => part.textContent).join(" · ");
  }
  part(className: string) {
    return this.parts.find((part) => part.closest(`.${className}`));
  }
}

let element: FakeNotice;
let page: EventTarget & { activeElement: unknown; body: object; modal: boolean };

/** A fresh page with its notice (a fresh copy of the module: its state is the page's). */
async function openPage(): Promise<Notice> {
  element = new FakeNotice();
  const body = {};
  page = Object.assign(new EventTarget(), {
    activeElement: body as unknown,
    body,
    modal: false,
    getElementById: (id: string) => (id === "notice" ? element : null),
    createElement: () => new FakePart(),
    querySelector: (selector: string) => (selector === "dialog:modal" && page.modal ? {} : null),
  });
  vi.stubGlobal("document", page);
  const timers = { setTimeout: (...args: Parameters<typeof setTimeout>) => setTimeout(...args), clearTimeout };
  vi.stubGlobal("window", timers); // Vitest's fake timers, as they are when called
  vi.resetModules();
  const notice = await import("../src/scripts/views/notice");
  notice.initNotice();
  return notice;
}

/** A mouse (or a finger: "touch") coming onto the notice or leaving it. */
const pointer = (type: "pointerenter" | "pointerleave", pointerType = "mouse") =>
  element.dispatchEvent(Object.assign(new Event(type), { pointerType }));

/** A click on one of the notice's parts. */
function click(className: string) {
  const target = element.part(className);
  if (!target) throw new Error(`no .${className} in the notice`);
  target.click();
}

type Modifiers = Partial<Record<"ctrlKey" | "metaKey" | "shiftKey" | "altKey", boolean>>;

/** A key pressed on the page (`target`: what has the focus), with its modifiers; returns whether it was taken. */
function press(key: string, modifiers: Modifiers = {}, target: object = page.body) {
  const keys = { key, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...modifiers };
  const domEvent = Object.assign(new Event("keydown", { cancelable: true }), keys);
  Object.defineProperty(domEvent, "target", { value: target });
  page.dispatchEvent(domEvent);
  return domEvent.defaultPrevented;
}

/** The search field, with the focus. */
const field = { closest: (selector: string) => (selector.includes("input") ? field : null) };

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const later = { label: "Ver guardados", run: () => {} };

describe("the notice (views/notice.ts)", () => {
  it("says its words with its button, and goes after its 4 seconds", async () => {
    const { showNotice } = await openPage();
    showNotice("Guardado", later);
    expect(element.text).toBe("Guardado · Ver guardados");
    vi.advanceTimersByTime(3900);
    expect(element.hasChildNodes()).toBe(true);
    vi.advanceTimersByTime(100);
    expect(element.hasChildNodes()).toBe(false);
  });

  it("waits while the mouse is on it, and goes its seconds after the mouse leaves", async () => {
    const { showNotice } = await openPage();
    showNotice("Guardado", later);
    pointer("pointerenter");
    vi.advanceTimersByTime(10_000);
    expect(element.hasChildNodes()).toBe(true);
    pointer("pointerleave");
    vi.advanceTimersByTime(4000);
    expect(element.hasChildNodes()).toBe(false);
  });

  it("a finger's tap doesn't hold it (it leaves no hover behind)", async () => {
    const { showNotice } = await openPage();
    showNotice("Guardado", later);
    pointer("pointerenter", "touch");
    vi.advanceTimersByTime(4000);
    expect(element.hasChildNodes()).toBe(false);
  });

  it("its button does its thing and takes it away", async () => {
    const { showNotice } = await openPage();
    const run = vi.fn();
    showNotice("Quitado de tus guardados", { label: "Deshacer", run });
    click("notice__action");
    expect(run).toHaveBeenCalledOnce();
    expect(element.hasChildNodes()).toBe(false);
  });

  // WebKit (Safari) sends no pointerleave when the button under the mouse goes away with the notice: the next notices
  // waited for the mouse to pass over them, and a "Deshacer" left there saved the event again whenever it was clicked
  // later (the bug hunt of 7 Oct 2026).
  it("the next one still goes in time after its button was clicked with the mouse (no pointerleave)", async () => {
    const { showNotice } = await openPage();
    showNotice("Quitado de tus guardados", { label: "Deshacer", run: () => {} });
    pointer("pointerenter");
    click("notice__action"); // emptied under the mouse; WebKit then says nothing when the mouse moves away
    showNotice("Quitado de tus guardados", { label: "Deshacer", run: () => {} });
    vi.advanceTimersByTime(4000);
    expect(element.hasChildNodes()).toBe(false);
  });

  it("none over a modal (the page under it is inert)", async () => {
    const { showNotice } = await openPage();
    page.modal = true;
    expect(showNotice("Guardado", later)).toBe(0);
    expect(element.hasChildNodes()).toBe(false);
  });
});

// The keyboard's way to "Deshacer": from the details' Guardado it was 14 Shift+Tabs away, and gone after its 4 seconds
// (the bug hunt of 7 Oct 2026). Ctrl+Z (⌘Z on a Mac) undoes while it's up, as in Gmail or Drive.
describe("Ctrl+Z, the undo's key (views/notice.ts)", () => {
  const undoing = () => ({ label: "Deshacer", run: vi.fn(), undo: true });

  it("does what Deshacer does while its notice is up, and says so to screen readers", async () => {
    const { showNotice } = await openPage();
    const undo = undoing();
    showNotice("Quitado de tus guardados", undo);
    expect(element.part("notice__action")?.attributes.get("aria-keyshortcuts")).toBe("Control+Z Meta+Z");
    expect(press("z", { ctrlKey: true })).toBe(true);
    expect(undo.run).toHaveBeenCalledOnce();
    expect(element.hasChildNodes()).toBe(false);
    expect(press("z", { ctrlKey: true })).toBe(false); // gone: nothing left to undo
    expect(undo.run).toHaveBeenCalledOnce();
  });

  it("⌘Z on a Mac", async () => {
    const { showNotice } = await openPage();
    const undo = undoing();
    showNotice("Quitado de tus guardados", undo);
    press("z", { metaKey: true });
    expect(undo.run).toHaveBeenCalledOnce();
  });

  it("only for an undo: another notice's button keeps to its own click", async () => {
    const { showNotice } = await openPage();
    const run = vi.fn();
    showNotice("Guardado", { label: "Ver guardados", run });
    expect(element.part("notice__action")?.attributes.has("aria-keyshortcuts")).toBe(false);
    expect(press("z", { ctrlKey: true })).toBe(false);
    expect(run).not.toHaveBeenCalled();
  });

  it("not while typing (the field's own undo), nor with Shift (redo), nor over a modal", async () => {
    const { showNotice } = await openPage();
    const undo = undoing();
    showNotice("Quitado de tus guardados", undo);
    expect(press("z", { ctrlKey: true }, field)).toBe(false);
    expect(press("Z", { ctrlKey: true, shiftKey: true })).toBe(false);
    page.modal = true;
    expect(press("z", { ctrlKey: true })).toBe(false);
    expect(undo.run).not.toHaveBeenCalled();
  });
});
