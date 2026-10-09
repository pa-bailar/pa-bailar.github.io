// "Próximos": upcoming events grouped by period (today, this week, the weekend, next week, by month).
// On phones it reads like an Instagram feed (event-card.css); the jump bar (jumpBar.ts) filters it and keeps the
// period being read in place.
//
// Every event is shown, in every period (the owner, 8 Oct 2026). Until then a busy period showed six events and
// "Ver 25 más", and later months started as a row of small flyers: between busy periods the button scrolled by
// unnoticed, and the weekend's six were all Friday's, its Saturday and Sunday folded away. The calendar is for
// browsing further ahead. The weekend, the busiest period, goes under a heading per day.

import type { AppState, DanceEvent } from "../types";
import { escapeHtml } from "../lib/dom";
import { ICONS } from "../lib/icons";
import { PERIOD_SHARE_TITLES } from "../lib/shareText";
import { eventCountLabel, formatDayHeading } from "../lib/format";
import { todayIso } from "../lib/dates";
import { eventsInView, groupByPeriod, listedDay, matchesFilters, sectionId } from "../state";
import { emptyResultsHtml } from "./filters";
import { applyFlyerRatios, eventCardGridHtml } from "./eventCard";
import type { AgendaGroup } from "../state";

/** Periods whose events go under a heading per day ("Mañana · Viernes, 9 de octubre"). */
const BY_DAY = new Set(["fin-de-semana"]);

/** A period's cards; the weekend's under a heading per day (`listedOn`: the day each event is listed under). */
export function groupBodyHtml(group: AgendaGroup, listedOn: (event: DanceEvent) => string): string {
  if (!BY_DAY.has(group.key)) return eventCardGridHtml(group.events, listedOn);
  const days = new Map<string, DanceEvent[]>();
  for (const event of group.events) {
    const day = listedOn(event);
    days.set(day, [...(days.get(day) ?? []), event]);
  }
  return [...days]
    .map(([day, list]) => `<h3 class="day-heading agenda-day">${escapeHtml(formatDayHeading(day))}</h3>${eventCardGridHtml(list, listedOn)}`)
    .join("");
}

/** The share icon on a near period's heading (views/sharing.ts shares it). */
function shareIconHtml(group: AgendaGroup): string {
  return `
    <button class="share-icon" type="button" data-share="periodo-${escapeHtml(group.key)}" data-track="compartir-periodo"
      aria-label="Compartir: ${escapeHtml(group.label)}">${ICONS.share}</button>`;
}

/**
 * Renders the list; returns how many events it shows and their periods (for the jump bar). `searched`: the events the
 * search alone finds (an empty list says whether the search or the filters are why).
 */
export function renderUpcomingView(
  container: HTMLElement,
  events: DanceEvent[],
  state: AppState,
  searched = 0,
): { shown: number; groups: AgendaGroup[] } {
  const today = todayIso();
  const upcoming = eventsInView(events, state).filter((event) => matchesFilters(event, state, undefined, today));
  const groups = groupByPeriod(upcoming, today, state);
  const listedOn = (event: DanceEvent) => listedDay(event, state, today);
  if (!upcoming.length) {
    container.innerHTML =
      emptyResultsHtml(state, searched) ??
      `<div class="empty-state">
        <p>No hay eventos próximos por ahora.</p>
        <p>Las academias publican casi a diario: vuelve en unos días.</p>
      </div>`;
  } else {
    container.innerHTML = groups
      .map(
        (group) => `
        <section class="agenda-group" id="${sectionId(group.key)}" data-period="${escapeHtml(group.key)}">
          <header class="agenda-group__header">
            <h2 class="agenda-group__heading" tabindex="-1">${escapeHtml(group.label)}</h2>
            <span class="agenda-group__count">${eventCountLabel(group.events.length)}</span>
            ${PERIOD_SHARE_TITLES[group.key] ? shareIconHtml(group) : ""}
          </header>
          ${groupBodyHtml(group, listedOn)}
        </section>`,
      )
      .join("");
    applyFlyerRatios(container);
  }
  return { shown: upcoming.length, groups };
}
