// One card per flyer and day (the owner, 28 Oct 2026): a post that announces several events on the same day (an
// academy's Saturday of classes, a competition and its social) was one card per event, the same flyer nine times in a
// row on a phone. Now they're one card with the flyer once and the day's schedule under it, each row its own event
// (views/eventCard.ts). Events of the same post on different days keep a card each: the day is what tells them apart.
// Only plain one-day events are grouped: a workshop series or an event over several days says its own days on its card.
// The list hands over the events it shows (already filtered: a row that doesn't match the filters isn't there).
// Here: which events share a card, and what a schedule says (its heading, rows' titles and places, its price).

import type { DanceEvent } from "../types";
import { isMultiDay, isSeries } from "./dates";
import { formatMoney, placeLabel, priceSummary } from "./format";
import { mainMedia } from "./links";

/** One card in a list: an event alone, or a flyer's events of one day (two or more). */
export type CardItem = { kind: "event"; event: DanceEvent } | { kind: "schedule"; events: DanceEvent[] };

/** What groups an event with others: its account, its main post and the day it's listed under. Null: never grouped. */
export function flyerKey(event: DanceEvent, listed?: string): string | null {
  if (isSeries(event) || isMultiDay(event)) return null;
  const post = mainMedia(event)?.post_id;
  return post ? `${event.account}|${post}|${listed ?? event.date}` : null;
}

/**
 * The cards of `events`, in their order: a flyer's events of one day together where the first of them is (an account's
 * events of a day are next to each other anyway: state.ts dayOrderKey), in the order they came. Pure (tested).
 */
export function cardItems(events: DanceEvent[], listedOn?: (event: DanceEvent) => string): CardItem[] {
  const items: CardItem[] = [];
  const schedules = new Map<string, DanceEvent[]>();
  for (const event of events) {
    const key = flyerKey(event, listedOn?.(event));
    const group = key ? schedules.get(key) : undefined;
    if (group) {
      group.push(event);
      continue;
    }
    const members = [event];
    if (key) schedules.set(key, members);
    items.push({ kind: "schedule", events: members });
  }
  return items.map((item) =>
    item.kind === "schedule" && item.events.length === 1 ? { kind: "event", event: item.events[0]! } : item,
  );
}

/**
 * What separates a title's shared part from each event's own: "Semana Ryan: Dancehall", "Taller - Salsa". A colon only
 * with a space after it: a time's ("Clase 10:00 Salsa") made the heading "Clase 10" and the rows "00 Salsa".
 */
const SEPARATOR = /\s*(?::\s|\s[-–—]\s)\s*/;

/**
 * A schedule's heading and each row's title: the part every title shares before a separator ("Semana Ryan", rows
 * "Dancehall con Erika Díaz", "Sexy Style con Cata Velasco"), or no heading and the titles whole. Pure (tested).
 */
export function scheduleTitles(titles: string[]): { heading: string | null; rows: string[] } {
  const split = titles.map((title) => {
    const at = title.match(SEPARATOR);
    return at?.index ? { head: title.slice(0, at.index).trim(), tail: title.slice(at.index + at[0].length).trim() } : null;
  });
  const head = split[0]?.head;
  const shared =
    titles.length > 1 &&
    head &&
    split.every((part) => part && part.tail && part.head.toLocaleLowerCase("es") === head.toLocaleLowerCase("es"));
  return shared ? { heading: head, rows: split.map((part) => part!.tail) } : { heading: null, rows: titles };
}

/** What every one of `values` says, or "" when they differ. */
export const shared = (values: string[]) => (values.every((value) => value === values[0]) ? (values[0] ?? "") : "");

/** The parts of a place, from the one that best tells two apart: the venue ("Sede 109"), the area, the address. */
const PLACE_PARTS: ((event: DanceEvent) => string)[] = [
  (event) => (event.venue && event.venue !== event.organizer ? event.venue : ""),
  (event) => event.area ?? "",
  (event) => event.address ?? "",
];

/**
 * How a schedule's row says its place when the rows' places differ: only the part that differs ("Fontibón", "Norte";
 * "Sede 109", "Sede 127"), not the whole line, which wrapped on a phone. The whole place in the details.
 */
export function rowPlace(events: DanceEvent[]): (event: DanceEvent) => string {
  return PLACE_PARTS.find((part) => new Set(events.map(part)).size > 1) ?? placeLabel;
}

/**
 * A schedule's price at the card's foot: the one they all have, else "Desde" the lowest of all ("" when the lowest is
 * free or none has a price: the rows' details say theirs).
 */
export function schedulePrice(events: DanceEvent[]): string {
  const summaries = events.map(priceSummary);
  if (summaries.every(Boolean)) {
    const same = shared(summaries);
    if (same) return same;
  }
  const amounts = events.flatMap((event) => event.prices.map((price) => price.amount_cop));
  const lowest = amounts.length ? Math.min(...amounts) : 0;
  return lowest > 0 ? `Desde ${formatMoney(lowest)}` : "";
}
