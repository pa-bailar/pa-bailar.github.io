import { describe, expect, it } from "vitest";
import {
  MEDIUM_SHARE,
  SCRIM_FULL,
  SCRIM_MEDIUM,
  TOP_GAP,
  cardScrollDelta,
  exitDuration,
  offsetFor,
  otherDetent,
  scrimAt,
  settle,
} from "../src/scripts/views/drawerSheet";
import { VELOCITY_WINDOW, releaseVelocity } from "../src/scripts/lib/sheetMotion";

const SCREEN = 812; // an iPhone's height, in CSS px
const MEDIUM = offsetFor("medium", SCREEN);

describe("the drawer's heights", () => {
  it("full: 12 px from the top; half: the lower 55% of the screen; closed: out of sight", () => {
    expect(offsetFor("full", SCREEN)).toBe(0);
    expect(SCREEN - TOP_GAP - MEDIUM).toBe(Math.round(SCREEN * MEDIUM_SHARE)); // the half drawer's visible height
    expect(offsetFor("closed", SCREEN)).toBe(SCREEN);
  });

  it("the handle switches between the two", () => {
    expect(otherDetent("medium")).toBe("full");
    expect(otherDetent("full")).toBe("medium");
  });

  it("the scrim is light at half height, darker at full, and fades as it leaves", () => {
    expect(scrimAt(MEDIUM, SCREEN)).toBeCloseTo(SCRIM_MEDIUM);
    expect(scrimAt(0, SCREEN)).toBeCloseTo(SCRIM_FULL);
    expect(scrimAt(offsetFor("closed", SCREEN), SCREEN)).toBe(0);
    expect(scrimAt(MEDIUM / 2, SCREEN)).toBeGreaterThan(SCRIM_MEDIUM);
    expect(scrimAt(MEDIUM / 2, SCREEN)).toBeLessThan(SCRIM_FULL);
  });
});

describe("where a drag ends", () => {
  it("pulled up, or flicked up, from half height: full", () => {
    expect(settle(MEDIUM * 0.3, SCREEN, 0, "medium")).toBe("full");
    expect(settle(MEDIUM * 0.9, SCREEN, -0.8, "medium")).toBe("full");
  });

  it("a little either way springs back", () => {
    expect(settle(MEDIUM + 30, SCREEN, 0, "medium")).toBe("medium");
    expect(settle(MEDIUM * 0.7, SCREEN, 0, "medium")).toBe("medium");
  });

  it("closes from half height: a flick down, or a pull past max(110 px, 22% of the screen)", () => {
    expect(settle(MEDIUM + 20, SCREEN, 0.8, "medium")).toBe("close");
    expect(settle(MEDIUM + 0.22 * SCREEN + 5, SCREEN, 0, "medium")).toBe("close");
    expect(settle(MEDIUM + 150, SCREEN, 0, "medium")).toBe("medium"); // 150 < 22% of 812 (179)
  });

  it("from full height, a pull down goes back to half; only another one closes", () => {
    expect(settle(200, SCREEN, 0.9, "full")).toBe("medium");
    expect(settle(MEDIUM * 0.6, SCREEN, 0, "full")).toBe("medium");
    expect(settle(MEDIUM + 60, SCREEN, 0.9, "full")).toBe("close"); // already well below half height
  });

  it("leaves at the finger's speed, between 160 and 280 ms", () => {
    expect(exitDuration(MEDIUM, SCREEN, 0)).toBe(280);
    expect(exitDuration(MEDIUM + 300, SCREEN, 3)).toBe(160);
    expect(exitDuration(MEDIUM, SCREEN, 2)).toBeGreaterThanOrEqual(160);
  });
});

describe("keeping the tapped card in view", () => {
  const bar = { barBottom: 64, drawerTop: SCREEN - Math.round(SCREEN * MEDIUM_SHARE) }; // the half drawer's top: 365

  it("a card already mostly visible above the drawer: the list doesn't move", () => {
    expect(cardScrollDelta({ top: 70, bottom: 500 }, bar)).toBeNull();
  });

  it("a card mostly under the drawer (or the bar): its image goes right under the bar", () => {
    expect(cardScrollDelta({ top: 330, bottom: 800 }, bar)).toBe(266);
    expect(cardScrollDelta({ top: -400, bottom: 90 }, bar)).toBe(-464);
  });

  it("a shared link always lines it up", () => {
    expect(cardScrollDelta({ top: 70, bottom: 500 }, { ...bar, force: true })).toBe(6);
  });
});

describe("the release velocity (sheets and drawer)", () => {
  it("is the last VELOCITY_WINDOW ms of movement, in px/ms", () => {
    const samples = [
      { y: 0, time: 0 }, // too old: left out
      { y: 100, time: 100 },
      { y: 140, time: 140 },
      { y: 180, time: 100 + VELOCITY_WINDOW },
    ];
    expect(releaseVelocity(samples)).toBe(1);
  });

  it("is 0 without movement over time, negative upwards", () => {
    expect(releaseVelocity([])).toBe(0);
    expect(releaseVelocity([{ y: 10, time: 5 }])).toBe(0);
    expect(releaseVelocity([{ y: 100, time: 0 }, { y: 60, time: 40 }])).toBe(-1);
  });
});
