import { describe, expect, it } from "vitest";
import { bumpOf, nextVersion, parseCommit, plan, releaseNotes } from "../scripts/release.mjs";

const commits = (...subjects: string[]) => subjects.map((subject) => ({ subject, body: "" }));

describe("parseCommit", () => {
  it("reads Conventional Commits titles", () => {
    expect(parseCommit("feat(share): branded link preview (#41)")).toEqual({
      type: "feat",
      scope: "share",
      breaking: false,
      summary: "branded link preview (#41)",
    });
    expect(parseCommit("docs: architecture")).toMatchObject({ type: "docs", scope: null });
    expect(parseCommit("feat!: new data format")?.breaking).toBe(true);
    expect(parseCommit("fix: x", "BREAKING CHANGE: the feed moved")?.breaking).toBe(true);
  });

  it("rejects other titles", () => {
    expect(parseCommit("fix/flyers uncropped (#14)")).toBeNull();
    expect(parseCommit("Update footer")).toBeNull();
    expect(parseCommit("feature(site): x")).toBeNull();
    expect(parseCommit("feat:missing space")).toBeNull();
  });
});

describe("versions", () => {
  const bump = (...subjects: string[]) => bumpOf(subjects.map((subject) => parseCommit(subject)));

  it("takes the biggest change", () => {
    expect(bump("fix: a", "feat: b", "docs: c")).toBe("minor");
    expect(bump("fix: a", "copy(footer): b")).toBe("patch");
    expect(bump("feat: a", "fix!: b")).toBe("major");
    expect(bump("chore(data): daily sweep", "docs: x", "ci: y")).toBeNull();
  });

  it("counts from the previous version", () => {
    expect(nextVersion("1.2.3", "major")).toBe("2.0.0");
    expect(nextVersion("1.2.3", "minor")).toBe("1.3.0");
    expect(nextVersion("1.2.3", "patch")).toBe("1.2.4");
    expect(nextVersion("1.2.3", null)).toBe("1.2.3");
  });
});

describe("plan", () => {
  it("starts at 1.0.0", () => {
    expect(plan(null, commits("feat: a"))).toMatchObject({ version: "1.0.0", previous: null, release: true });
  });

  it("releases only when the site changes", () => {
    expect(plan("v1.4.0", commits("chore(data): daily sweep 2026-10-03 (#50)"))).toMatchObject({
      version: "1.4.0",
      release: false,
    });
    expect(plan("v1.4.0", commits("chore(data): sweep (#50)", "fix(viewer): counter (#51)"))).toMatchObject({
      version: "1.4.1",
      previous: "1.4.0",
      release: true,
    });
  });
});

describe("releaseNotes", () => {
  it("groups the changes visitors get, leaving out data, docs and CI", () => {
    const notes = releaseNotes(
      ["feat(share): branded preview (#41)", "fix: counter (#42)", "copy(footer): wording (#43)", "chore(data): sweep (#44)"].map(
        (subject) => parseCommit(subject),
      ),
    );
    expect(notes).toBe(
      "### Features\n\n- **share:** branded preview (#41)\n\n### Fixes\n\n- counter (#42)\n\n### Other changes\n\n- **footer:** wording (#43)\n",
    );
  });
});
