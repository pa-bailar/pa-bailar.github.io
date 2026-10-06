import { describe, expect, it } from "vitest";
import { DOTS_SHOWN, dotStates, slideIndex } from "../src/scripts/views/carousel";
import { eventCardGridHtml } from "../src/scripts/views/eventCard";
import { event } from "./factories";

// An event announced by several posts: a carousel in its card, like Instagram's (the owner, 5 October 2026).

const post = event().media[0]!;
const posts = (count: number) => Array.from({ length: count }, (_, i) => ({ ...post, post_id: `p${i}`, flyer: `flyers/p${i}-0.webp` }));

describe("the dots", () => {
  it("one per slide while they fit, the one on screen active", () => {
    expect(dotStates(3, 1)).toEqual(["normal", "active", "normal"]);
    expect(dotStates(5, 0)).toEqual(["active", "normal", "normal", "normal", "normal"]);
  });

  it("a long carousel shows a window of five that slides along, its edges smaller while there are more", () => {
    expect(dotStates(20, 0).filter((state) => state !== "hidden")).toHaveLength(DOTS_SHOWN);
    expect(dotStates(20, 0).slice(0, 6)).toEqual(["active", "normal", "normal", "normal", "small", "hidden"]);
    expect(dotStates(20, 10).slice(7, 14)).toEqual(["hidden", "small", "normal", "active", "normal", "small", "hidden"]);
    expect(dotStates(20, 19).slice(14)).toEqual(["hidden", "small", "normal", "normal", "normal", "active"]);
  });
});

describe("the slide on screen", () => {
  it("is the one whose start is nearest the strip's position, within the slides", () => {
    expect(slideIndex(0, 375, 6)).toBe(0);
    expect(slideIndex(380, 375, 6)).toBe(1); // a snap a pixel or two off
    expect(slideIndex(5000, 375, 6)).toBe(5);
    expect(slideIndex(0, 0, 6)).toBe(0); // not laid out yet
  });
});

describe("a card with several posts", () => {
  it("shows them as a carousel: 1/N over the image, the dots in the action row, no ▦ button", () => {
    const html = eventCardGridHtml([event({ media: posts(6) })]);
    expect(html.match(/class="carousel__slide"/g)).toHaveLength(6);
    expect(html).toContain('data-carousel-count aria-hidden="true">1/6</span>');
    expect(html.match(/<span class="carousel__dots"[^>]*>(.*?)<\/span>/)?.[1].match(/<i/g)).toHaveLength(6);
    expect(html).not.toContain("media-count");
    expect(html).not.toContain("data-card-posts");
  });

  it("its strip opens the details (it sits above the card's stretched link, so taps land on it)", () => {
    expect(eventCardGridHtml([event({ media: posts(2) })])).toMatch(/<div class="event-card__frame carousel" data-carousel[^>]*data-event="social-24-oct"/);
  });

  it("names its slides for screen readers: 1 de 3, 2 de 3…", () => {
    const html = eventCardGridHtml([event({ media: posts(3) })]);
    expect(html).toContain('aria-roledescription="carrusel"');
    expect(html).toContain('aria-label="2 de 3"');
  });

  it("a post without a flyer isn't a slide; one flyer is a plain card", () => {
    const [first, second] = posts(2);
    const one = eventCardGridHtml([event({ media: [first!, { ...second!, flyer: null }] })]);
    expect(one).not.toContain("data-carousel");
    expect(eventCardGridHtml([event()])).not.toContain("data-carousel");
  });

  it('a video slide plays its clip and says "Video"', () => {
    const [first, second] = posts(2);
    const html = eventCardGridHtml([event({ media: [first!, { ...second!, media_type: "VIDEO", preview: "previews/p1-0.mp4" }] })]);
    const slides = html.split('class="carousel__slide"').slice(1);
    expect(slides[1]).toContain("<video") && expect(slides[1]).toContain('class="video-mark"');
    expect(slides[0]).not.toContain('class="video-mark"');
  });
});
