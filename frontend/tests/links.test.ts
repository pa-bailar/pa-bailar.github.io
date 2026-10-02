import { describe, expect, it } from "vitest";
import { thumbName, thumbUrl } from "../src/scripts/lib/links";
import { event } from "./factories";

describe("thumbnails", () => {
  it("are named after their flyer", () => {
    expect(thumbName("flyers/18018174977930391-0.webp")).toBe("18018174977930391-0");
  });

  it("are served from /thumbs/, and only for posts with a flyer", () => {
    const media = event().media[0];
    expect(thumbUrl({ ...media, flyer: "flyers/123-0.webp" })).toMatch(/\/thumbs\/123-0\.webp$/);
    expect(thumbUrl({ ...media, flyer: null })).toBeNull();
  });
});
