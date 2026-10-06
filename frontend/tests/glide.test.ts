// What a layout change moved glides to its new place (lib/glide.ts, the page making room beside the side panel): each
// piece starts where it was and slides to where it is; what didn't move stays still; with "reduce motion" on, nothing
// glides; a new change stops the glides still running, and the next starts from where they were.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { glideFrom } from "../src/scripts/lib/glide";

const MOTION = { duration: 280, easing: "ease-out" };

/** An element on screen at `box`; `animate` records the glides it was given. */
function piece(box: { left: number; top: number }) {
  const element = {
    box,
    glides: [] as { cancel: ReturnType<typeof vi.fn> }[],
    getBoundingClientRect: () => ({ left: element.box.left, top: element.box.top }),
    animate: vi.fn(() => {
      const glide = { cancel: vi.fn() };
      element.glides.push(glide);
      return glide;
    }),
  };
  return element;
}

const asElements = (pieces: ReturnType<typeof piece>[]) => pieces as unknown as HTMLElement[];

function browser({ reduceMotion = false } = {}) {
  vi.stubGlobal("window", { matchMedia: () => ({ matches: reduceMotion }) });
  vi.stubGlobal("Element", { prototype: { animate() {} } });
}

beforeEach(() => browser());
afterEach(() => vi.unstubAllGlobals());

describe("pieces moved by a layout change (glideFrom)", () => {
  it("start where they were and slide to their new place", () => {
    const card = piece({ left: 860, top: 225 });
    const play = glideFrom(asElements([card]), MOTION);
    card.box = { left: 16, top: 225 }; // from the end of its row to the start of the next, at the same height
    play();
    expect(card.animate).toHaveBeenCalledWith([{ transform: "translate(844px, 0px)" }, { transform: "none" }], MOTION);
  });

  it("what didn't move stays still", () => {
    const heading = piece({ left: 16, top: 100 });
    const play = glideFrom(asElements([heading]), MOTION);
    heading.box = { left: 16.4, top: 100 };
    play();
    expect(heading.animate).not.toHaveBeenCalled();
  });

  it("nothing glides with reduce motion on", () => {
    browser({ reduceMotion: true });
    const card = piece({ left: 860, top: 225 });
    const play = glideFrom(asElements([card]), MOTION);
    card.box = { left: 16, top: 225 };
    play();
    expect(card.animate).not.toHaveBeenCalled();
  });

  it("a new change stops the glides still running", () => {
    const card = piece({ left: 860, top: 225 });
    const open = glideFrom(asElements([card]), MOTION);
    card.box = { left: 16, top: 225 };
    open();
    const close = glideFrom(asElements([card]), MOTION); // closed mid-glide
    card.box = { left: 860, top: 225 };
    close();
    expect(card.glides[0].cancel).toHaveBeenCalled();
    expect(card.animate).toHaveBeenCalledTimes(2);
  });
});
