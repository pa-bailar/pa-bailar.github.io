// An event's link-preview image (pages/og/[id].jpg.ts): 1200×630, the shape WhatsApp, Instagram, iMessage,
// Telegram and Facebook show whole. The whole flyer on the left over a blurred copy of itself, the round date
// sticker on the seam, and on the right the 70s stripes, the date and time, the title, the place, the price
// and the site. Always the day theme's colors (docs/DESIGN.md, "Link previews").
//
// Build time only (Node). The text is laid out by satori, which turns it into SVG paths with the site's own
// fonts (src/assets/fonts/og/: the build machine has none); sharp blurs the flyer, draws the SVG and writes
// the JPEG. The text comes from scripts/lib/linkPreview.ts (tested there).

import { readFile } from "node:fs/promises";
import path from "node:path";
import satori, { type Font } from "satori";
import sharp, { type OverlayOptions } from "sharp";
import { DATA_DIR } from "./data";
import { PREVIEW_HEIGHT, PREVIEW_MAX_BYTES, PREVIEW_WIDTH, previewCard, type PreviewCard } from "./scripts/lib/linkPreview";
import type { DanceEvent } from "./scripts/types";
import { BRAND, ICON_MARIGOLD } from "./scripts/lib/brandColors";

const W = PREVIEW_WIDTH;
const H = PREVIEW_HEIGHT;
const SPLIT = 540; // the flyer's half: a 4:5 flyer fills its height
const FLYER_MARGIN = 32;
const STICKER = 136; // the cards' 60 px sticker, at the image's scale
const STICKER_CENTER_Y = 470; // on the seam, over the flyer's lower corner, like the cards'
const TEXT_LEFT = SPLIT + STICKER / 2 + 36; // clear of the sticker
const TEXT_RIGHT = 52;

// The day theme (styles/tokens.css): previews are seen in chat apps of either theme, and the paper reads in both.
const COLOR = {
  paper: BRAND.cream150, // --bg
  ink: BRAND.wine900, // --text
  muted: BRAND.cocoa500, // --text-muted
  italic: BRAND.wine500, // --text-italic
  accent: BRAND.tomato600, // --accent, --logo, --sticker-bg
  stickerText: BRAND.cream50, // --sticker-text
  free: BRAND.palm600, // --free
  onFree: BRAND.white, // --on-free
  stripes: [BRAND.tomato600, BRAND.orange600, BRAND.marigold600], // --stripe-1..3
  record: BRAND.wine950, // the record of the home page's preview and the app icon
  label: ICON_MARIGOLD,
};

const FONT_DIR = path.join(import.meta.env.ASSETS_DIR, "fonts", "og");
let fontsLoading: Promise<Font[]> | null = null;

/** The site's three fonts, read once per build. */
function fonts(): Promise<Font[]> {
  const font = async (file: string, name: string, weight: Font["weight"], style: Font["style"] = "normal") => ({
    name,
    data: await readFile(path.join(FONT_DIR, file)),
    weight,
    style,
  });
  fontsLoading ??= Promise.all([
    font("Shrikhand-Regular.ttf", "Shrikhand", 400),
    font("InstrumentSans-Regular.ttf", "Instrument Sans", 400),
    font("InstrumentSans-SemiBold.ttf", "Instrument Sans", 600),
    font("BodoniModa-MediumItalic.ttf", "Bodoni Moda", 500, "italic"),
  ]);
  return fontsLoading;
}

// satori takes React-like elements; these plain objects are all it needs (no React).
type Style = Record<string, string | number>;
interface Node {
  type: string;
  props: { style?: Style; children?: Child | Child[] };
}
type Child = Node | string | null;

const h = (type: string, style: Style, ...children: Child[]): Node => {
  // satori counts an array as several children (even of one), which only display: flex may have.
  const kept = children.filter((child) => child !== null);
  return { type, props: { style, children: kept.length > 1 ? kept : kept[0] } };
};

/** Emoji and pictographs have no glyph in the fonts: they're left out of the image (not of the text). */
const drawable = (text: string) =>
  text
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

/** Longer titles get smaller type, so most fit in two or three lines. */
function titleSize(title: string): number {
  if (title.length <= 22) return 68;
  if (title.length <= 36) return 58;
  if (title.length <= 52) return 48;
  return 42;
}

/** Three bands, like <Stripes /> at the image's scale. */
const stripes = () =>
  h(
    "div",
    { display: "flex", flexDirection: "column", gap: 7, width: "100%" },
    ...COLOR.stripes.map((color) => h("div", { height: 12, width: "100%", backgroundColor: color })),
  );

/** The round date sticker of the cards, larger. */
function sticker(card: PreviewCard): Node {
  return h(
    "div",
    {
      position: "absolute",
      left: SPLIT - STICKER / 2,
      top: STICKER_CENTER_Y - STICKER / 2,
      width: STICKER,
      height: STICKER,
      borderRadius: STICKER / 2,
      border: `4px solid ${COLOR.ink}`,
      backgroundColor: COLOR.accent,
      color: COLOR.stickerText,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    },
    h("div", { fontFamily: "Shrikhand", fontSize: card.sticker.range ? 32 : 50, lineHeight: 1.1 }, card.sticker.day),
    h(
      "div",
      { fontFamily: "Instrument Sans", fontWeight: 600, fontSize: 22, letterSpacing: 2, lineHeight: 1.1, marginTop: 2 },
      card.sticker.month,
    ),
  );
}

/** Without a flyer: the record of the app icon on wine, instead of an empty half. */
function record(): Node {
  return h(
    "div",
    {
      width: SPLIT,
      height: H,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLOR.ink,
    },
    h(
      "div",
      {
        width: 400,
        height: 400,
        borderRadius: 200,
        backgroundColor: COLOR.record,
        border: "3px solid rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      },
      h(
        "div",
        { width: 150, height: 150, borderRadius: 75, backgroundColor: COLOR.label, display: "flex", alignItems: "center", justifyContent: "center" },
        h("div", { width: 34, height: 34, borderRadius: 17, backgroundColor: COLOR.ink }),
      ),
    ),
  );
}

/** The price: green "Gratis" like the cards' tag, otherwise the amount in bold. */
function price(card: PreviewCard): Node | null {
  if (!card.price) return null;
  if (card.free) {
    return h(
      "div",
      { display: "flex" },
      h(
        "div",
        {
          fontFamily: "Instrument Sans",
          fontWeight: 600,
          fontSize: 28,
          color: COLOR.onFree,
          backgroundColor: COLOR.free,
          borderRadius: 4,
          padding: "4px 16px",
        },
        card.price,
      ),
    );
  }
  return h("div", { fontFamily: "Instrument Sans", fontWeight: 600, fontSize: 30, color: COLOR.ink }, card.price);
}

/** Everything but the flyer, as SVG: the flyer's half is left transparent (or holds the record). */
function overlay(card: PreviewCard, hasFlyer: boolean): Node {
  const title = drawable(card.title);
  const size = titleSize(title);
  const text = h(
    "div",
    {
      position: "absolute",
      left: TEXT_LEFT,
      top: 0,
      width: W - TEXT_LEFT - TEXT_RIGHT,
      height: H,
      paddingTop: 52,
      paddingBottom: 40,
      display: "flex",
      flexDirection: "column",
    },
    stripes(),
    // The days, then the time: on the same line when it fits, else whole on the next ("9:00 a. m." never splits).
    h(
      "div",
      {
        display: "flex",
        flexWrap: "wrap",
        columnGap: 10,
        marginTop: 30,
        fontFamily: "Instrument Sans",
        fontWeight: 600,
        fontSize: 30,
        lineHeight: 1.25,
        color: COLOR.accent,
      },
      h("div", {}, card.time ? `${card.days} ·` : card.days),
      card.time ? h("div", { whiteSpace: "nowrap" }, card.time) : null,
    ),
    h(
      "div",
      {
        display: "block",
        lineClamp: 3,
        marginTop: 14,
        fontFamily: "Shrikhand",
        fontSize: size,
        lineHeight: 1.12,
        color: COLOR.ink,
      },
      title,
    ),
    card.place
      ? h(
          "div",
          { display: "block", lineClamp: 2, marginTop: 18, fontFamily: "Instrument Sans", fontSize: 26, lineHeight: 1.25, color: COLOR.muted },
          drawable(card.place),
        )
      : null,
    card.price ? h("div", { display: "flex", marginTop: 18 }, price(card)) : null,
    h(
      "div",
      { display: "flex", alignItems: "baseline", marginTop: "auto", gap: 14 },
      h("div", { fontFamily: "Shrikhand", fontSize: 34, color: COLOR.accent }, "Pa' Bailar"),
      h("div", { fontFamily: "Bodoni Moda", fontStyle: "italic", fontWeight: 500, fontSize: 26, color: COLOR.italic }, "pa-bailar.github.io"),
    ),
  );
  return h(
    "div",
    { width: W, height: H, display: "flex", position: "relative" },
    hasFlyer ? h("div", { width: SPLIT, height: H }) : record(),
    h("div", { width: W - SPLIT, height: H, backgroundColor: COLOR.paper }),
    text,
    sticker(card),
  );
}

/** The flyer's half: the whole flyer over a blurred, darker copy of itself, with a soft shadow. */
async function flyerLayers(flyer: string): Promise<OverlayOptions[]> {
  const source = await readFile(path.join(DATA_DIR, flyer));
  const backdrop = await sharp(source)
    .resize(SPLIT, H, { fit: "cover" })
    .blur(28)
    .modulate({ brightness: 0.8 })
    .png()
    .toBuffer();
  const { data, info } = await sharp(source)
    .resize(SPLIT - 2 * FLYER_MARGIN, H - 2 * FLYER_MARGIN, { fit: "inside" })
    .png()
    .toBuffer({ resolveWithObject: true });
  const left = Math.round((SPLIT - info.width) / 2);
  const top = Math.round((H - info.height) / 2);
  // A soft shadow under the flyer, drawn over the whole half so it never pokes out of the image.
  const shadow = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SPLIT}" height="${H}">` +
      `<filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>` +
      `<rect x="${left}" y="${top + 8}" width="${info.width}" height="${info.height}" fill="#000" fill-opacity="0.45" filter="url(#s)"/></svg>`,
  );
  return [
    { input: backdrop, left: 0, top: 0 },
    { input: shadow, left: 0, top: 0 },
    { input: data, left, top },
  ];
}

/** The event's preview as a JPEG, under PREVIEW_MAX_BYTES when at all possible. */
export async function eventPreviewImage(event: DanceEvent): Promise<Buffer> {
  const flyer = event.media[0].flyer;
  const card = previewCard(event);
  const svg = await satori(overlay(card, Boolean(flyer)), { width: W, height: H, fonts: await fonts() });
  const layers: OverlayOptions[] = [
    ...(flyer ? await flyerLayers(flyer) : []),
    { input: await sharp(Buffer.from(svg)).png().toBuffer(), left: 0, top: 0 },
  ];
  const image = await sharp({ create: { width: W, height: H, channels: 3, background: COLOR.paper } })
    .composite(layers)
    .png()
    .toBuffer();
  // Full color resolution keeps the red and green text crisp; a busy flyer that would weigh too much drops it.
  let jpeg = Buffer.alloc(0);
  for (const [quality, chromaSubsampling] of [[84, "4:4:4"], [80, "4:2:0"], [70, "4:2:0"]] as const) {
    jpeg = await sharp(image).jpeg({ quality, chromaSubsampling, mozjpeg: true }).toBuffer();
    if (jpeg.length <= PREVIEW_MAX_BYTES) break;
  }
  return jpeg;
}
