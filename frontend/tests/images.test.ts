import { describe, expect, it } from "vitest";
import { IMAGES_VERSION, imagesVersion } from "../src/images";

const bytes = (text: string) => new TextEncoder().encode(text);

describe("the service worker's images version", () => {
  const flyers: [string, Uint8Array | null][] = [
    ["flyers/1-0.webp", bytes("one")],
    ["flyers/2-0.webp", bytes("two")],
  ];

  it("stays the same while the flyers do: the cache survives deploys", () => {
    expect(imagesVersion(flyers)).toBe(imagesVersion([...flyers]));
    expect(imagesVersion(flyers)).toMatch(/^[0-9a-f]{12}$/);
  });

  it("changes when a flyer is made again under the same name", () => {
    expect(imagesVersion([flyers[0]!, ["flyers/2-0.webp", bytes("two, cropped")]])).not.toBe(imagesVersion(flyers));
  });

  it("changes when a flyer comes or goes", () => {
    expect(imagesVersion(flyers.slice(0, 1))).not.toBe(imagesVersion(flyers));
  });

  it("is worked out for this build", () => {
    expect(IMAGES_VERSION).toMatch(/^[0-9a-f]{12}$/);
  });
});
