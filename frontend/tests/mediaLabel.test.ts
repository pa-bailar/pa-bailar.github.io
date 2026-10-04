import { describe, expect, it } from "vitest";
import { mediaLabel as typeLabel } from "../src/scripts/lib/format";
import { isStory, isVideoCover, mediaLabel, storyAccount, storySource } from "../src/scripts/lib/mediaLabel";
import type { EventMedia } from "../src/scripts/types";
import { storyMedia } from "./factories";

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

  it("a story says where it came from, and is never a video", () => {
    const story = storyMedia();
    expect(mediaLabel(story)).toEqual({ icon: "story", text: "Historia" });
    expect(isStory(story)).toBe(true);
    expect(isStory(media({}))).toBe(false);
    expect(isVideoCover(story)).toBe(false);
    expect(typeLabel("STORY")).toBe("Historia"); // the posts sheet's "Historia 1 de 1"
  });

  it("a story's account comes from its link, the profile", () => {
    expect(storyAccount(storyMedia({ permalink: "https://www.instagram.com/la.topa_bogota/" }))).toBe("la.topa_bogota");
    expect(storyAccount(media({}))).toBeNull();
    expect(storySource({ account: "otra" }, storyMedia())).toBe("De una historia de @academia · las historias duran 24 horas");
    // a link without an account (never in checked data): the event's
    expect(storySource({ account: "otra" }, storyMedia({ permalink: "https://example.com/" }))).toBe(
      "De una historia de @otra · las historias duran 24 horas",
    );
  });

  it("cards mark events whose image is a video", () => {
    expect(isVideoCover(media({ media_type: "VIDEO" }))).toBe(true);
    expect(isVideoCover(media({ media_type: "CAROUSEL_ALBUM", preview: "previews/1-0.mp4" }))).toBe(true);
    expect(isVideoCover(media({ media_type: "CAROUSEL_ALBUM", slides: 3 }))).toBe(false);
  });
});
