import { afterEach, describe, expect, it, vi } from "vitest";
import { shareContent, whatsAppUrl } from "../src/scripts/lib/share";

const url = "https://pa-bailar.github.io/evento/social/";
const content = { title: "Social", text: "Social de salsa · sábado 9 p. m.", url };

/** How the share menu answers when it doesn't share: closed by the visitor, already open (a second tap), refused. */
type MenuRefusal = "AbortError" | "InvalidStateError" | "NotAllowedError";

/** A browser with or without a share menu (`share`) and a clipboard, each answering as given. */
function browser({ share, clipboard = "ok" }: { share?: "ok" | MenuRefusal; clipboard?: "ok" | "refused" }) {
  const refused = (name: string) => Promise.reject(new DOMException("", name));
  const menu = share && { share: vi.fn(() => (share === "ok" ? Promise.resolve() : refused(share))) };
  const writeText = vi.fn(() => (clipboard === "ok" ? Promise.resolve() : refused("NotAllowedError")));
  const open = vi.fn();
  vi.stubGlobal("navigator", { ...menu, clipboard: { writeText } });
  vi.stubGlobal("window", { open });
  return { writeText, open };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("shareContent (lib/share.ts)", () => {
  it("uses the device's share menu when there's one, and says when it was closed", async () => {
    const { writeText, open } = browser({ share: "ok" });
    expect(await shareContent(content)).toBe("shared");
    expect(writeText).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
    browser({ share: "AbortError" });
    expect(await shareContent(content)).toBe("closed");
  });

  it("a second tap while the menu is open does nothing more (it opened WhatsApp over the menu)", async () => {
    const { writeText, open } = browser({ share: "InvalidStateError" });
    expect(await shareContent(content)).toBe("closed");
    expect(writeText).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });

  it("without a menu, copies the link (only the link: it pastes anywhere)", async () => {
    const { writeText, open } = browser({});
    expect(await shareContent(content)).toBe("copied");
    expect(writeText).toHaveBeenCalledWith(url);
    expect(open).not.toHaveBeenCalled();
  });

  it("a menu that refuses (not a close) falls back the same way", async () => {
    const { writeText } = browser({ share: "NotAllowedError" });
    expect(await shareContent(content)).toBe("copied");
    expect(writeText).toHaveBeenCalledWith(url);
  });

  it("opens WhatsApp where the page can't say it copied (over a modal), or can't copy", async () => {
    const { writeText, open } = browser({});
    expect(await shareContent(content, false)).toBe("whatsapp");
    expect(writeText).not.toHaveBeenCalled();
    expect(open).toHaveBeenCalledWith(whatsAppUrl(content.text, url), "_blank", "noopener");
    browser({ clipboard: "refused" });
    expect(await shareContent(content)).toBe("whatsapp");
  });

  it("WhatsApp's link carries the text, then the link, on its own line", () => {
    expect(whatsAppUrl("Hola", "https://x.co/")).toBe("https://wa.me/?text=Hola%0Ahttps%3A%2F%2Fx.co%2F");
  });
});
