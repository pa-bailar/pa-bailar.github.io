import { describe, expect, it } from "vitest";
import { checkData } from "../scripts/check-data.mjs";
import type { DanceEvent, EventMedia } from "../src/scripts/types";
import { event, storyEvent, storyMedia } from "./factories";

const meta = { schema_version: 1, generated_at: "2026-10-04T09:00:00-05:00", accounts: ["academia"] };
const problems = (events: DanceEvent[]) => checkData(events, meta, () => true);
const withMedia = (...media: EventMedia[]) => [event({ media: media as DanceEvent["media"] })];

describe("the data contract check", () => {
  it("passes a complete event", () => {
    expect(problems([event()])).toEqual([]);
  });

  it("finds a missing flyer file", () => {
    expect(checkData([event()], meta, () => false)).toEqual([expect.stringContaining("flyer file missing")]);
  });
});

describe("the data contract check, on stories (media_type STORY)", () => {
  it("passes a story linked to its account's profile, with no caption", () => {
    expect(problems([storyEvent()])).toEqual([]);
    expect(problems(withMedia(storyMedia({ permalink: "https://www.instagram.com/la.topa_bogota/" })))).toEqual([]);
  });

  it("passes an event with a post and a story, the story last", () => {
    expect(problems(withMedia(event().media[0], storyMedia()))).toEqual([]);
  });

  it("rejects a story linked to a post, to the story itself or outside Instagram", () => {
    for (const permalink of [
      "https://www.instagram.com/p/DAbc123/",
      "https://www.instagram.com/reel/DAbc123/",
      "https://www.instagram.com/stories/academia/3456789012345678901/",
      "https://www.instagram.com/p/",
      "https://www.instagram.com/stories/",
      "https://example.com/academia/",
      "http://www.instagram.com/academia/",
      "https://www.instagram.com/academia",
      "javascript:alert(1)//www.instagram.com/academia/",
    ]) {
      expect(problems(withMedia(storyMedia({ permalink }))), permalink).toEqual([
        expect.stringContaining("a story links to its account's profile"),
      ]);
    }
  });

  it("rejects a post linked to a profile: only a story does that", () => {
    const [post] = event().media;
    expect(problems(withMedia({ ...post, permalink: "https://www.instagram.com/academia/" }))).toEqual([
      expect.stringContaining("bad permalink"),
    ]);
  });

  it("wants a story's id as story-<hash>", () => {
    expect(problems(withMedia(storyMedia({ post_id: "18012345678901234" })))).toEqual([
      expect.stringContaining("a story's is story-<hash>"),
    ]);
  });

  it("checks the rest as for a photo", () => {
    expect(problems(withMedia(storyMedia({ flyer: "../secret.webp" })))).toEqual([expect.stringContaining("bad flyer path")]);
    expect(problems(withMedia(storyMedia({ published: "ayer" })))).toEqual([expect.stringContaining("bad published time")]);
    expect(problems(withMedia(storyMedia({ media_type: "HISTORIA" as EventMedia["media_type"] })))).toEqual([
      expect.stringContaining("bad media_type"),
      expect.stringContaining("bad permalink"),
    ]);
  });
});
