// The events the home page embeds (src/pageData.ts): what the browser needs, not the extraction's own notes.
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pageEventsJson } from "../src/pageData";
import { event } from "./factories";

describe("the home page's events JSON", () => {
  it("leaves out `doubts` (data/events.json keeps them) and keeps the rest", () => {
    const [parsed] = JSON.parse(pageEventsJson([event({ id: "a", doubts: ["¿la hora es 8 o 9?"] })]));
    expect(parsed).not.toHaveProperty("doubts");
    expect(parsed).toMatchObject({ id: "a", title: event().title });
  });

  it("can't end its script block early", () => {
    const json = pageEventsJson([event({ title: "</script><img src=x>" })]);
    expect(json).not.toContain("<");
    expect(JSON.parse(json)[0].title).toBe("</script><img src=x>");
  });

  it("no script reads `doubts` (they're not in the page)", () => {
    const dir = new URL("../src/scripts/", import.meta.url);
    const files = readdirSync(dir, { recursive: true, encoding: "utf8" }).filter((file) => file.endsWith(".ts") && !file.endsWith("types.ts"));
    for (const file of files) {
      expect(readFileSync(new URL(file.replaceAll("\\", "/"), dir), "utf8"), file).not.toMatch(/\bdoubts\b/);
    }
  });
});
