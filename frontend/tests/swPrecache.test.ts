import { describe, expect, it } from "vitest";
import { BUILD_FILE_LIST, withBuildFiles } from "../scripts/sw-precache.mjs";

describe("withBuildFiles", () => {
  it("writes the build's files into the worker, where it had an empty list", () => {
    const worker = `const BUILD_FILE_LIST = ${BUILD_FILE_LIST};\ncaches.open("build").then((cache) => cache.addAll(BUILD_FILE_LIST));`;
    const files = ["/_astro/index.abc123.js", "/_astro/Stripes.def456.css"];
    const written = withBuildFiles(worker, files);
    expect(written).toContain(`const BUILD_FILE_LIST = ${JSON.stringify(files)};`);
    expect(written).not.toContain(BUILD_FILE_LIST);
  });

  it("is an empty list until then: valid code that stores nothing", () => {
    expect(new Function(`return ${BUILD_FILE_LIST};`)()).toEqual([]);
  });

  it("fails without the placeholder, so the build can't publish a worker that stores nothing", () => {
    expect(() => withBuildFiles("const BUILD_FILE_LIST = [];", ["/_astro/a.js"])).toThrow(/BUILD_FILE_LIST/);
  });
});
