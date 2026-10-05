// Every @account on the site is this one link: its Instagram profile, opened inside the site in the media viewer's
// sheet (postViewer.ts handles any `a[data-profile]`), never in Instagram's app, whose back button doesn't come back
// here (the owner's rule of 4 October 2026). The href is the profile itself, so a new-tab click still gets Instagram,
// and so does a page without the viewer. Don't write an instagram.com profile link anywhere else:
// tests/accountLink.test.ts fails on one that doesn't go through here.

import { escapeHtml } from "./dom";
import { profileUrl } from "./links";

export interface AccountLinkOptions {
  className?: string;
  track?: string; // data-track (lib/analytics.ts)
  label?: string; // what's said to screen readers; default "Ver el perfil de @academia"
  content?: string; // the link's HTML; default "@academia"
}

/** The attributes of an account's link, for Astro components (`<a {...accountLinkAttrs(account)}>`). */
export function accountLinkAttrs(account: string, { className, track, label }: Omit<AccountLinkOptions, "content"> = {}) {
  return {
    ...(className ? { class: className } : {}),
    href: profileUrl(account),
    target: "_blank",
    rel: "noopener",
    "data-profile": account,
    ...(track ? { "data-track": track } : {}),
    "aria-label": label ?? `Ver el perfil de @${account}`,
  };
}

/** The same link as HTML, for the views. */
export function accountLinkHtml(account: string, { content, ...options }: AccountLinkOptions = {}): string {
  const attributes = Object.entries(accountLinkAttrs(account, options))
    .map(([name, value]) => `${name}="${escapeHtml(value)}"`)
    .join(" ");
  return `<a ${attributes}>${content ?? `@${escapeHtml(account)}`}</a>`;
}
