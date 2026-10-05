// After the build: each page's module script (at the end of its body, after the events' JSON) and the chunks it
// imports (sharing.js, shared by the home page and the event pages) are announced in <head> with
// <link rel="modulepreload">. Without it the browser found the chunk only once the script had downloaded and been
// parsed: one more round trip (about 350 ms on a phone) before anything could be drawn. The policy allows them
// (script-src 'self').

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MODULE_SCRIPT = /<script type="module" src="(\/_astro\/[^"]+\.js)"/g;

/** The chunks a built module imports statically (`import{…}from"./x.js"`, `import"./x.js"`; not `import()`), as paths. */
export function staticImports(code, file) {
  const found = [...code.matchAll(/(?:\bfrom|\bimport)\s*"(\.{1,2}\/[^"]+\.js)"/g)].map((match) => match[1]);
  return found.map((relative) => path.posix.join(path.posix.dirname(file), relative));
}

/**
 * `html` with a modulepreload link in <head> for each of its module scripts and everything they import (`importsOf`:
 * a file's static imports), each once. Unchanged when it has no module script.
 */
export function withModulePreloads(html, importsOf) {
  const preloads = new Set();
  const visit = (file) => {
    if (preloads.has(file)) return;
    preloads.add(file);
    importsOf(file).forEach(visit);
  };
  for (const [, src] of html.matchAll(MODULE_SCRIPT)) visit(src);
  if (!preloads.size) return html;
  const links = [...preloads].map((href) => `<link rel="modulepreload" href="${href}">`).join("");
  return html.replace("</head>", `${links}</head>`);
}

async function htmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return htmlFiles(full);
      return entry.name.endsWith(".html") ? [full] : [];
    }),
  );
  return nested.flat();
}

/** Astro integration: the module preloads in every built page. */
export default function modulePreload() {
  return {
    name: "module-preload",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const imports = new Map();
        const read = async (file) => {
          if (!imports.has(file)) {
            const code = await readFile(path.join(root, file), "utf8");
            imports.set(file, staticImports(code, file));
            await Promise.all(imports.get(file).map(read));
          }
        };
        let pages = 0;
        for (const file of await htmlFiles(root)) {
          const html = await readFile(file, "utf8");
          for (const [, src] of html.matchAll(MODULE_SCRIPT)) await read(src);
          const updated = withModulePreloads(html, (chunk) => imports.get(chunk) ?? []);
          if (updated === html) continue;
          await writeFile(file, updated);
          pages += 1;
        }
        logger.info(`module scripts and their chunks preloaded in ${pages} pages`);
      },
    },
  };
}
