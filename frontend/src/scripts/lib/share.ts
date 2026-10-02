// Sharing through the phone's own share menu (Web Share): the visitor picks WhatsApp, a group, Instagram,
// Telegram, "copy"… as in any app. An image goes along when the browser can share files. Where there's no
// share menu (most computers), WhatsApp opens with the text.

export interface ShareContent {
  title: string;
  text: string; // the message: a WhatsApp-friendly list or an event's details
  url: string; // where it leads (its preview shows in chats)
  file?: File | null; // the image, when there's one ready
}

export async function shareContent({ title, text, url, file }: ShareContent): Promise<void> {
  if (navigator.share) {
    const withFile = file && navigator.canShare?.({ files: [file] });
    try {
      // With an image, apps take the text as its caption, so the link goes inside the text.
      await navigator.share(withFile ? { title, text: `${text}\n${url}`, files: [file] } : { title, text, url });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return; // closed the menu
    }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, "_blank", "noopener");
}
