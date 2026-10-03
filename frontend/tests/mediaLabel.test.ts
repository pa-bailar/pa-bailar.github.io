import { describe, expect, it } from "vitest";
import { isVideoCover, mediaLabel } from "../src/scripts/lib/mediaLabel";
import type { EventMedia } from "../src/scripts/types";

const media = (fields: Partial<EventMedia>): EventMedia => ({
  post_id: "1",
  permalink: "https://www.instagram.com/p/x/",
  media_type: "IMAGE",
  published: "2026-10-01T12:00:00+0000",
  flyer: "flyers/1-0.webp",
  caption: null,
  ...fields,
});

describe("what the label over a post's image says", () => {
  it("a video with a clip already plays: with sound is what's left", () => {
    expect(mediaLabel(media({ media_type: "VIDEO", preview: "previews/1-0.mp4" }))).toEqual({
      icon: "play",
      text: "Ver con sonido",
    });
    // a carousel whose image is a video slide
    expect(mediaLabel(media({ media_type: "CAROUSEL_ALBUM", slides: 4, preview: "previews/1-0.mp4" }))?.text).toBe(
      "Ver con sonido",
    );
  });

  it("a video without a clip, a carousel, a photo", () => {
    expect(mediaLabel(media({ media_type: "VIDEO" }))).toEqual({ icon: "play", text: "Ver video" });
    expect(mediaLabel(media({ media_type: "CAROUSEL_ALBUM", slides: 4 }))).toEqual({
      icon: "carousel",
      text: "Ver las 4",
    });
    expect(mediaLabel(media({ media_type: "CAROUSEL_ALBUM" }))).toBeNull(); // data from before slide counts
    expect(mediaLabel(media({}))).toBeNull();
  });

  it("cards mark events whose image is a video", () => {
    expect(isVideoCover(media({ media_type: "VIDEO" }))).toBe(true);
    expect(isVideoCover(media({ media_type: "CAROUSEL_ALBUM", preview: "previews/1-0.mp4" }))).toBe(true);
    expect(isVideoCover(media({ media_type: "CAROUSEL_ALBUM", slides: 3 }))).toBe(false);
  });
});
