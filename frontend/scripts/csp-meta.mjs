// The Content Security Policy's <meta> (astro.config.mjs), moved and checked on every page after the build.
//   - A policy in a <meta> only covers what comes after it, and Astro writes it at the end of <head>: it moves
//     right after <meta charset>, so it also covers the fonts, the theme script and GoatCounter's script.
//   - Every inline script (not the JSON data blocks) and every <style> must be allowed by its hash, and no element
//     may have a style="" attribute nor an inline event handler (onclick="…", onload="…": the policy blocks both):
//     otherwise the build fails, instead of the browser quietly blocking it on the live site.
//   - A <meta> policy can't set frame-ancestors (nor report-uri or sandbox): only a header can, and GitHub Pages
//     sends none. Other sites can frame these pages; with no accounts or forms here, that leads nowhere.

import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const META = /<meta http-equiv="content-security-policy" content="([^"]*)">/;
const CHARSET = '<meta charset="utf-8">';
const INLINE = /<(script|style)\b([^>]*)>([\s\S]*?)<\/\1>/g;
const DATA_BLOCK = /\btype="application\/(ld\+)?json"/;

const sha256 = (code) => `'sha256-${createHash("sha256").update(code).digest("base64")}'`;

/** The policy's directives: {"script-src": ["'self'", ...], ...}. */
export function parsePolicy(policy) {
  const directives = {};
  for (const part of policy.split(";")) {
    const [name, ...sources] = part.trim().split(/\s+/);
    if (name) directives[name] = sources;
  }
  return directives;
}

/** The page with its policy moved to the top, and what the policy would block (empty if nothing). */
export function securePage(html) {
  const meta = html.match(META);
  if (!meta) return { html, problems: ["no Content-Security-Policy <meta>"] };
  if (!html.includes(CHARSET)) return { html, problems: [`no ${CHARSET}`] };
  const moved = html.replace(meta[0], "").replace(CHARSET, `${CHARSET}${meta[0]}`);

  const policy = parsePolicy(meta[1]);
  const problems = [];
  for (const [, tag, attributes, code] of moved.matchAll(INLINE)) {
    if (/\bsrc=/.test(attributes) || DATA_BLOCK.test(attributes)) continue;
    const allowed = policy[tag === "script" ? "script-src" : "style-src"] ?? [];
    if (!allowed.includes(sha256(code))) problems.push(`inline <${tag}> not allowed: ${code.trim().slice(0, 60)}…`);
  }
  const markup = moved.replace(INLINE, "");
  if (/<[^>]+\sstyle=/.test(markup)) problems.push('a style="" attribute (blocked: set it from a script or a class)');
  const handler = markup.match(/<[^>]+\s(on[a-z]+)\s*=/i);
  if (handler) problems.push(`an inline ${handler[1]}="" handler (blocked: add a listener from a script)`);
  return { html: moved, problems };
}

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(file);
    else if (entry.name.endsWith(".html")) yield file;
  }
}

/** Astro integration: runs securePage on every built page; any problem fails the build. */
export default function cspMeta() {
  return {
    name: "csp-meta",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const failures = [];
        let pages = 0;
        for await (const file of htmlFiles(root)) {
          const { html, problems } = securePage(await readFile(file, "utf8"));
          problems.forEach((problem) => failures.push(`${path.relative(root, file)}: ${problem}`));
          await writeFile(file, html);
          pages++;
        }
        if (failures.length) throw new Error(`Content Security Policy:\n${failures.join("\n")}`);
        logger.info(`policy checked and moved to the top of ${pages} pages`);
      },
    },
  };
}
