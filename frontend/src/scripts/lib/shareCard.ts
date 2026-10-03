// The image that goes with a shared list (a period, the visitor's plans): a 1080×1350 portrait, what
// WhatsApp and Instagram show whole, drawn in the browser at share time, so it always matches the day,
// the filters and the saved events. Light theme colors, the page's own fonts, the flyers' thumbnails.
//
//   ═══ stripes ═══
//   Pa' Bailar                      (Shrikhand, tomato)
//   Este finde en Bogotá            (Bodoni Moda italic)
//   Viernes 2 al domingo 4 de oct…  (muted)
//   [flyer] SÁB 3 · 6:00 p. m.      up to MAX_ROWS events
//           Salsa Freestyle…
//           @madyumdance · Escuela del Mambo
//   + 3 eventos más
//   Todos los eventos en pa-bailar.github.io
//   ═══ stripes ═══

import type { DanceEvent } from "../types";
import { formatTime } from "./format";
import { mainMedia, thumbUrl } from "./links";
import { shortDayLabel } from "./shareText";

const WIDTH = 1080;
const HEIGHT = 1350;
const PAD = 64;
const MAX_ROWS = 5;
const THUMB = 150;
const ROW_GAP = 26;

// The light theme's palette (styles/tokens.css): a canvas can't read CSS variables.
const PALETTE = {
  paper: "#ECDDC6", // --cream-150
  card: "#F7EDDC", // --cream-75
  ink: "#2A0F14", // --wine-900
  muted: "#6E4A44", // --cocoa-500
  logo: "#C8321C", // --tomato-600
  stripes: ["#C8321C", "#E8791C", "#E9B021"], // --stripe-1..3
};

const FONTS = {
  logo: "76px Shrikhand",
  title: "italic 500 60px 'Bodoni Moda'",
  subtitle: "400 32px 'Instrument Sans'",
  day: "600 28px 'Instrument Sans'",
  event: "600 38px 'Instrument Sans'",
  byline: "400 26px 'Instrument Sans'",
  footer: "600 32px 'Instrument Sans'",
};

export interface CardContent {
  title: string; // "Este finde en Bogotá"
  subtitle: string; // "Viernes 2 al domingo 4 de octubre"
  events: DanceEvent[];
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  const image = new Image();
  image.src = src;
  return image.decode().then(
    () => image,
    () => null,
  );
}

function stripes(context: CanvasRenderingContext2D, top: number) {
  PALETTE.stripes.forEach((color, index) => {
    context.fillStyle = color;
    context.fillRect(PAD, top + index * 18, WIDTH - PAD * 2, 12);
  });
}

/** `text` in at most `lines` lines of `width`, the last one cut with "…". */
function wrap(context: CanvasRenderingContext2D, text: string, width: number, lines: number): string[] {
  const result: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= width || !line) line = candidate;
    else {
      result.push(line);
      line = word;
    }
  }
  if (line) result.push(line);
  if (result.length <= lines) return result;
  const kept = result.slice(0, lines);
  let last = kept[lines - 1]!;
  while (last && context.measureText(`${last}…`).width > width) last = last.slice(0, -1);
  kept[lines - 1] = `${last.trimEnd()}…`;
  return kept;
}

function drawRow(context: CanvasRenderingContext2D, event: DanceEvent, thumb: HTMLImageElement | null, top: number) {
  const radius = 6;
  context.save();
  context.beginPath();
  context.roundRect(PAD, top, THUMB, THUMB, radius);
  context.clip();
  context.fillStyle = PALETTE.card;
  context.fillRect(PAD, top, THUMB, THUMB);
  if (thumb) context.drawImage(thumb, PAD, top, THUMB, THUMB);
  context.restore();
  context.strokeStyle = PALETTE.ink;
  context.lineWidth = 3;
  context.beginPath();
  context.roundRect(PAD, top, THUMB, THUMB, radius);
  context.stroke();

  const left = PAD + THUMB + 28;
  const width = WIDTH - left - PAD;
  const time = formatTime(event.start_time);
  context.textBaseline = "top";
  context.fillStyle = PALETTE.logo;
  context.font = FONTS.day;
  context.fillText([shortDayLabel(event), time].filter(Boolean).join(" · "), left, top + 8);
  context.fillStyle = PALETTE.ink;
  context.font = FONTS.event;
  const titleLines = wrap(context, event.title, width, 2);
  titleLines.forEach((line, index) => context.fillText(line, left, top + 46 + index * 42));
  context.fillStyle = PALETTE.muted;
  context.font = FONTS.byline;
  const byline = [`@${event.account}`, event.venue ?? event.area].filter(Boolean).join(" · ");
  context.fillText(wrap(context, byline, width, 1)[0] ?? "", left, top + 46 + titleLines.length * 42 + 8);
}

/** The card as a JPEG file, ready for the share menu. */
export async function drawShareCard({ title, subtitle, events }: CardContent): Promise<File> {
  // The page's fonts (Google Fonts) may not be loaded yet: drawing would fall back to plain ones.
  await Promise.all(Object.values(FONTS).map((font) => document.fonts.load(font).catch(() => [])));
  const shown = events.slice(0, MAX_ROWS);
  const thumbs = await Promise.all(
    shown.map((event) => {
      const url = thumbUrl(mainMedia(event));
      return url ? loadImage(url) : Promise.resolve(null);
    }),
  );

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("no canvas");

  context.fillStyle = PALETTE.paper;
  context.fillRect(0, 0, WIDTH, HEIGHT);
  stripes(context, PAD);
  context.textBaseline = "top";
  context.fillStyle = PALETTE.logo;
  context.font = FONTS.logo;
  context.fillText("Pa' Bailar", PAD, 150);
  context.fillStyle = PALETTE.ink;
  context.font = FONTS.title;
  context.fillText(wrap(context, title, WIDTH - PAD * 2, 1)[0] ?? title, PAD, 262);
  context.fillStyle = PALETTE.muted;
  context.font = FONTS.subtitle;
  context.fillText(subtitle, PAD, 340);

  shown.forEach((event, index) => drawRow(context, event, thumbs[index] ?? null, 430 + index * (THUMB + ROW_GAP)));

  const footerTop = HEIGHT - PAD - 48;
  const more = events.length - shown.length;
  context.fillStyle = PALETTE.ink;
  if (more > 0) {
    context.font = FONTS.footer;
    context.fillText(`+ ${more} ${more === 1 ? "evento más" : "eventos más"}`, PAD, footerTop - 110);
  }
  context.font = FONTS.footer;
  context.fillText("Todos los eventos en pa-bailar.github.io", PAD, footerTop - 56);
  stripes(context, footerTop);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("no image");
  return new File([blob], "pa-bailar.jpg", { type: "image/jpeg" });
}
