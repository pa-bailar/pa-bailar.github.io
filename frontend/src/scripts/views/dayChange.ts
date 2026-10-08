// An open page that comes back on another day: an installed app left open overnight, a tab from yesterday. The page
// draws once when it opens (main.ts), so without this "Hoy" would still be yesterday's and past events would stay.
//   - When it's shown again (`visibilitychange`, or `pageshow` from the back-forward cache) on another Bogotá day, the
//     calendar's day and month move to today if they were the day it was drawn on, and the views draw again.
//   - The same day, once it's been a while (REDRAW_AFTER_MS): drawn again, so the events that ended meanwhile go (an
//     installed app opened at 7 p.m. and again at 11 p.m. still listed the 7–10 p.m. social under Hoy: the iPhone
//     audit, 8 Oct 2026).
//   - Hours later (STALE_AFTER_MS) and online, it loads again instead: the events are embedded at build time, and the
//     site is rebuilt twice a day with the sweep. The service worker serves pages network first, so that's the latest.
//   - A page on screen across midnight (Bogotá's): a timer for the next midnight draws it again then (never a reload
//     under the visitor's eyes), and is set again for the one after.

import type { AppState } from "../types";
import { parseIsoDate, sameMonth, todayIso, toIsoDate } from "../lib/dates";

/** How old a page may be when it's shown again before it's loaded again (online). */
export const STALE_AFTER_MS = 6 * 60 * 60 * 1000;

/** How long since it was drawn before a page shown again the same day is drawn again (events ended meanwhile). */
export const REDRAW_AFTER_MS = 30 * 60 * 1000;

/**
 * The day changed from `before` to `today`: the calendar's selected day and month follow it when they were the day it
 * was drawn on (a day or month the visitor chose stays).
 */
export function moveToToday(state: Pick<AppState, "selectedDay" | "month">, before: string, today: string) {
  if (state.selectedDay === before) state.selectedDay = today;
  if (sameMonth(toIsoDate(state.month), before)) state.month = parseIsoDate(`${today.slice(0, 7)}-01`);
}

/** What a page shown again does: load again (old and online), draw again (another day, or a while since), or nothing. */
export function resumeAction({
  loadedAt,
  now,
  online,
  renderedDay,
  renderedAt = loadedAt,
  today,
}: {
  loadedAt: number;
  now: number;
  online: boolean;
  renderedDay: string;
  renderedAt?: number;
  today: string;
}): "reload" | "render" | "none" {
  if (online && now - loadedAt > STALE_AFTER_MS) return "reload";
  return today !== renderedDay || now - renderedAt > REDRAW_AFTER_MS ? "render" : "none";
}

const HOUR_MS = 60 * 60 * 1000;
const BOGOTA_OFFSET_MS = 5 * HOUR_MS; // UTC−5 all year
const DAY_MS = 24 * HOUR_MS;
const AFTER_MIDNIGHT_MS = 1000; // a second past it, so "today" is surely the new day

/** How long from `now` until just after the next midnight in Bogotá. */
export function untilNextDay(now: number): number {
  const sinceMidnight = (((now - BOGOTA_OFFSET_MS) % DAY_MS) + DAY_MS) % DAY_MS;
  return DAY_MS - sinceMidnight + AFTER_MIDNIGHT_MS;
}

/**
 * Watches for the page shown again (main.ts, start), and for midnight while it's on screen. `render` draws every view
 * again.
 */
export function watchDayChange(state: AppState, render: () => void) {
  const loadedAt = Date.now();
  let renderedDay = todayIso();
  let renderedAt = loadedAt;
  const check = () => {
    if (document.visibilityState !== "visible") return;
    const today = todayIso();
    const now = Date.now();
    const action = resumeAction({ loadedAt, now, online: navigator.onLine, renderedDay, renderedAt, today });
    if (action === "reload") location.reload();
    else if (action === "render") {
      moveToToday(state, renderedDay, today);
      renderedDay = today;
      renderedAt = now;
      render();
    }
  };
  document.addEventListener("visibilitychange", check);
  window.addEventListener("pageshow", (event) => {
    if ((event as PageTransitionEvent).persisted) check();
  });
  // Midnight with the page on screen: drawn again for the new day. Hidden, it waits to be shown (check, above).
  const atMidnight = () => {
    const today = todayIso();
    if (document.visibilityState === "visible" && today !== renderedDay) {
      moveToToday(state, renderedDay, today);
      renderedDay = today;
      render();
    }
    setTimeout(atMidnight, untilNextDay(Date.now()));
  };
  setTimeout(atMidnight, untilNextDay(Date.now()));
}
