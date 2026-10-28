// One card per flyer and day (the owner, 28 Oct 2026): a post that announces several events on the same day (an
// academy's Saturday of classes, a competition and its social) was one card per event, the same flyer nine times in a
// row on a phone. Now they're one card with the flyer once and the day's schedule under it, each row its own event
// (views/eventCard.ts). Events of the same post on different days keep a card each: the day is what tells them apart.
// Only plain one-day events are grouped: a workshop series or an event over several days says its own days on its card.
// The list hands over the events it shows (already filtered: a row that doesn't match the filters isn't there).

import type { DanceEvent } from "../types";
import { isMultiDay, isSeries } from "./dates";
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

/** What separates a title's shared part from each event's own: "Semana Ryan: Dancehall", "Taller - Salsa". */
const SEPARATOR = /\s*(?::|\s[-–—]\s)\s*/;

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
