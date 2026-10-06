// `npm run media`: the flyers and clips for a local build or dev server. They live in their own repository,
// pa-bailar/media (the backend's docs/ARCHITECTURE.md, §10.2), not in this one: this clones it next to the
// repositories (Code/pa-bailar-images), or pulls it if it's there, and copies flyers/ and previews/ into ../data,
// as the workflows do before building.

import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const clone = fileURLToPath(new URL("../../../pa-bailar-images/", import.meta.url));
const data = fileURLToPath(new URL("../../data/", import.meta.url));

if (existsSync(clone)) execFileSync("git", ["-C", clone, "pull", "-q", "--ff-only"], { stdio: "inherit" });
else execFileSync("git", ["clone", "-q", "--depth", "1", "https://github.com/pa-bailar/media.git", clone], { stdio: "inherit" });

// A folder can be missing: git keeps no empty folder (no clips left once the last video's event is past).
for (const folder of ["flyers", "previews"]) {
  mkdirSync(`${data}${folder}`, { recursive: true });
  if (existsSync(`${clone}${folder}`)) cpSync(`${clone}${folder}`, `${data}${folder}`, { recursive: true });
  console.log(`${folder}: ${readdirSync(`${data}${folder}`).length} files in data/${folder}`);
}
