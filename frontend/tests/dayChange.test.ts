import { afterEach, describe, expect, it, vi } from "vitest";
import { STALE_AFTER_MS, moveToToday, resumeAction, untilNextDay, watchDayChange } from "../src/scripts/views/dayChange";
import { createInitialState } from "../src/scripts/state";

const HOUR = 3600_000;

/** The clock at `time` in Bogotá (UTC−5 all year). */
function at(time: string) {
  vi.setSystemTime(new Date(`${time}:00-05:00`));
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("the calendar's day and month after the day changed (moveToToday)", () => {
  const calendar = (selectedDay: string, month: Date) => ({ ...createInitialState(), selectedDay, month });

  it("move on when they were the day it was drawn on", () => {
    const state = calendar("2026-10-31", new Date(2026, 9, 1));
    moveToToday(state, "2026-10-31", "2026-11-01");
    expect(state.selectedDay).toBe("2026-11-01");
    expect(state.month).toEqual(new Date(2026, 10, 1));
  });

  it("the month stays when it's still today's", () => {
    const state = calendar("2026-10-04", new Date(2026, 9, 1));
    moveToToday(state, "2026-10-04", "2026-10-05");
    expect(state.selectedDay).toBe("2026-10-05");
    expect(state.month).toEqual(new Date(2026, 9, 1));
  });

  it("a day or a month the visitor chose stays", () => {
    const state = calendar("2026-12-24", new Date(2026, 11, 1));
    moveToToday(state, "2026-10-04", "2026-10-05");
    expect(state.selectedDay).toBe("2026-12-24");
    expect(state.month).toEqual(new Date(2026, 11, 1));
  });
});

describe("what a resumed page does (resumeAction)", () => {
  const resume = (overrides: Partial<Parameters<typeof resumeAction>[0]>) =>
    resumeAction({ loadedAt: 0, now: HOUR, online: true, renderedDay: "2026-10-04", today: "2026-10-04", ...overrides });

  it("nothing the same day, within a few hours", () => {
    expect(resume({})).toBe("none");
  });

  it("draws again on another day", () => {
    expect(resume({ today: "2026-10-05" })).toBe("render");
  });

  it("loads again, online, once it's hours old: its events were embedded at build time", () => {
    expect(resume({ now: STALE_AFTER_MS + 1 })).toBe("reload");
    expect(resume({ now: STALE_AFTER_MS + 1, today: "2026-10-05" })).toBe("reload");
  });

  it("offline it only draws again (the events it has)", () => {
    expect(resume({ now: STALE_AFTER_MS + 1, online: false, today: "2026-10-05" })).toBe("render");
    expect(resume({ now: STALE_AFTER_MS + 1, online: false })).toBe("none");
  });
});

describe("watchDayChange", () => {
  function install({ online = true } = {}) {
    const page = Object.assign(new EventTarget(), { visibilityState: "visible" as DocumentVisibilityState });
    const reload = vi.fn();
    vi.stubGlobal("document", page);
    vi.stubGlobal("window", new EventTarget());
    vi.stubGlobal("location", { reload });
    vi.stubGlobal("navigator", { onLine: online });
    const render = vi.fn();
    const state = { ...createInitialState(), selectedDay: "2026-10-04", month: new Date(2026, 9, 1) };
    watchDayChange(state, render);
    const show = () => {
      page.visibilityState = "visible";
      page.dispatchEvent(new Event("visibilitychange"));
    };
    const hide = () => {
      page.visibilityState = "hidden";
      page.dispatchEvent(new Event("visibilitychange"));
    };
    return { state, render, reload, show, hide };
  }

  it("an app left open overnight shows today's events when it comes back", () => {
    vi.useFakeTimers();
    at("2026-10-04T23:00");
    const page = install({ online: false });
    page.hide();
    at("2026-10-05T08:00");
    page.show();
    expect(page.render).toHaveBeenCalledTimes(1);
    expect(page.state.selectedDay).toBe("2026-10-05");
    page.show(); // again the same day: nothing to do
    expect(page.render).toHaveBeenCalledTimes(1);
  });

  it("online, hours later, it loads the latest events", () => {
    vi.useFakeTimers();
    at("2026-10-04T23:00");
    const page = install();
    at("2026-10-05T08:00");
    page.show();
    expect(page.reload).toHaveBeenCalledTimes(1);
    expect(page.render).not.toHaveBeenCalled();
  });

  it("a page restored from the back-forward cache is checked too", () => {
    vi.useFakeTimers();
    at("2026-10-04T23:30");
    const page = install({ online: false });
    at("2026-10-05T00:10");
    window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true }));
    expect(page.render).toHaveBeenCalledTimes(1);
  });

  it("on screen across midnight, it draws today's events at midnight, and again the next night", () => {
    vi.useFakeTimers();
    at("2026-10-09T23:58");
    const page = install(); // online and loaded minutes ago: never a reload under the visitor's eyes
    vi.advanceTimersByTime(2 * 60 * 1000 - 2000);
    expect(page.render).not.toHaveBeenCalled(); // 23:59:58
    vi.advanceTimersByTime(4000);
    expect(page.render).toHaveBeenCalledTimes(1); // 00:00:02 on Saturday the 10th
    vi.advanceTimersByTime(24 * HOUR);
    expect(page.render).toHaveBeenCalledTimes(2);
    expect(page.reload).not.toHaveBeenCalled();
  });

  it("a timer for the next midnight in Bogotá, whatever the device's time zone", () => {
    expect(untilNextDay(new Date("2026-10-09T23:58:00-05:00").getTime())).toBe(2 * 60 * 1000 + 1000);
    expect(untilNextDay(new Date("2026-10-10T00:00:00-05:00").getTime())).toBe(24 * HOUR + 1000);
    expect(untilNextDay(new Date("2026-10-10T04:59:00Z").getTime())).toBe(60 * 1000 + 1000); // 23:59 in Bogotá
  });

  it("hidden, it does nothing yet", () => {
    vi.useFakeTimers();
    at("2026-10-04T23:30");
    const page = install({ online: false });
    at("2026-10-05T00:10");
    page.hide();
    expect(page.render).not.toHaveBeenCalled();
  });
});
