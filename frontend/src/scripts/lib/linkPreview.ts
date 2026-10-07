// What a shared event link shows in WhatsApp, Instagram, iMessage or Telegram: the title and description of
// its page's preview, the text drawn on its image (pages/og/[id].jpg.ts) and the image's version.
//
// Apps keep a preview for days, so nothing here is relative to today ("Hoy", "Mañana"): always the real date.
// Pure functions, tested in tests/linkPreview.test.ts.

import type { DanceEvent } from "../types";
import { isMultiDay, isSeries, lastDay, parseIsoDate, sameMonth, todayIso } from "./dates";
import {
  capitalize,
  dateRangeLabel,
  FREE,
  formatLongDate,
  formatTime,
  priceSummary,
  shortMonthName,
  shortWeekdayAndDay,
  stickerDate,
  typeLabel,
} from "./format";

/** The image's size: 1.91:1, what WhatsApp, Instagram, iMessage, Telegram and Facebook show whole. */
export const PREVIEW_WIDTH = 1200;
export const PREVIEW_HEIGHT = 630;
/** WhatsApp skips preview images over about 300 KB; the build fails above this (scripts/og-check.mjs). */
export const PREVIEW_MAX_BYTES = 280 * 1024;

const SITE_NAME = "Pa' Bailar";

/**
 * Bump when the image's design changes: every event's image gets a new version, so apps fetch the new
 * design instead of the one they cached.
 */
const PREVIEW_DESIGN_VERSION = 1;

const styleList = new Intl.ListFormat("es", { type: "conjunction" });

/** " 2027" when the event isn't in the current year (Bogotá), else "". */
function otherYear(iso: string, today: string): string {
  return iso.slice(0, 4) === today.slice(0, 4) ? "" : ` ${iso.slice(0, 4)}`;
}

/**
 * The event's date, short: "dom 4 oct, 9:00 a. m.", "13–15 nov" over several days, "31 oct – 2 nov" across
 * months; the year when it isn't this one ("18–22 feb 2027"). Events over several days leave the time out,
 * as their cards do. A workshop series from its first session, "4 sesiones desde dom 8 nov, 2:00 p. m.": a preview
 * stays in chats for weeks, and "desde" stays true as sessions pass.
 */
export function shortWhen(event: DanceEvent, today = todayIso()): string {
  const day = (iso: string) => parseIsoDate(iso).getDate();
  const oneDay = (iso: string, time: string | null) => {
    const date = `${shortWeekdayAndDay(iso)} ${shortMonthName(iso)}${otherYear(iso, today)}`;
    return time ? `${date}, ${formatTime(time)}` : date;
  };
  if (isSeries(event)) return `${event.sessions.length} sesiones desde ${oneDay(event.date, event.start_time)}`;
  if (isMultiDay(event)) {
    const end = lastDay(event);
    const days = sameMonth(end, event.date)
      ? `${day(event.date)}–${day(end)} ${shortMonthName(end)}`
      : `${day(event.date)} ${shortMonthName(event.date)} – ${day(end)} ${shortMonthName(end)}`;
    return days + otherYear(end, today);
  }
  return oneDay(event.date, event.start_time);
}

/** The preview's title: "Intensivo Ritmos Cubanos — dom 4 oct, 9:00 a. m.", "Level Up — 13–15 nov". */
export function previewTitle(event: DanceEvent, today = todayIso()): string {
  return `${event.title} — ${shortWhen(event, today)}`;
}

/** What the event is: "Taller de salsa cubana", "Social de salsa, bachata y kizomba", or just "Concierto". */
export function whatLabel(event: DanceEvent): string {
  // "otro" (docs/DATA.md) names no style: "Taller de salsa y otro" would say nothing more.
  const styles = styleList.format(event.styles.filter((style) => style !== "otro").slice(0, 3));
  if (event.event_type === "other") return styles ? capitalize(styles) : "";
  return styles ? `${typeLabel(event.event_type)} de ${styles}` : typeLabel(event.event_type);
}

/** Where, for a preview: venue, address and area ("Distrito Social · Cra 29 #68-18 · Chapinero"). */
function previewPlace(event: DanceEvent): string {
  return [...new Set([event.venue, event.address, event.area].map((part) => part?.trim()).filter(Boolean))].join(" · ");
}

/** The preview's description: "Taller de salsa cubana · Cra 16 #52-46 · Desde $ 35.000 · Pa' Bailar". */
export function previewDescription(event: DanceEvent): string {
  return [whatLabel(event), previewPlace(event), priceSummary(event), SITE_NAME].filter(Boolean).join(" · ");
}

/** The text on the image (pages/og/[id].jpg.ts). */
export interface PreviewCard {
  /** "Domingo 4 de octubre", "Viernes 13 al domingo 15 de noviembre", "4 sesiones desde el domingo 8 de noviembre", with
   * the year when it isn't this one. */
  days: string;
  /** "9:00 a. m."; "" without one, or over several days (as on the cards). */
  time: string;
  title: string;
  /** Venue, address and area; "" when the post doesn't say. */
  place: string;
  /** "Desde $ 35.000", "Gratis" or "" without prices. */
  price: string;
  free: boolean;
  /** The round date sticker, as on the cards (stickerDate): "04 / OCT", "13–15 / NOV" within a month; a series' first
   * session (the cards' shows the next one, but a preview stays in chats for weeks). */
  sticker: ReturnType<typeof stickerDate>;
}

export function previewCard(event: DanceEvent, today = todayIso()): PreviewCard {
  const year = (iso: string) => (otherYear(iso, today) ? ` de ${iso.slice(0, 4)}` : "");
  const days = isSeries(event)
    ? `${event.sessions.length} sesiones desde el ${formatLongDate(event.date).replace(",", "").toLowerCase()}${year(event.date)}`
    : dateRangeLabel(event.date, lastDay(event)) + year(lastDay(event));
  const time = isMultiDay(event) ? "" : formatTime(event.start_time);
  const price = priceSummary(event);
  return {
    days,
    time,
    title: event.title.trim(),
    place: previewPlace(event),
    price,
    free: price === FREE,
    sticker: stickerDate(event, event.date),
  };
}

/** The image's description for screen readers (og:image:alt). */
export function previewImageAlt(event: DanceEvent, today = todayIso()): string {
  const card = previewCard(event, today);
  return [`Flyer de ${card.title}`, card.days, card.time, card.place, card.price].filter(Boolean).join(" · ").replaceAll(" ", " ");
}

/** FNV-1a (32 bits) in base 36: short and stable; it only needs to change when its input does. */
function shortHash(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/**
 * The image's version (`?v=` on its URL): changes only when what the image shows changes (title, dates, time,
 * place, price, the flyer or its size, the design). Apps cache a preview by its URL and GitHub Pages can't
 * tell them it changed, so a corrected event gets a new URL; anything else (caption, styles, contact) keeps it.
 */
export function previewVersion(event: DanceEvent, today = todayIso()): string {
  const media = event.media[0];
  return shortHash(
    JSON.stringify([PREVIEW_DESIGN_VERSION, previewCard(event, today), media.flyer, media.width ?? null, media.height ?? null]),
  );
}
