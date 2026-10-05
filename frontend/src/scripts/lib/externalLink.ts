// A link that leaves the site in a new tab (Maps, WhatsApp, a website, the report form, an Instagram post), as an
// HTML string for the views. An account's @ is lib/accountLink.ts's own link instead.

import { escapeHtml } from "./dom";

/** `name="value"` pairs, each value escaped, for a tag written as a string. */
export function attributesHtml(attributes: Record<string, string>): string {
  return Object.entries(attributes)
    .map(([name, value]) => `${name}="${escapeHtml(value)}"`)
    .join(" ");
}

export interface ExternalLinkOptions {
  className?: string;
  track?: string; // data-track (lib/analytics.ts)
  attributes?: Record<string, string>; // any other, after these
}

/** `<a href target="_blank" rel="noopener">`, with `content` (HTML) inside. */
export function externalLinkHtml(href: string, content: string, { className, track, attributes = {} }: ExternalLinkOptions = {}): string {
  const all = {
    ...(className ? { class: className } : {}),
    href,
    target: "_blank",
    rel: "noopener",
    ...(track ? { "data-track": track } : {}),
    ...attributes,
  };
  return `<a ${attributesHtml(all)}>${content}</a>`;
}
