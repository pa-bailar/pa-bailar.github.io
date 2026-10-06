import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The images come from pa-bailar/media (docs/DATA.md). Git keeps no empty folder, so once the last clip's event is
// past, previews/ is gone from that repository: a copy that requires both folders failed every build (5 Oct 2026).
const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

describe("copying the images in survives a missing folder", () => {
  it.each([".github/workflows/deploy.yml", ".github/workflows/ci.yml"])("%s copies each folder only if it's there", (file) => {
    const workflow = read(file);
    expect(workflow).toContain("repository: pa-bailar/media");
    expect(workflow).toContain('if [ -d ".media/$folder" ]');
    expect(workflow).not.toMatch(/cp -r \.media\/flyers \.media\/previews/);
  });

  it("npm run media too", () => {
    expect(read("frontend/scripts/media.mjs")).toMatch(/if \(existsSync\(`\$\{clone\}\$\{folder\}`\)\) cpSync/);
  });
});
