import { afterEach, describe, expect, it, vi } from "vitest";
import { endsAt, isUpcoming, nowInBogota, shownDay } from "../src/scripts/lib/dates";
import { createInitialState, dateOptions, eventsInView, groupByPeriod, visibleEvents } from "../src/scripts/state";
import { event, seriesEvent } from "./factories";

// A Saturday social from 9:00 p. m. to 3:00 a. m.: one night past midnight, so end_date is null (docs/DATA.md).
const night = event({ id: "social-3-oct", date: "2026-10-03", start_time: "21:00", end_time: "03:00" });

/** The clock at `time` in Bogotá (UTC−5 all year). */
function at(time: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${time}:00-05:00`));
}

afterEach(() => {
  vi.useRealTimers();
});

describe("when an event is over (endsAt, isUpcoming)", () => {
  it("a night past midnight: at its end time the morning after", () => {
    expect(endsAt(night)).toBe("2026-10-04 03:00");
    expect(isUpcoming(night, "2026-10-03 23:00")).toBe(true);
    expect(isUpcoming(night, "2026-10-04 00:30")).toBe(true);
    expect(isUpcoming(night, "2026-10-04 02:59")).toBe(true);
    expect(isUpcoming(night, "2026-10-04 03:00")).toBe(false);
    expect(isUpcoming(night, "2026-10-05 00:30")).toBe(false);
  });

  it("any other: at the end of its last day", () => {
    const evening = event({ date: "2026-10-03", start_time: "19:00", end_time: "23:00" });
    const toMidnight = event({ date: "2026-10-03", start_time: "21:00", end_time: "00:00" });
    const untimed = event({ date: "2026-10-03" });
    // Over several days the times are the first day's start and the last day's end: not one night.
    const festival = event({ date: "2026-10-02", end_date: "2026-10-03", start_time: "20:00", end_time: "16:00" });
    for (const item of [evening, toMidnight, untimed, festival]) {
      expect(endsAt(item)).toBe("2026-10-03 24:00");
      expect(isUpcoming(item, "2026-10-03 23:59")).toBe(true);
      expect(isUpcoming(item, "2026-10-04 00:30")).toBe(false);
    }
  });

  it("a workshop series: its last session's times", () => {
    const late = seriesEvent({
      sessions: [
        { date: "2026-11-08", start_time: "14:00", end_time: "17:00" },
        { date: "2026-11-22", start_time: "22:00", end_time: "02:00" },
      ],
    });
    expect(endsAt(late)).toBe("2026-11-23 02:00");
    expect(endsAt(seriesEvent())).toBe("2026-12-06 24:00");
  });

  it("a day alone means its start: anything still on that morning counts", () => {
    expect(isUpcoming(night, "2026-10-03")).toBe(true);
    expect(isUpcoming(night, "2026-10-04")).toBe(true);
    expect(isUpcoming(night, "2026-10-05")).toBe(false);
  });

  it("now is Bogotá's, whatever the visitor's time zone", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-04T05:30:00Z"));
    expect(nowInBogota()).toBe("2026-10-04 00:30");
    vi.setSystemTime(new Date("2026-10-04T04:59:00Z"));
    expect(nowInBogota()).toBe("2026-10-03 23:59");
  });
});

describe("a night past midnight in the list", () => {
  const upcoming = () => createInitialState();
  const ids = (events: { id: string }[]) => events.map((item) => item.id);

  it("is still listed after midnight, under Hoy", () => {
    at("2026-10-04T00:30");
    expect(ids(eventsInView([night], upcoming()))).toEqual([night.id]);
    expect(shownDay(night, "2026-10-04")).toBe("2026-10-04");
    expect(groupByPeriod(visibleEvents([night], upcoming())).map((group) => group.key)).toEqual(["hoy"]);
  });

  it("…also with Hoy chosen in Cuándo, which counts it", () => {
    at("2026-10-04T00:30");
    const state = { ...upcoming(), dates: ["hoy"] };
    expect(ids(visibleEvents([night], state))).toEqual([night.id]);
    expect(dateOptions([night], [night]).map(({ key, count }) => [key, count])).toEqual([["hoy", 1]]);
  });

  it("leaves it at its end time", () => {
    at("2026-10-04T03:00");
    expect(eventsInView([night], upcoming())).toEqual([]);
  });

  it("a night that ended before midnight leaves at midnight, as before", () => {
    at("2026-10-04T00:30");
    expect(eventsInView([event({ date: "2026-10-03", start_time: "19:00", end_time: "23:00" })], upcoming())).toEqual([]);
  });
});
