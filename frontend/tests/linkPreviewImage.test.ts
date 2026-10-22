import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { events } from "../src/data";
import { eventPreviewImage } from "../src/linkPreviewImage";
import { BRAND } from "../src/scripts/lib/brandColors";
import { PREVIEW_HEIGHT, PREVIEW_MAX_BYTES, PREVIEW_WIDTH } from "../src/scripts/lib/linkPreview";
import { event, seriesEvent, sessionsOn } from "./factories";

// The image itself (satori + sharp, with the fonts in the repository): one with a flyer from the data, and one
// without, which gets the record. The build checks every event's image (scripts/og-check.mjs).
describe("eventPreviewImage", () => {
  const withFlyer = events.find((item) => item.media[0].flyer);

  it.skipIf(!withFlyer)("draws a 1200×630 JPEG under the size limit from a flyer", async () => {
    const jpeg = await eventPreviewImage(withFlyer!);
    const { width, height, format } = await sharp(jpeg).metadata();
    expect({ width, height, format }).toEqual({ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT, format: "jpeg" });
    expect(jpeg.length).toBeLessThanOrEqual(PREVIEW_MAX_BYTES);
  });

  it("draws one without a flyer, and with characters the fonts don't have", async () => {
    const base = event();
    const noFlyer = event({
      title: "Social 💃 de prueba con un título bastante largo para ver cómo se corta al final 🕺",
      start_time: "20:00",
      venue: "Casa",
      prices: [{ label: "Entrada", amount_cop: 0, condition: null }],
      media: [{ ...base.media[0], flyer: null }],
    });
    const jpeg = await eventPreviewImage(noFlyer);
    const { width, height } = await sharp(jpeg).metadata();
    expect({ width, height }).toEqual({ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT });
  });

  // satori 0.60 sized boxes without their padding: the text column grew past the image and the brand line went
  // missing from every preview (site #220).
  it("keeps the brand line at the bottom of the fullest card", async () => {
    const base = event();
    const fullest = seriesEvent({
      title: "Guabalosas intensivo de salsa caleña versión 2.0 con invitados especiales de Cali",
      sessions: sessionsOn(["2026-11-07", "2026-11-14", "2026-11-21", "2026-11-28"], { start_time: "17:00" }),
      start_time: "17:00",
      venue: "Distrito Social, academia de baile y escuela de música",
      address: "Cra. 29 #68-18, segundo piso",
      area: "Teusaquillo",
      prices: [{ label: "Entrada", amount_cop: 40000, condition: null }],
      media: [{ ...base.media[0], flyer: null }],
    });
    const jpeg = await eventPreviewImage(fullest);
    // "Pa' Bailar" in the accent color, between the text column's left edge and the site's address, above the bottom.
    const { data } = await sharp(jpeg)
      .extract({ left: 640, top: 540, width: 200, height: 60 })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(BRAND.tomato600.slice(i, i + 2), 16));
    let accent = 0;
    for (let i = 0; i < data.length; i += 3) {
      if (Math.abs(data[i]! - r) + Math.abs(data[i + 1]! - g) + Math.abs(data[i + 2]! - b) < 60) accent++;
    }
    expect(accent).toBeGreaterThan(300);
  });
});
