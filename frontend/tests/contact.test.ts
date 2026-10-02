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

  it("a landline is a call: it has no WhatsApp", () => {
    expect(contactLink("601 7559780")).toEqual({ kind: "phone", href: "tel:+576017559780", label: "601 7559780" });
    expect(contactLink("+57 604 4441234")?.href).toBe("tel:+576044441234");
  });

  it("a mobile number opens a WhatsApp chat, with Colombia's code", () => {
    expect(contactLink("350-537-2687")).toEqual({
      kind: "whatsapp",
      href: "https://wa.me/573505372687",
      label: "350-537-2687",
    });
    expect(contactLink("WhatsApp 320 2332984")).toEqual({
      kind: "whatsapp",
      href: "https://wa.me/573202332984",
      label: "320 2332984",
    });
    expect(contactLink("+57 316 495 2960")?.href).toBe("https://wa.me/573164952960");
  });

  it("an incomplete number isn't a link", () => {
    expect(contactLink("322 202197")).toBeNull();
  });

  it("a website opens it", () => {
    expect(contactLink("distrito-social-academy.com/eventos")?.href).toBe("https://distrito-social-academy.com/eventos");
  });
});
