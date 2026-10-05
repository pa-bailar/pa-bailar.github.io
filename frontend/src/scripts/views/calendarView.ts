// "Calendario": month grid plus the selected day's events.
// A tap on a day changes the list under the grid, so the change shows where the eye is: the day's heading says how
// many events it has and lights up briefly when the day changes (not on other redraws; no flash with reduced motion).

import type { AppState, DanceEvent } from "../types";
import { byId, escapeHtml } from "../lib/dom";
import { daysInMonth, mondayOffset, todayIso, toIsoDate } from "../lib/dates";
import { isHoliday } from "../lib/holidays";
import { eventCountLabel, formatDayHeading, formatLongDate, formatMonthTitle } from "../lib/format";
import { groupByDay, hasActiveFilters, matchesFilters } from "../state";
import { applyFlyerRatios, eventCardGridHtml } from "./eventCard";
import { emptyActionsHtml } from "./filters";

const WEEKDAY_INITIALS = ["L", "M", "M", "J", "V", "S", "D"];
let shownDay: string | null = null; // the day the list last showed: a different one lights its heading up
const MAX_PILLS_PER_DAY = 3;
/** Phones: at most two rows of dots (three to a row), so a busy day never makes its week taller than the others. */
export const MAX_DOTS_PER_DAY = 6;

/**
 * A day's dots on phones, one per event in its type's color. More than MAX_DOTS_PER_DAY: the first four and "+N" in the
 * last two places (as the wide screens' "+N" after three names): on a 320 px phone a row holds three dots, and "+N"
 * needs two dots' room ("+12" too). The exact count is in the day's label and heading.
 */
export function dotsHtml(dayEvents: Pick<DanceEvent, "event_type">[]): string {
  const dot = (event: Pick<DanceEvent, "event_type">) => `<i class="cal-dot t-${escapeHtml(event.event_type)}"></i>`;
  if (dayEvents.length <= MAX_DOTS_PER_DAY) return dayEvents.map(dot).join("");
  const shown = MAX_DOTS_PER_DAY - 2;
  return `${dayEvents.slice(0, shown).map(dot).join("")}<span class="cal-dots-more">+${dayEvents.length - shown}</span>`;
}

function dayCellHtml(iso: string, dayNumber: number, dayEvents: DanceEvent[], state: AppState): string {
  const today = todayIso();
  const modifiers = [
    iso < today && "is-past",
    iso === today && "is-today",
    iso === state.selectedDay && "is-selected",
    isHoliday(iso) && "is-holiday",
  ].filter(Boolean);
  const pills = dayEvents
    .slice(0, MAX_PILLS_PER_DAY)
    .map((event) => `<span class="cal-pill t-${escapeHtml(event.event_type)}">${escapeHtml(event.title)}</span>`)
    .join("");
  const more = dayEvents.length > MAX_PILLS_PER_DAY ? `<span class="cal-more">+${dayEvents.length - MAX_PILLS_PER_DAY}</span>` : "";
  const dots = dotsHtml(dayEvents);
  const count = dayEvents.length;
  const holiday = isHoliday(iso) ? ", festivo" : "";
  const label = `${formatLongDate(iso)}${holiday}${count ? `, ${eventCountLabel(count)}` : ""}`;

  return `
    <button class="cal-day ${modifiers.join(" ")}" data-day="${iso}" aria-label="${label}" aria-pressed="${iso === state.selectedDay}">
      <span class="cal-day__number">${dayNumber}</span>
      <span class="cal-day__pills">${pills}${more}</span>
      <span class="cal-day__dots">${dots}</span>
    </button>`;
}

function emptyDayHtml(state: AppState): string {
  if (!hasActiveFilters(state)) return `<p class="text-muted">No hay eventos este día.</p>`;
  const why = state.query.trim() ? `que coincidan con «${escapeHtml(state.query.trim())}»` : "con estos filtros";
  return `<div class="empty-state">
      <p>No hay eventos este día ${why}.</p>
      <div class="empty-state__actions">${emptyActionsHtml(state)}</div>
    </div>`;
}

/** Renders the month and returns how many events the selected day shows. */
export function renderCalendarView(events: DanceEvent[], state: AppState): number {
  const { month } = state;
  const byDay = groupByDay(events.filter((event) => matchesFilters(event, state)));

  const cells = WEEKDAY_INITIALS.map((initial) => `<div class="cal-weekday" aria-hidden="true">${initial}</div>`);
  for (let i = 0; i < mondayOffset(month); i++) cells.push(`<div class="cal-day cal-day--blank"></div>`);
  for (let day = 1; day <= daysInMonth(month); day++) {
    const iso = toIsoDate(new Date(month.getFullYear(), month.getMonth(), day));
    cells.push(dayCellHtml(iso, day, byDay.get(iso) ?? [], state));
  }

  byId("cal-title").textContent = formatMonthTitle(month);
  byId("cal-grid").innerHTML = cells.join("");

  const selectedEvents = byDay.get(state.selectedDay) ?? [];
  const changed = shownDay !== null && shownDay !== state.selectedDay;
  shownDay = state.selectedDay;
  const count = selectedEvents.length
    ? `<span class="day-heading__count">${escapeHtml(eventCountLabel(selectedEvents.length))}</span>`
    : "";
  byId("cal-selected-day").innerHTML = `
    <h2 class="day-heading calendar__day-heading${changed ? " is-new" : ""}">${escapeHtml(formatDayHeading(state.selectedDay))}${count}</h2>
    ${selectedEvents.length ? eventCardGridHtml(selectedEvents) : emptyDayHtml(state)}`;
  applyFlyerRatios(byId("cal-selected-day"));
  return selectedEvents.length;
}
