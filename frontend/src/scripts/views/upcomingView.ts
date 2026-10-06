// "Próximos": upcoming events grouped by period (today, this week, the weekend, next week, by month).
// On phones it reads like an Instagram feed (event-card.css); the jump bar (jumpBar.ts) filters it and keeps the
// period being read in place.
//
// A long list stays short where it matters (people think in "tonight, this weekend, next week"):
//   - the near periods (OPEN_PERIODS) show their flyers in full; later ones start as a summary row, with
//     their first flyers as small squares and "Ver los 23 eventos";
//   - a busy open period shows PERIOD_LIMIT events, then "Ver 7 más";
//   - a short list (SHORT_LIST events or fewer, e.g. once filtered) is always shown whole;
//   - periods chosen in the date filter are shown whole: the visitor asked for them.
// What the visitor opens stays open while they filter or switch views.

import type { AppState, DanceEvent } from "../types";
import { escapeHtml } from "../lib/dom";
import { ICONS } from "../lib/icons";
import { PERIOD_SHARE_TITLES } from "../lib/shareText";
import { eventCountLabel } from "../lib/format";
import { mainMedia, thumbUrl } from "../lib/links";
import { todayIso } from "../lib/dates";
import { eventsInView, groupByPeriod, matchesFilters, sectionId } from "../state";
import { emptyResultsHtml } from "./filters";
import { applyFlyerRatios, eventCardGridHtml } from "./eventCard";
import type { AgendaGroup } from "../state";

/** Shown in full from the start: what most visitors come for. Later periods start summarized. */
const OPEN_PERIODS = new Set(["hoy", "esta-semana", "fin-de-semana", "proxima-semana"]);
/** With this many events or fewer, every period is shown whole: summaries only shorten long lists. */
const SHORT_LIST = 12;
/** Events an open period shows before "Ver N más" (two rows of three on wide screens). */
const PERIOD_LIMIT = 6;
/** Small flyers in a summarized period's row. */
const PREVIEW_FLYERS = 5;

/** Periods the visitor asked to see whole ("Ver los 23 eventos", "Ver 7 más", or a shared link's event). */
const shownWhole = new Set<string>();

/** Show a period whole. False if it already was (nothing to redraw). */
export function showWholePeriod(key: string): boolean {
  if (shownWhole.has(key)) return false;
  shownWhole.add(key);
  return true;
}

/** The periods shown whole, and setting them back (going back in history: screenHistory.ts). */
export const wholePeriods = (): string[] => [...shownWhole];

export function setWholePeriods(keys: string[]) {
  shownWhole.clear();
  keys.forEach((key) => shownWhole.add(key));
}

/** "Ver los 23 eventos": a summarized period, its first flyers as small squares. */
function summaryHtml(group: AgendaGroup): string {
  const thumbs = [...new Set(group.events.map((event) => thumbUrl(mainMedia(event))).filter(Boolean))]
    .slice(0, PREVIEW_FLYERS)
    .map((url) => `<img src="${escapeHtml(url!)}" alt="" width="160" height="160" loading="lazy" decoding="async" />`)
    .join("");
  const count = group.events.length;
  return `
    <button class="period-summary" type="button" data-show-period="${escapeHtml(group.key)}">
      <span class="period-summary__flyers" aria-hidden="true">${thumbs}</span>
      <span class="period-summary__label">${count === 1 ? "Ver el evento" : `Ver los ${count} eventos`}</span>
    </button>`;
}

/**
 * "Ver 10 más ⌄" under a busy period's first events: the rest of this list unfolds here. A wide button of its own,
 * not a month's block (the owner, 6 Oct 2026: a small button went unnoticed, and a block would read as a month).
 */
function moreHtml(group: AgendaGroup, rest: number): string {
  return `
    <button class="period-more" type="button" data-show-period="${escapeHtml(group.key)}">
      <span>Ver ${rest} más</span>${ICONS.chevronDown}
    </button>`;
}

/** Whether the period at `position` shows its events, or starts as a summary row. */
export function isPeriodOpen(groups: AgendaGroup[], position: number): boolean {
  const group = groups[position];
  if (!group) return false;
  const total = groups.reduce((sum, item) => sum + item.events.length, 0);
  // Nothing in the near periods (e.g. a quiet month): the first period opens instead.
  const anyNear = groups.some((item) => OPEN_PERIODS.has(item.key));
  return total <= SHORT_LIST || shownWhole.has(group.key) || OPEN_PERIODS.has(group.key) || (!anyNear && position === 0);
}

/**
 * A shared link's event in the list: whether it's there at all (not when it's past), and the period to open whole
 * first when its card isn't shown yet (a summarized period, or past a busy period's "Ver N más").
 */
export function sharedEventEntry(groups: AgendaGroup[], id: string): { listed: false } | { listed: true; open: string | null } {
  const position = groups.findIndex((group) => group.events.some((event) => event.id === id));
  const group = groups[position];
  if (!group) return { listed: false };
  const index = group.events.findIndex((event) => event.id === id);
  const shown =
    isPeriodOpen(groups, position) && (shownWhole.has(group.key) || group.events.length <= PERIOD_LIMIT || index < PERIOD_LIMIT);
  return { listed: true, open: shown ? null : group.key };
}

/** `whole`: every event, without "Ver N más" (a period chosen in the date filter). */
function groupBodyHtml(group: AgendaGroup, open: boolean, whole: boolean): string {
  if (whole) return eventCardGridHtml(group.events);
  if (!open) return summaryHtml(group);
  if (shownWhole.has(group.key) || group.events.length <= PERIOD_LIMIT) return eventCardGridHtml(group.events);
  return `
    ${eventCardGridHtml(group.events.slice(0, PERIOD_LIMIT))}
    ${moreHtml(group, group.events.length - PERIOD_LIMIT)}`;
}

/** The share icon on a near period's heading (views/sharing.ts shares it). */
function shareIconHtml(group: AgendaGroup): string {
  return `
    <button class="share-icon" type="button" data-share="periodo-${escapeHtml(group.key)}" data-track="compartir-periodo"
      aria-label="Compartir: ${escapeHtml(group.label)}">${ICONS.share}</button>`;
}

/** Renders the list; returns how many events it shows and their periods (for the jump bar). */
export function renderUpcomingView(
  container: HTMLElement,
  events: DanceEvent[],
  state: AppState,
): { shown: number; groups: AgendaGroup[] } {
  const upcoming = eventsInView(events, state).filter((event) => matchesFilters(event, state));
  const groups = groupByPeriod(upcoming, todayIso(), state.dates);
  const datesChosen = state.dates.length > 0;
  if (!upcoming.length) {
    container.innerHTML =
      emptyResultsHtml(state) ??
      `<div class="empty-state">
        <p>No hay eventos próximos por ahora.</p>
        <p>Las academias publican casi a diario: vuelve en unos días.</p>
      </div>`;
  } else {
    container.innerHTML = groups
      .map((group, position) => {
        const open = isPeriodOpen(groups, position);
        return `
        <section class="agenda-group" id="${sectionId(group.key)}" data-period="${escapeHtml(group.key)}">
          <header class="agenda-group__header">
            <h2 class="agenda-group__heading" tabindex="-1">${escapeHtml(group.label)}</h2>
            <span class="agenda-group__count">${eventCountLabel(group.events.length)}</span>
            ${PERIOD_SHARE_TITLES[group.key] ? shareIconHtml(group) : ""}
          </header>
          ${groupBodyHtml(group, open, datesChosen)}
        </section>`;
      })
      .join("");
    applyFlyerRatios(container);
  }
  return { shown: upcoming.length, groups };
}
