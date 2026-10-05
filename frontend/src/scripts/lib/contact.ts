// The organizer's contact as a link (the backend keeps only values it can link: normalize_contact):
//   - "@academia"            → its Instagram profile
//   - a mobile number (3XX)   → a WhatsApp chat (wa.me): that's how people reach an academy here, nobody calls
//   - a landline (60X)        → a call (tel:): landlines don't have WhatsApp
//   - "academia.com/eventos" → the website
// Colombian numbers get the country code (57); a number that isn't a full Colombian or international one
// stays plain text, rather than a link that wouldn't work.

import { profileUrl } from "./links";

export type ContactKind = "instagram" | "whatsapp" | "phone" | "web";

export interface ContactLink {
  kind: ContactKind;
  href: string;
  label: string; // what's shown: the handle, the number, the address
}

const WHATSAPP = /\b(whats\s*app|wpp|wsp)\b/i; // the backend may mark a number "WhatsApp …"
const HANDLE = /^@([A-Za-z0-9._]+)$/;
const WEBSITE = /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i;
const LANDLINE = /^5760\d{8}$/; // Colombian landlines: 60 + area digit + 7 digits

/** "320 233 2984" → "573202332984"; null when it isn't a full number. */
function internationalNumber(text: string): string | null {
  const digits = text.replace(/\D/g, "");
  if (text.trim().startsWith("+") && digits.length >= 10) return digits;
  if (digits.length === 12 && digits.startsWith("57")) return digits;
  if (digits.length === 10 && /^(3|60)/.test(digits)) return `57${digits}`; // mobile, or landline 60X
  return null;
}

export function contactLink(contact: string): ContactLink | null {
  const text = contact.trim();
  const handle = HANDLE.exec(text);
  if (handle) return { kind: "instagram", href: profileUrl(handle[1]!), label: text };
  if (WEBSITE.test(text)) {
    return { kind: "web", href: /^https?:\/\//i.test(text) ? text : `https://${text}`, label: text.replace(/^https?:\/\//i, "") };
  }
  const number = internationalNumber(text);
  if (!number) return null;
  const label = text.replace(WHATSAPP, "").replace(/^[\s:.-]+/, "").trim();
  return LANDLINE.test(number)
    ? { kind: "phone", href: `tel:+${number}`, label }
    : { kind: "whatsapp", href: `https://wa.me/${number}`, label };
}
