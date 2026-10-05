// A press outside an open menu or panel closes it ("Cuándo"'s menu, whenMenu.ts; the toolbar's panels,
// filterPanels.ts), and the click that press leads to is dealt with apart: swallowed (it could open an event behind
// the menu), or held until the menu's history entry is gone (a toolbar button that writes its own entry).
// Only that click: the one whose target is the press's (or holds it: the pointer moved within it before letting go).
// A press that never becomes a click (on the page's scrollbar, a drag) is forgotten once the pointer is up, so a
// later keyboard click (Enter on a button) is never mistaken for it.

/** A touch's click comes after its pointerup, not always in the same task: how long to wait for it. */
export const TOUCH_CLICK_MS = 300;

interface Contains {
  contains(other: Contains | null): boolean;
}

/** Whether a click on `click` is the one a press on `down` led to. */
export function isClickOf(down: Contains, click: Contains | null): boolean {
  return Boolean(click) && (click === down || click!.contains(down));
}

export interface PressedClick {
  /** A press: its click is the one to deal with. */
  arm(target: EventTarget): void;
  /** The pointer is up (or cancelled): its click comes now, or never. */
  release(pointerType?: string): void;
  /** A click: true (once) when it's the armed press's. */
  take(target: EventTarget | null): boolean;
  /** A press is armed and still waiting for its click. */
  armed(): boolean;
}

/** One press at a time, waiting for its own click. */
export function pressedClick(timers: Pick<typeof globalThis, "setTimeout" | "clearTimeout"> = globalThis): PressedClick {
  let down: Contains | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const forget = () => {
    down = null;
    if (timer !== undefined) timers.clearTimeout(timer);
    timer = undefined;
  };
  return {
    arm(target) {
      forget();
      down = target as unknown as Contains;
    },
    release(pointerType) {
      if (!down) return;
      if (timer !== undefined) timers.clearTimeout(timer);
      timer = timers.setTimeout(forget, pointerType === "touch" ? TOUCH_CLICK_MS : 0);
    },
    take(target) {
      if (!down) return false;
      const hit = isClickOf(down, target as unknown as Contains | null);
      forget();
      return hit;
    },
    armed: () => down !== null,
  };
}
