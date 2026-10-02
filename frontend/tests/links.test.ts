import { describe, expect, it } from "vitest";
import { feedbackUrl, thumbName, thumbUrl } from "../src/scripts/lib/links";
import { event } from "./factories";

describe("feedbackUrl", () => {
  it("fills in the event, so the report says which one", () => {
    const url = new URL(feedbackUrl(event({ id: "social-3-oct", title: "Social & Salsa", date: "2026-10-03" })));
    expect(url.origin + url.pathname).toMatch(/^https:\/\/docs\.google\.com\/forms\/.+\/viewform$/);
    expect(url.searchParams.get("entry.1000168347")).toBe("Social & Salsa (2026-10-03) · social-3-oct");
  });

  it("is the empty form from the footer", () => {
    expect(feedbackUrl()).not.toContain("?");
  });
});

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
