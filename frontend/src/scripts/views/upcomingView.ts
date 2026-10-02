// "Próximos": upcoming events grouped by period (today, this week, the weekend, next week, by month).
// On phones it reads like an Instagram feed (event-card.css); the jump bar (jumpBar.ts) moves between periods.
//
// A long list stays short where it matters (people think in "tonight, this weekend, next week"):
//   - the near periods (OPEN_PERIODS) show their flyers in full; later ones start as a summary row, with
//     their first flyers as small squares and "Ver los 23 eventos";
//   - a busy open period shows PERIOD_LIMIT events, then "Ver 7 más";
//   - a short list (SHORT_LIST events or fewer, e.g. once filtered) is always shown whole.
// What the visitor opens stays open while they filter or switch views.

import type { AppState, DanceEvent } from "../types";
import { escapeHtml } from "../lib/dom";
import { eventCountLabel } from "../lib/format";
import { mainMedia, thumbUrl } from "../lib/links";
import { eventsInView, groupByPeriod, hasActiveFilters, matchesFilters, sectionId } from "../state";
import { eventCardGridHtml } from "./eventCard";
import type { AgendaGroup } from "../state";

/** Shown in full from the start: what most visitors come for. Later periods start summarized. */
const OPEN_PERIODS = new Set(["hoy", "esta-semana", "fin-de-semana", "proxima-semana"]);
/** With this many events or fewer, every period is shown whole: summaries only shorten long lists. */
const SHORT_LIST = 12;
/** Events an open period shows before "Ver N más" (two rows of three on wide screens). */
const PERIOD_LIMIT = 6;
/** Small flyers in a summarized period's row. */
const PREVIEW_FLYERS = 5;

/** Periods the visitor asked to see whole ("Ver los 23 eventos", "Ver 7 más", or the period menu). */
const shownWhole = new Set<string>();

/** Show a period whole. False if it already was (nothing to redraw). */
export function showWholePeriod(key: string): boolean {
  if (shownWhole.has(key)) return false;
  shownWhole.add(key);
  return true;
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

function groupBodyHtml(group: AgendaGroup, open: boolean): string {
  if (!open) return summaryHtml(group);
  if (shownWhole.has(group.key) || group.events.length <= PERIOD_LIMIT) return eventCardGridHtml(group.events);
  const rest = group.events.length - PERIOD_LIMIT;
  return `
    ${eventCardGridHtml(group.events.slice(0, PERIOD_LIMIT))}
    <button class="btn period-more" type="button" data-show-period="${escapeHtml(group.key)}">Ver ${rest} más</button>`;
}

/** Renders the list; returns how many events it shows and their periods (for the jump bar). */
export function renderUpcomingView(
  container: HTMLElement,
  events: DanceEvent[],
  state: AppState,
): { shown: number; groups: AgendaGroup[] } {
  const upcoming = eventsInView(events, state).filter((event) => matchesFilters(event, state));
  const groups = groupByPeriod(upcoming);

  if (!upcoming.length) {
    container.innerHTML = hasActiveFilters(state)
      ? `<div class="empty-state">
          <p>No hay eventos próximos con estos filtros.</p>
          <button class="btn" data-clear-filters>Quitar filtros</button>
        </div>`
      : `<div class="empty-state">
          <p>No hay eventos próximos por ahora.</p>
          <p>Las academias publican casi a diario: vuelve en unos días.</p>
        </div>`;
  } else {
    const short = upcoming.length <= SHORT_LIST;
    // Nothing in the near periods (e.g. a quiet month): the first period opens instead.
    const anyNear = groups.some((group) => OPEN_PERIODS.has(group.key));
    container.innerHTML = groups
      .map((group, position) => {
        const open = short || shownWhole.has(group.key) || OPEN_PERIODS.has(group.key) || (!anyNear && position === 0);
        return `
        <section class="agenda-group" id="${sectionId(group.key)}" data-period="${escapeHtml(group.key)}">
          <header class="agenda-group__header">
            <h2 class="agenda-group__heading" tabindex="-1">${escapeHtml(group.label)}</h2>
            <span class="agenda-group__count">${eventCountLabel(group.events.length)}</span>
          </header>
          ${groupBodyHtml(group, open)}
        </section>`;
      })
      .join("");
  }
  return { shown: upcoming.length, groups };
}
