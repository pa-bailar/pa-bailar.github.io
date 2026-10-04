import { describe, expect, it } from "vitest";
import { calendarDescription, feedbackUrl, thumbName, thumbUrl } from "../src/scripts/lib/links";
import { event } from "./factories";

describe("feedbackUrl", () => {
  it("fills in the event, so the report says which one", () => {
    const url = new URL(feedbackUrl(event({ id: "social-3-oct", title: "Social & Salsa", date: "2026-10-03" })));
    expect(url.origin + url.pathname).toMatch(/^https:\/\/docs\.google\.com\/forms\/.+\/viewform$/);
    expect(url.searchParams.get("entry.1000168347")).toBe("Social & Salsa (2026-10-03) · social-3-oct");
  });

  it("gives an event over several days its days", () => {
    const url = new URL(feedbackUrl(event({ id: "festival", title: "Festival", date: "2026-11-13", end_date: "2026-11-15" })));
    expect(url.searchParams.get("entry.1000168347")).toBe("Festival (2026-11-13 al 2026-11-15) · festival");
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

describe("the calendar feed's description", () => {
  it("one day: its time, or that it's to be confirmed", () => {
    expect(calendarDescription(event({ start_time: "21:00" }))[0]).toBe("9:00 p. m.");
    expect(calendarDescription(event())[0]).toBe("Hora por confirmar");
  });

  it("several days: their range, with the time when there's one", () => {
    const festival = event({ date: "2026-11-13", end_date: "2026-11-15" });
    expect(calendarDescription(festival)[0]).toBe("Viernes 13 al domingo 15 de noviembre");
    expect(calendarDescription({ ...festival, start_time: "20:00" })[0]).toBe("Viernes 13 al domingo 15 de noviembre · 8:00 p. m.");
  });

  it("then the price, the account and the event's page", () => {
    const lines = calendarDescription(event({ prices: [{ label: "General", amount_cop: 0, condition: null }] }));
    expect(lines.slice(1)).toEqual(["Gratis", "@academia", "https://pa-bailar.github.io/evento/social-24-oct/"]);
  });
});
