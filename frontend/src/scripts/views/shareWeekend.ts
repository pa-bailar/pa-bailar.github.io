// "Compartir el finde": the weekend image (/finde.jpg) and a link, shared to WhatsApp. Dance life in
// Bogotá runs on WhatsApp groups, and an image of the weekend's socials travels better than a link.
//   - Phones (and browsers that can): the image itself, with the text and link, through the phone's share
//     sheet (Web Share with files).
//   - Elsewhere: WhatsApp with the text and the /finde/ link, whose preview is the same image.
// The image is fetched ahead of time (when the button shows), because phones only allow sharing right at
// the tap: waiting for a download first would lose it.

import { trackPageview } from "../lib/analytics";
import { BASE_URL } from "../lib/links";

const TEXT = "Sociales y talleres de baile de este finde en Bogotá 💃🕺";
const PAGE_URL = new URL(`${BASE_URL}finde/`, import.meta.env.SITE).href;

let file: File | null = null;
let preparing: Promise<void> | null = null;

/** Fetch the image once, so a tap can share it at once. */
export function prepareWeekendShare() {
  if (preparing || !document.querySelector("[data-share-weekend]")) return;
  preparing = fetch(`${BASE_URL}finde.jpg`)
    .then((response) => (response.ok ? response.blob() : Promise.reject(new Error(String(response.status)))))
    .then((blob) => {
      file = new File([blob], "pa-bailar-este-finde.jpg", { type: "image/jpeg" });
    })
    .catch(() => {
      preparing = null; // try again next time; meanwhile the WhatsApp link works
    });
}

export async function shareWeekend() {
  trackPageview(`${BASE_URL}finde/compartido`, "Compartir el finde");
  if (file && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: `${TEXT}\n${PAGE_URL}` });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return; // closed the share sheet
    }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(`${TEXT}\n${PAGE_URL}`)}`, "_blank", "noopener");
}
