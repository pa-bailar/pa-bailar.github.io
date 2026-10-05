import { describe, expect, it } from "vitest";
import { detailsEventName } from "../src/scripts/lib/analytics";
import { eventDetailHtml, eventDrawerHtml, sheetPrice } from "../src/scripts/views/eventDetail";
import { event, storyEvent, storyMedia } from "./factories";

describe("the analytics event for opened details", () => {
  it("names where they were opened from", () => {
    expect(detailsEventName("tarjeta")).toBe("detalles-tarjeta");
    expect(detailsEventName("boton")).toBe("detalles-boton");
    expect(detailsEventName("enlace")).toBe("detalles-enlace");
  });

  it("anything else counts as the card (also the retired line under it, \"linea\")", () => {
    expect(detailsEventName(undefined)).toBe("detalles-tarjeta");
    expect(detailsEventName("linea")).toBe("detalles-tarjeta");
    expect(detailsEventName("<script>")).toBe("detalles-tarjeta");
  });
});

describe("the details drawer", () => {
  const html = (overrides = {}) => eventDrawerHtml(event(overrides), { titleId: "drawer-title" });

  it("starts with when, the title, the type and the account, ×, then the quick actions and the details", () => {
    const drawer = html({ title: "Social de salsa", start_time: "20:00", venue: "La Topa", account: "latopa" });
    const order = [
      "event-detail__when",
      'id="drawer-title"',
      "tag-type",
      "@latopa",
      "data-close-drawer",
      "quick-actions",
      "<span>Instagram</span>",
      "<span>Compartir</span>",
      "stripes",
      "detail-list",
      "Repórtalo",
    ];
    const positions = order.map((part) => drawer.indexOf(part));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(drawer).toContain("Social de salsa");
  });

  it("has no flyer and no thumbnail: the card is right there", () => {
    expect(html()).not.toContain("<img");
    expect(html()).not.toContain("<video");
    expect(eventDetailHtml(event(), 0)).toContain("<img"); // the event's own page keeps the flyer on top
  });

  it("quick actions: Instagram, Compartir, Guardar; Cómo llegar is in the place's row, only with a place", () => {
    expect(html({ venue: "La Topa" })).not.toContain("<span>Cómo llegar</span>");
    expect(html({ venue: "La Topa" })).toContain('data-track="como-llegar"');
    expect(html()).not.toContain('data-track="como-llegar"');
    expect(html()).toContain("<span>Instagram</span>");
    expect(html()).toContain("<span>Compartir</span>");
    expect(html()).toContain("<span>Guardar</span>");
  });

  it("lists when, where, the price and who organizes, in that order", () => {
    const drawer = html();
    const terms = ["<dt>Cuándo</dt>", "<dt>Lugar</dt>", "<dt>Precio</dt>", "<dt>Organiza</dt>"].map((term) => drawer.indexOf(term));
    expect(terms.every((position) => position >= 0)).toBe(true);
    expect([...terms].sort((a, b) => a - b)).toEqual(terms);
  });

  it("Instagram watches the post inside the site (named for what it shows); a link to it for a new tab", () => {
    const [post] = event().media;
    const video = { ...post, post_id: "v", media_type: "VIDEO" as const, preview: "previews/v.mp4" };
    const carousel = { ...post, post_id: "c", media_type: "CAROUSEL_ALBUM" as const, slides: 4 };
    const button = (drawer: string) => /<a class="btn"[^>]*>(?:(?!<\/a>).)*Instagram<\/span><\/a>/s.exec(drawer)?.[0] ?? "";
    expect(button(html())).toContain('data-media-link="publicacion"');
    expect(button(html())).toContain('aria-label="Ver la publicación de Instagram"');
    expect(button(html())).toContain('href="https://www.instagram.com/p/p1/"');
    expect(button(html({ media: [video] }))).toContain('aria-label="Ver el video con sonido de Instagram"');
    expect(button(html({ media: [carousel] }))).toContain('aria-label="Ver las 4 imágenes de Instagram"');
    expect(html()).not.toContain("btn--primary"); // one way in, at the top
    expect(html({ media: [video] }).match(/data-media-link="video"/g)).toHaveLength(1); // not twice
  });

  it("links to the other posts only when there are", () => {
    const [post] = event().media;
    expect(html()).not.toContain('data-media-link="publicaciones"');
    expect(html({ media: [post, { ...post, post_id: "p2" }, { ...post, post_id: "p3" }] })).toContain("Ver las 3 publicaciones");
  });

  it("a story-only event: where it came from, and its account's profile instead of the post", () => {
    const drawer = html({ media: [storyMedia()] });
    expect(drawer).toContain("De una historia de @academia · las historias duran 24 horas");
    expect(drawer).toContain(`href="https://www.instagram.com/academia/" target="_blank" rel="noopener" data-profile="academia"`);
    expect(drawer).toContain('aria-label="Ver el perfil de @academia"');
    expect(drawer).not.toContain("Ver la publicación");
    expect(drawer).not.toContain("Texto de la publicación"); // a story has no caption
    expect(drawer).not.toContain("data-media-link"); // nothing to play
    expect(drawer.indexOf('data-track="perfil-historia"')).toBeLessThan(drawer.indexOf("De una historia")); // the profile is a quick action
  });

  it("an event with a post and a story shows the post first, as it comes", () => {
    const drawer = html({ media: [event().media[0], storyMedia()] });
    expect(drawer).toContain('aria-label="Ver la publicación de Instagram"');
    expect(drawer).toContain(`href="https://www.instagram.com/p/p1/"`);
    expect(drawer).not.toContain("De una historia");
    expect(drawer).toContain("Ver las 2 publicaciones");
  });

  it("escapes the event's text", () => {
    expect(html({ title: `<img src=x onerror="alert(1)">` })).not.toContain("<img src=x");
  });

  it("says the price in one line", () => {
    const options = [
      { label: "Preventa", amount_cop: 25000, condition: null },
      { label: "Taquilla", amount_cop: 30000, condition: null },
    ];
    expect(sheetPrice(event({ prices: options }))).toMatch(/^Desde \$\s?25\.000 <span class="detail-note">· 2 opciones<\/span>$/);
    expect(sheetPrice(event({ prices: [{ label: "Entrada", amount_cop: 0, condition: null }] }))).toBe("Gratis");
    expect(sheetPrice(event())).toContain("Por confirmar");
  });
});

describe("an event's page, with a story", () => {
  it("shows a story's flyer as a plain image labeled Historia: no link to play it", () => {
    const page = eventDetailHtml(storyEvent(), 0);
    expect(page).toContain(`<img src="/flyers/story-3f9a1c2b7d4e5f60-0.webp"`);
    expect(page).toContain(`<div class="event-detail__media">`);
    expect(page).toContain("event-detail__play--story");
    expect(page).toContain("Historia</span>");
    expect(page).not.toContain("data-view-post"); // neither the media viewer nor the inline player
    expect(page).not.toContain("Ver la publicación");
    expect(page).toContain("De una historia de @academia");
    expect(page).toContain('data-track="perfil-historia"');
  });

  it("a post's flyer still opens the post; choosing the story shows it instead", () => {
    const both = storyEvent({ media: [event().media[0], storyMedia()] });
    const post = eventDetailHtml(both, 0);
    expect(post).toContain(`data-view-post="0"`);
    expect(post).not.toContain("Historia</span>");
    const story = eventDetailHtml(both, 1);
    expect(story).not.toContain("data-view-post");
    expect(story).toContain("Historia</span>");
    expect(story).toContain('data-track="perfil-historia"');
    expect(story).toContain(`data-open-posts data-selected="1"`);
  });

  it("the flyer's link is named starting with the words on it (label in name): \"Ver las 19\"", () => {
    const [post] = event().media;
    const name = (media: typeof post) => /class="event-detail__media"[^>]*aria-label="([^"]+)"/.exec(eventDetailHtml(event({ media: [media] }), 0))?.[1];
    expect(name({ ...post, media_type: "CAROUSEL_ALBUM", slides: 19 })).toBe("Ver las 19, publicación de Instagram");
    expect(name({ ...post, media_type: "VIDEO", preview: "previews/v.mp4" })).toMatch(/^Ver con sonido, publicación de Instagram$/);
    expect(name(post)).toBe("Ver la publicación"); // a photo: nothing written on it
  });

  it("says to check low-confidence details with the account, not a post", () => {
    expect(eventDetailHtml(storyEvent({ confidence: "low" }), 0)).toContain("confírmalos con la cuenta.");
    expect(eventDetailHtml(event({ confidence: "low" }), 0)).toContain("confírmalos en la publicación.");
  });
});

describe("the account in the details' head", () => {
  it("opens its profile inside the site (data-profile, postViewer.ts); the link is Instagram's for a new tab", () => {
    const drawer = eventDrawerHtml(event({ account: "la.topa_bogota" }), { titleId: "t" });
    const link = /<a class="event-detail__account"[^>]*>.*?<\/a>/.exec(drawer)?.[0] ?? "";
    expect(link).toContain('href="https://www.instagram.com/la.topa_bogota/"');
    expect(link).toContain('target="_blank" rel="noopener"');
    expect(link).toContain('data-profile="la.topa_bogota"');
    expect(link).toContain('aria-label="Ver el perfil de @la.topa_bogota"');
    expect(link).toContain('data-track="perfil-detalle"');
    expect(link).toContain("@la.topa_bogota");
    expect(eventDetailHtml(event({ account: "academia" }), 0)).toContain('href="https://www.instagram.com/academia/"');
  });
});

describe("a video's card", () => {
  it('says "Video" whether it plays its clip or not; a photo doesn\'t', async () => {
    const { eventCardGridHtml } = await import("../src/scripts/views/eventCard");
    const [post] = event().media;
    const withClip = { ...post, post_id: "v1", media_type: "VIDEO" as const, preview: "previews/v1.mp4" };
    const withoutClip = { ...post, post_id: "v2", media_type: "VIDEO" as const, preview: null };
    expect(eventCardGridHtml([event({ media: [withClip] })])).toContain('class="video-mark"');
    expect(eventCardGridHtml([event({ media: [withClip] })])).toContain("<video");
    expect(eventCardGridHtml([event({ media: [withoutClip] })])).toContain('class="video-mark"');
    expect(eventCardGridHtml([event()])).not.toContain('class="video-mark"');
  });
});
