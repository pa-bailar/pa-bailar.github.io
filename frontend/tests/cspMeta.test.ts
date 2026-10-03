import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parsePolicy, securePage } from "../scripts/csp-meta.mjs";

const hash = (code: string) => `'sha256-${createHash("sha256").update(code).digest("base64")}'`;
const THEME = "document.documentElement.dataset.theme = 'dark';";
const meta = (scripts: string) =>
  `<meta http-equiv="content-security-policy" content="default-src 'self'; script-src 'self' ${scripts}; style-src 'self';">`;
const page = (head: string, body = "") =>
  `<!DOCTYPE html><html><head><meta charset="utf-8"><title>x</title><script>${THEME}</script>${head}</head><body>${body}</body></html>`;

describe("parsePolicy", () => {
  it("reads each directive's sources", () => {
    expect(parsePolicy("default-src 'self';img-src 'self' data:; frame-src https://www.instagram.com;")).toEqual({
      "default-src": ["'self'"],
      "img-src": ["'self'", "data:"],
      "frame-src": ["https://www.instagram.com"],
    });
  });
});

describe("securePage", () => {
  it("moves the policy right after <meta charset>, before everything it covers", () => {
    const { html, problems } = securePage(page(meta(hash(THEME))));
    expect(problems).toEqual([]);
    expect(html.indexOf("content-security-policy")).toBeLessThan(html.indexOf("<title>"));
    expect(html.indexOf("content-security-policy")).toBeGreaterThan(html.indexOf('<meta charset="utf-8">'));
    expect(html.match(/content-security-policy/g)).toHaveLength(1);
  });

  it("fails an inline script that isn't allowed by its hash", () => {
    expect(securePage(page(meta(""))).problems).toEqual([expect.stringContaining("inline <script> not allowed")]);
  });

  it("skips scripts with a src and JSON data blocks", () => {
    const body = `<script type="module" src="/_astro/a.js"></script><script type="application/json" id="d">{"a":1}</script>`;
    expect(securePage(page(meta(hash(THEME)), body)).problems).toEqual([]);
  });

  it("fails style attributes and pages without a policy", () => {
    expect(securePage(page(meta(hash(THEME)), `<div style="color: red"></div>`)).problems).toHaveLength(1);
    expect(securePage(page("")).problems).toEqual(["no Content-Security-Policy <meta>"]);
  });
});
