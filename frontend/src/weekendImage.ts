// The "Este finde en Bogotá" image (/finde.jpg), shared on WhatsApp from the site (views/upcomingView.ts)
// and the link preview of /finde/. A 1080×1350 portrait (what WhatsApp and Instagram show whole) in the
// light theme's colors and fonts: the weekend's events with their flyers, or the next ones when the
// weekend has none.
// Build time only (Node): laid out with Satori (flexbox → SVG, text drawn with the site's fonts, so no
// font is needed to rasterize it), then made a JPEG with sharp.

import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import satori from "satori";
import sharp from "sharp";
import { DATA_DIR } from "./data";
import type { DanceEvent } from "./scripts/types";
import { formatTime } from "./scripts/lib/format";
import { mainMedia } from "./scripts/lib/links";
import { weekendEvents, weekendOf } from "./scripts/lib/weekend";
import { parseIsoDate } from "./scripts/lib/dates";

const WIDTH = 1080;
const HEIGHT = 1350;
const MAX_EVENTS = 5; // rows that fit with the header and footer
const THUMB = 150; // px, square

// The light theme's palette (styles/tokens.css): an image can't read CSS variables.
const COLORS = {
  paper: "#ECDDC6", // --cream-150, the page
  card: "#F7EDDC", // --cream-75
  ink: "#2A0F14", // --wine-900, text
  muted: "#6E4A44", // --cocoa-500, muted text
  logo: "#C8321C", // --tomato-600
  stripes: ["#C8321C", "#E8791C", "#E9B021"], // --stripe-1..3
};

const require = createRequire(import.meta.url);
const fontFile = (name: string) => readFile(require.resolve(`@fontsource/${name}`));

type Node = { type: string; props: Record<string, unknown> };
const el = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({
  type,
  props: { style, children },
});

const LOCALE = "es-CO";
const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat(LOCALE, { weekday: "short", day: "numeric" })
    .format(parseIsoDate(iso))
    .replace(".", "")
    .toUpperCase();
const part = (iso: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(LOCALE, options).format(parseIsoDate(iso));

/** "viernes 2 de octubre" (Intl adds a comma after the weekday; this doesn't). */
function dayName(iso: string, withMonth: boolean): string {
  const day = `${part(iso, { weekday: "long" })} ${part(iso, { day: "numeric" })}`;
  return withMonth ? `${day} de ${part(iso, { month: "long" })}` : day;
}

/** "Viernes 2 al domingo 4 de octubre", "Viernes 30 de octubre al domingo 1 de noviembre" or one day. */
function rangeLabel(start: string, end: string): string {
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  const text = start === end ? dayName(end, true) : `${dayName(start, !sameMonth)} al ${dayName(end, true)}`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

async function thumbnail(event: DanceEvent): Promise<string | null> {
  const flyer = mainMedia(event).flyer;
  if (!flyer) return null;
  try {
    const jpeg = await sharp(path.join(DATA_DIR, flyer)).resize(THUMB * 2, THUMB * 2, { fit: "cover" }).jpeg({ quality: 80 }).toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return null;
  }
}

function stripes(): Node {
  return el(
    "div",
    { display: "flex", flexDirection: "column", gap: 6 },
    COLORS.stripes.map((color) => el("div", { height: 12, backgroundColor: color })),
  );
}

async function eventRow(event: DanceEvent): Promise<Node> {
  const thumb = await thumbnail(event);
  const time = formatTime(event.start_time);
  const place = event.venue ?? event.area ?? "";
  return el("div", { display: "flex", gap: 28, alignItems: "center", height: THUMB }, [
    thumb
      ? { type: "img", props: { src: thumb, width: THUMB, height: THUMB, style: { borderRadius: 6, border: `3px solid ${COLORS.ink}` } } }
      : el("div", { width: THUMB, height: THUMB, borderRadius: 6, backgroundColor: COLORS.card }),
    el("div", { display: "flex", flexDirection: "column", flex: 1, gap: 6, minWidth: 0 }, [
      el("div", { fontSize: 28, fontWeight: 600, color: COLORS.logo }, [dayLabel(event.date), time ? ` · ${time}` : ""].join("")),
      el("div", { fontSize: 38, fontWeight: 600, color: COLORS.ink, lineHeight: 1.1, maxHeight: 84, overflow: "hidden" }, event.title),
      el("div", { fontSize: 26, color: COLORS.muted, overflow: "hidden", whiteSpace: "nowrap" }, [`@${event.account}`, place].filter(Boolean).join(" · ")),
    ]),
  ]);
}

/** The JPEG for `events` (sorted upcoming events) as of `today`. */
export async function weekendImage(events: DanceEvent[], today: string): Promise<Buffer> {
  const weekend = weekendOf(today);
  const thisWeekend = weekendEvents(events, today);
  const shown = (thisWeekend.length ? thisWeekend : events.filter((event) => event.date >= today)).slice(0, MAX_EVENTS);
  const total = thisWeekend.length || events.filter((event) => event.date >= today).length;
  const title = thisWeekend.length ? "Este finde en Bogotá" : "Lo que viene en Bogotá";
  const subtitle = thisWeekend.length ? rangeLabel(weekend.start, weekend.end) : "Sociales y talleres de baile";
  const more = total - shown.length;

  const [shrikhand, sans, sansBold, bodoni] = await Promise.all([
    fontFile("shrikhand/files/shrikhand-latin-400-normal.woff"),
    fontFile("instrument-sans/files/instrument-sans-latin-400-normal.woff"),
    fontFile("instrument-sans/files/instrument-sans-latin-600-normal.woff"),
    fontFile("bodoni-moda/files/bodoni-moda-latin-500-italic.woff"),
  ]);

  const tree = el(
    "div",
    {
      display: "flex",
      flexDirection: "column",
      width: WIDTH,
      height: HEIGHT,
      padding: 64,
      backgroundColor: COLORS.paper,
      fontFamily: "Instrument Sans",
      color: COLORS.ink,
    },
    [
      stripes(),
      el("div", { display: "flex", marginTop: 28, fontFamily: "Shrikhand", fontSize: 76, color: COLORS.logo }, "Pa' Bailar"),
      el("div", { display: "flex", marginTop: 4, fontFamily: "Bodoni Moda", fontStyle: "italic", fontSize: 60 }, title),
      el("div", { display: "flex", marginTop: 6, fontSize: 32, color: COLORS.muted }, subtitle),
      el("div", { display: "flex", flexDirection: "column", gap: 26, marginTop: 44, flex: 1 }, await Promise.all(shown.map(eventRow))),
      more > 0
        ? el("div", { display: "flex", fontSize: 30, fontWeight: 600, marginBottom: 18 }, `+ ${more} ${more === 1 ? "evento más" : "eventos más"}`)
        : el("div", { display: "flex" }),
      el("div", { display: "flex", fontSize: 32, fontWeight: 600, marginBottom: 20 }, "Todos los eventos en pa-bailar.github.io"),
      stripes(),
    ],
  );

  const svg = await satori(tree as Parameters<typeof satori>[0], {
    width: WIDTH,
    height: HEIGHT,
    fonts: [
      { name: "Shrikhand", data: shrikhand, weight: 400, style: "normal" },
      { name: "Instrument Sans", data: sans, weight: 400, style: "normal" },
      { name: "Instrument Sans", data: sansBold, weight: 600, style: "normal" },
      { name: "Bodoni Moda", data: bodoni, weight: 500, style: "italic" },
    ],
  });
  return sharp(Buffer.from(svg)).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
}
