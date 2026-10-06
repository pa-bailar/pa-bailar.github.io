import { describe, expect, it } from "vitest";
import { cardLabel } from "../src/scripts/views/eventCard";
import { event } from "./factories";

// What a card's link says when Tab reaches it (the owner, 6 Oct 2026: each card is one Tab stop, so its link has to
// say what the card shows).

describe("a card's spoken label", () => {
  it("starts with the title on screen (voice control), then when, what, where and how much", () => {
    const party = event({ title: "Homenaje a Héctor Lavoe", event_type: "concert" });
    expect(cardLabel(party, "Mañana · 7:00 p. m.", "Bilongo", "$ 25.000")).toBe(
      "Homenaje a Héctor Lavoe, Mañana · 7:00 p. m., Concierto, Bilongo, $ 25.000",
    );
  });

  it("leaves out what the card doesn't have", () => {
    const social = event({ title: "Social de bachata", event_type: "social" });
    expect(cardLabel(social, "Viernes", "", "")).toBe("Social de bachata, Viernes, Social");
  });
});
