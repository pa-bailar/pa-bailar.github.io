// "Guardados": the events the visitor saved (lib/saved.ts), a place of its own like Instagram's Saved, not a filter
// over the other views (the owner, 5 October 2026). The ones still to come by period, as in the list but always whole,
// under "Compartir mis planes"; the ones already past folded at the end ("Ya pasaron (2)"), the latest first.
// The filters don't apply here (a short, personal list: Filtros is off, the pinned bar and the toolbar's pills hidden);
// the search does, as in every view.

import type { AppState, DanceEvent } from "../types";
import { escapeHtml } from "../lib/dom";
import { ICONS } from "../lib/icons";
import { eventCountLabel } from "../lib/format";
import { isUpcoming, lastDay, nowInBogota, todayIso } from "../lib/dates";
import { viewPath } from "../lib/links";
import { isSaved } from "../lib/saved";
import { matchesWords } from "../lib/search";
import { type AgendaGroup, groupByPeriod, shownDays } from "../state";
import { applyFlyerRatios, eventCardGridHtml } from "./eventCard";

/**
 * The saved events matching the search: still to come (the list's order comes with its periods), and past ones, the
 * latest first. A day searched is found among their days as the filters' model shows them (shownDays): the days to
 * come, or every day of a past one ("sábado" keeps last Saturday's plans in "Ya pasaron"). Pure, so it's tested.
 */
export function savedLists(
  events: DanceEvent[],
  { saved, query, now }: { saved: (id: string) => boolean; query: string; now: string },
): { upcoming: DanceEvent[]; past: DanceEvent[] } {
  const today = now.slice(0, 10);
  const searched = (event: DanceEvent) =>
    matchesWords(event, query, today) && shownDays(event, { view: "saved", query }, today).length > 0;
  const mine = events.filter((event) => saved(event.id) && searched(event));
  const upcoming = mine.filter((event) => isUpcoming(event, now));
  const past = mine.filter((event) => !isUpcoming(event, now)).sort((a, b) => lastDay(b).localeCompare(lastDay(a)));
  return { upcoming, past };
}

/**
 * One light row: "Tus 3 eventos guardados" and a small "Compartir" at its end, named "Compartir mis planes" (it starts
 * with its visible word). views/sharing.ts shares them (lib/shareSources.ts "planes").
 */
function plansBarHtml(count: number): string {
  return `
    <div class="plans-bar">
      <p class="plans-bar__count">${count === 1 ? "Tu evento guardado" : `Tus ${count} eventos guardados`}</p>
      <button class="btn btn--primary plans-bar__share" type="button" data-share="planes" data-track="compartir-planes"
        aria-label="Compartir mis planes">${ICONS.share}Compartir</button>
    </div>`;
}

/** A period of the saved events: its heading and every card (no summaries: the list is short). No id: the list's
 * sections have them, and its stale copy stays in the page while Guardados shows. */
function groupHtml(group: AgendaGroup): string {
  return `
    <section class="agenda-group">
      <header class="agenda-group__header">
        <h2 class="agenda-group__heading">${escapeHtml(group.label)}</h2>
        <span class="agenda-group__count">${eventCountLabel(group.events.length)}</span>
      </header>
      ${eventCardGridHtml(group.events)}
    </section>`;
}

const SEE_EVENTS = `<a class="btn btn--primary" href="${viewPath("upcoming")}" data-view="upcoming">Ver eventos</a>`;

/** Nothing to show: nothing saved yet (how to save), or nothing saved matches the search. */
export function emptySavedHtml(query: string): string {
  const text = query.trim();
  if (text) {
    return `
      <div class="empty-state">
        <p class="empty-state__title">No encontramos eventos guardados</p>
        <p>Nada de lo que guardaste coincide con «${escapeHtml(text)}».</p>
        <div class="empty-state__actions"><button class="btn" type="button" data-clear-search>Borrar la búsqueda</button></div>
      </div>`;
  }
  return `
    <div class="empty-state saved-empty">
      <span class="saved-empty__icon" aria-hidden="true">${ICONS.bookmark}</span>
      <p class="empty-state__title">Aún no tienes eventos guardados</p>
      <p>Toca ${ICONS.bookmark}<span class="visually-hidden">(Guardar)</span> en un evento para tenerlo aquí, a la mano.
        Se quedan en este navegador, sin crear cuenta.</p>
      <div class="empty-state__actions">${SEE_EVENTS}</div>
    </div>`;
}

/** The past saved events, folded: "Ya pasaron (2)". `open`: as the visitor left it. */
function pastHtml(past: DanceEvent[], open: boolean): string {
  return `
    <details class="saved-past"${open ? " open" : ""}>
      <summary class="saved-past__summary">Ya pasaron <span class="saved-past__count">(${past.length})</span>${ICONS.chevronDown}</summary>
      ${eventCardGridHtml(past)}
    </details>`;
}

/** Renders Guardados; returns how many saved events are still to come (said to screen readers). */
export function renderSavedView(container: HTMLElement, events: DanceEvent[], state: AppState): number {
  const { upcoming, past } = savedLists(events, { saved: isSaved, query: state.query, now: nowInBogota() });
  // Drawn again (a save, a search): the past ones stay open or folded as they were.
  const pastOpen = container.querySelector<HTMLDetailsElement>(".saved-past")?.open ?? false;
  if (!upcoming.length && !past.length) {
    container.innerHTML = emptySavedHtml(state.query);
    return 0;
  }
  const none = state.query.trim()
    ? `<p class="saved-note">Ningún evento por venir coincide con «${escapeHtml(state.query.trim())}».</p>`
    : `<div class="saved-note"><p>Ninguno de tus eventos guardados está por venir.</p>${SEE_EVENTS}</div>`;
  container.innerHTML = [
    upcoming.length ? plansBarHtml(upcoming.length) : none,
    ...groupByPeriod(upcoming, todayIso(), { view: "saved", query: state.query }).map(groupHtml), // on a day searched
    past.length ? pastHtml(past, pastOpen) : "",
  ].join("");
  applyFlyerRatios(container);
  return upcoming.length;
}
