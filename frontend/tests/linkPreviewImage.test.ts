import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { events } from "../src/data";
import { eventPreviewImage } from "../src/linkPreviewImage";
import { PREVIEW_HEIGHT, PREVIEW_MAX_BYTES, PREVIEW_WIDTH } from "../src/scripts/lib/linkPreview";
import { event } from "./factories";

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
});
