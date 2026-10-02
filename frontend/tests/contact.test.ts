import { describe, expect, it } from "vitest";
import { contactLink } from "../src/scripts/lib/contact";

describe("contact links", () => {
  it("an @username opens its Instagram", () => {
    expect(contactLink("@bureodancestudio")).toEqual({
      kind: "instagram",
      href: "https://www.instagram.com/bureodancestudio/",
      label: "@bureodancestudio",
    });
  });

  it("a number marked WhatsApp opens a chat, with Colombia's code", () => {
    expect(contactLink("WhatsApp 320 2332984")).toEqual({
      kind: "whatsapp",
      href: "https://wa.me/573202332984",
      label: "320 2332984",
    });
  });

  it("any other number is a call, never WhatsApp", () => {
    expect(contactLink("350-537-2687")).toEqual({ kind: "phone", href: "tel:+573505372687", label: "350-537-2687" });
    expect(contactLink("601 7559780")?.href).toBe("tel:+576017559780"); // landline
  });

  it("an incomplete number isn't a link", () => {
    expect(contactLink("322 202197")).toBeNull();
  });

  it("a website opens it", () => {
    expect(contactLink("distrito-social-academy.com/eventos")?.href).toBe("https://distrito-social-academy.com/eventos");
  });
});
