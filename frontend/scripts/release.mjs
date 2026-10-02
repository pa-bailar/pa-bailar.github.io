// The site's versions (Semantic Versioning), worked out from the titles of the merged PRs, which follow
// Conventional Commits (PRs are squash-merged, so each is one commit on main, titled like the PR):
//   - "feat(share): …"             → a new minor version (1.2.0 → 1.3.0)
//   - "fix(viewer): …", perf, refactor, copy, style, revert → a patch (1.2.0 → 1.2.1)
//   - docs, chore (the daily data PRs), ci, test, build → no new version: visitors see nothing new
//   - "feat!: …" or "BREAKING CHANGE" in the body → a new major version (1.2.0 → 2.0.0)
// The deploy workflow tags each version (v1.3.0) and publishes a GitHub Release with the changes it brings;
// the footer shows the version, linked to that release. CI checks every PR title, so none is missed.
//
// Usage:
//   node scripts/release.mjs check "<PR title>"   exits 1 if the title doesn't follow the format (ci)
//   node scripts/release.mjs plan <notes file>     version for HEAD, from the commits since the last tag (deploy):
//                                                   prints version=, previous=, release=true|false
//                                                   (for $GITHUB_OUTPUT) and writes the release notes

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MINOR = ["feat"];
const PATCH = ["fix", "perf", "refactor", "copy", "style", "revert"];
const QUIET = ["docs", "chore", "ci", "test", "build"];
export const TYPES = [...MINOR, ...PATCH, ...QUIET];
export const FIRST_VERSION = "1.0.0";

const HEADER = /^(?<type>[a-z]+)(?:\((?<scope>[^()]+)\))?(?<breaking>!)?: (?<summary>\S.*)$/;

const SECTIONS = [
  { title: "Breaking changes", has: (commit) => commit.breaking },
  { title: "Features", has: (commit) => !commit.breaking && MINOR.includes(commit.type) },
  { title: "Fixes", has: (commit) => !commit.breaking && commit.type === "fix" },
  { title: "Other changes", has: (commit) => !commit.breaking && PATCH.includes(commit.type) && commit.type !== "fix" },
];

/** "feat(share): …" → { type, scope, breaking, summary }; null if it doesn't follow the format. */
export function parseCommit(subject, body = "") {
  const match = HEADER.exec(subject.trim());
  if (!match?.groups || !TYPES.includes(match.groups.type)) return null;
  const { type, scope, breaking, summary } = match.groups;
  return { type, scope: scope ?? null, breaking: Boolean(breaking) || /^BREAKING[ -]CHANGE:/m.test(body), summary };
}

/** "major" | "minor" | "patch" | null: the biggest change among the commits. */
export function bumpOf(commits) {
  if (commits.some((commit) => commit.breaking)) return "major";
  if (commits.some((commit) => MINOR.includes(commit.type))) return "minor";
  if (commits.some((commit) => PATCH.includes(commit.type))) return "patch";
  return null;
}

export function nextVersion(version, bump) {
  const [major, minor, patch] = version.split(".").map(Number);
  if (bump === "major") return `${major + 1}.0.0`;
  if (bump === "minor") return `${major}.${minor + 1}.0`;
  if (bump === "patch") return `${major}.${minor}.${patch + 1}`;
  return version;
}

/** The release's description: what visitors get, grouped, one line per PR (GitHub links its "#41"). */
export function releaseNotes(commits) {
  const lines = [];
  for (const section of SECTIONS) {
    const shown = commits.filter(section.has);
    if (!shown.length) continue;
    lines.push(`### ${section.title}`, "");
    for (const commit of shown) lines.push(`- ${commit.scope ? `**${commit.scope}:** ` : ""}${commit.summary}`);
    lines.push("");
  }
  return lines.join("\n");
}

/** The version for HEAD: the last tag's, or the next one when commits since then change the site. */
export function plan(lastTag, commits) {
  const parsed = commits.map(({ subject, body }) => parseCommit(subject, body)).filter(Boolean);
  if (!lastTag) {
    return { version: FIRST_VERSION, previous: null, release: true, notes: "The first numbered version of Pa' Bailar.\n" };
  }
  const previous = lastTag.replace(/^v/, "");
  const bump = bumpOf(parsed);
  return { version: nextVersion(previous, bump), previous, release: bump !== null, notes: releaseNotes(parsed) };
}

const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

function lastTag() {
  try {
    return git("describe", "--tags", "--abbrev=0", "--match", "v[0-9]*.[0-9]*.[0-9]*");
  } catch {
    return null; // no version yet
  }
}

function commitsSince(tag) {
  const log = git("log", "--format=%s%x1f%b%x1e", tag ? `${tag}..HEAD` : "HEAD");
  return log
    .split("\x1e")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [subject, body = ""] = entry.split("\x1f");
      return { subject, body };
    });
}

// Run as a command (not imported by the tests).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, argument] = process.argv.slice(2);
  if (command === "check") {
    if (!parseCommit(argument ?? "")) {
      console.error(
        `The PR title "${argument}" doesn't follow Conventional Commits: "<type>(<scope>): <summary>", with type one of ` +
          `${TYPES.join(", ")}. It becomes the commit on main, which sets the next version (scripts/release.mjs).`,
      );
      process.exit(1);
    }
  } else if (command === "plan" && argument) {
    const tag = lastTag();
    const result = plan(tag, commitsSince(tag));
    writeFileSync(argument, result.notes);
    console.log(`version=${result.version}\nprevious=${result.previous ?? ""}\nrelease=${result.release}`);
  } else {
    console.error('Usage: node scripts/release.mjs check "<PR title>" | plan <notes file>');
    process.exit(2);
  }
}
