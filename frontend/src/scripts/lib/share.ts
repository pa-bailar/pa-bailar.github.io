// Sharing through the device's own share menu (Web Share): the visitor picks WhatsApp, a group, Instagram,
// Telegram, "copy"… as in any app. An image goes along when the browser can share files. Phones and most
// computers have one (Chrome, Edge, Safari); where there's none (Firefox on a computer, some apps' browsers), the
// link is copied, to paste anywhere, when the page can say so (views/sharing.ts: "Enlace copiado · Enviar por
// WhatsApp"; the Instagram audit of 7 Oct 2026: WhatsApp alone was the only way). Otherwise, or with no clipboard,
// WhatsApp opens with the text.

export interface ShareContent {
  title: string;
  text: string; // the message: a WhatsApp-friendly list or an event's details
  url: string; // where it leads (its preview shows in chats)
  file?: File | null; // the image, when there's one ready
}

/** What sharing did: the menu shared it (or was closed, or was already open), the link was copied, or WhatsApp
 * opened. */
export type ShareOutcome = "shared" | "closed" | "copied" | "whatsapp";

/** WhatsApp with the text and its link. */
export const whatsAppUrl = (text: string, url: string) =>
  `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;

/** Shares through the menu; without one, copies the link if `copy` (the page can say it did), else opens WhatsApp. */
export async function shareContent({ title, text, url, file }: ShareContent, copy = true): Promise<ShareOutcome> {
  if (navigator.share) {
    const withFile = file && navigator.canShare?.({ files: [file] });
    try {
      // With an image, apps take the text as its caption, so the link goes inside the text.
      await navigator.share(withFile ? { title, text: `${text}\n${url}`, files: [file] } : { title, text, url });
      return "shared";
    } catch (error) {
      // Closed the menu, or a second tap while it's open (InvalidStateError: one share at a time): nothing else to
      // do. A double tap opened WhatsApp over the menu (the bug hunt of 7 Oct 2026).
      if (error instanceof DOMException && ["AbortError", "InvalidStateError"].includes(error.name)) return "closed";
    }
  }
  if (copy) {
    try {
      await navigator.clipboard.writeText(url);
      return "copied";
    } catch {
      // No clipboard (not allowed, or an old browser): WhatsApp, below.
    }
  }
  window.open(whatsAppUrl(text, url), "_blank", "noopener");
  return "whatsapp";
}
