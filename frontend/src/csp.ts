// The page's own inline scripts, allowed by the Content Security Policy (astro.config.mjs) by their hash.
// Astro hashes the scripts it bundles, not inline ones; a page adds each of its own with allowInlineScript().
// Build time only (Node). scripts/csp-meta.mjs fails the build if any inline script isn't allowed.
import { createHash } from "node:crypto";
import type { AstroGlobal } from "astro";

/** Adds `code`'s hash to the page's script-src and returns `code`, for <script is:inline set:html={...} />. */
export function allowInlineScript(astro: AstroGlobal, code: string): string {
  astro.csp?.insertScriptHash(`sha256-${createHash("sha256").update(code).digest("base64")}`);
  return code;
}

/** A value written into an inline script as JavaScript, with "<" escaped so nothing can end the script early. */
export const jsValue = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");
