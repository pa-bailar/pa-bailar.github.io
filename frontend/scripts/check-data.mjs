// Checks data/events.json and data/meta.json against the data contract (docs/DATA.md) before the site
// is built. The backend that writes them lives in another (private) repository, so this is where a
// mismatch is caught: CI fails instead of the site breaking.
// Usage: node scripts/check-data.mjs   (exits 1 on any problem; run by `npm run check`). The tests call checkData.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const EVENT_TYPES = ["social", "workshop", "concert", "festival", "congress", "competition", "show", "other"];
const MEDIA_TYPES = ["IMAGE", "CAROUSEL_ALBUM", "VIDEO", "STORY"];
const CONFIDENCE = ["high", "medium", "low"];
// The backend's style list (pa_bailar/models.py Style). A new style needs a change here too.
const STYLES = [
  "salsa", "salsa cubana", "salsa en línea", "salsa caleña", "bachata", "bachata sensual",
  "bachata dominicana", "merengue", "cha cha chá", "son", "kizomba", "zouk", "champeta", "urbano",
  "afro", "dancehall", "heels", "tango", "swing", "otro",
];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ACCOUNT = /^[A-Za-z0-9._]{1,30}$/; // an Instagram username
// Used as links and file paths, so only these shapes: a post's link, and files named by post id (a post read
// from its public page has a "public-" id) and slide, inside their folders.
const PERMALINK = /^https:\/\/www\.instagram\.com\/(p|reel|reels|tv)\/[A-Za-z0-9_-]+\/$/;
// A story's own link dies after 24 hours, so a STORY links to its account's profile instead (a username, not one
// of Instagram's own paths), and its id is "story-<hash>".
const PROFILE = /^https:\/\/www\.instagram\.com\/([A-Za-z0-9._]{1,30})\/$/;
const NOT_PROFILES = ["p", "reel", "reels", "tv", "stories", "explore", "accounts", "direct"];
const STORY_ID = /^story-[A-Za-z0-9_-]+$/;
const FLYER = /^flyers\/[A-Za-z0-9_-]+\.webp$/; // <post id>-<slide>.webp, or <post id>.webp before slides
const PREVIEW = /^previews\/[A-Za-z0-9_-]+-\d+\.mp4$/; // <post id>-<slide>.mp4

const isString = (value) => typeof value === "string" && value.length > 0;
const isNullableString = (value) => value === null || typeof value === "string";
const isStringList = (value) => Array.isArray(value) && value.every((item) => typeof item === "string");
const isProfile = (link) => {
  const match = PROFILE.exec(link ?? "");
  return Boolean(match) && !NOT_PROFILES.includes(match[1].toLowerCase());
};
// A real day: Date.parse takes "2026-02-30" as March 2.
const isDate = (value) =>
  DATE.test(value ?? "") && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const daysFrom = (start, end) => Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000);
const MAX_EVENT_DAYS = 7; // the backend's config.MAX_EVENT_DAYS
// A workshop series (docs/DATA.md, "Workshop series"): the backend's MIN_SERIES_SESSIONS, MAX_SERIES_SESSIONS and
// MAX_SERIES_DAYS (the last session at most this many days in all after the first: end_date ≤ date + 122).
const MIN_SERIES_SESSIONS = 2;
const MAX_SERIES_SESSIONS = 12;
const MAX_SERIES_DAYS = 123;

/**
 * What breaks a workshop series' rules (the backend's models.series_problems): from MIN to MAX sessions, each with a
 * real date and its two times (HH:MM or null), in order without repeats, the last at most MAX_SERIES_DAYS days in all
 * after the first; `date` the first session's and `end_date` the last's.
 */
function seriesProblems(event) {
  const sessions = event.sessions;
  if (!Array.isArray(sessions)) return ["sessions must be a list or null"];
  const problems = [];
  if (sessions.length < MIN_SERIES_SESSIONS || sessions.length > MAX_SERIES_SESSIONS) {
    problems.push(`${sessions.length} sessions: ${MIN_SERIES_SESSIONS} to ${MAX_SERIES_SESSIONS} expected`);
  }
  const dates = sessions.map((session) => session?.date);
  if (!dates.every(isDate)) problems.push("a session without a valid date");
  else if (dates.some((date, index) => index > 0 && date <= dates[index - 1])) problems.push("sessions out of order or repeated");
  else if (dates.length && daysFrom(dates[0], dates.at(-1)) + 1 > MAX_SERIES_DAYS) {
    problems.push(`sessions over more than ${MAX_SERIES_DAYS} days`);
  }
  for (const session of sessions) {
    const times = [session?.start_time, session?.end_time];
    if (times.some((time) => time === undefined || (time !== null && !TIME.test(time)))) {
      problems.push(`bad times in the session of ${session?.date}: HH:MM or null`);
    }
  }
  if (sessions.length && (event.date !== dates[0] || event.end_date !== dates.at(-1))) {
    problems.push("date and end_date must be the first and last sessions' dates");
  }
  return problems;
}

/**
 * What in `events` and `meta` (events.json and meta.json, parsed) breaks the contract, one line each: none, they're
 * fine. `fileExists(path)` says whether a flyer or a clip (a path relative to data/) is there.
 */
export function checkData(events, meta, fileExists) {
  const problems = [];
  const check = (ok, where, message) => ok || problems.push(`${where}: ${message}`);

  check(meta.schema_version === 1, "meta.json", `schema_version ${meta.schema_version}, expected 1`);
  check(isString(meta.generated_at) && !Number.isNaN(Date.parse(meta.generated_at)), "meta.json", "bad generated_at");
  check(
    meta.accounts === undefined || (isStringList(meta.accounts) && meta.accounts.every((account) => ACCOUNT.test(account))),
    "meta.json",
    "accounts must be a list of usernames",
  );

  check(Array.isArray(events), "events.json", "must be an array");
  const seen = new Set();
  for (const [index, event] of (Array.isArray(events) ? events : []).entries()) {
    const at = `events[${index}] ${event?.id ?? ""}`;
    check(isString(event.id) && ID.test(event.id), at, "id must be lowercase words joined by hyphens");
    check(!seen.has(event.id), at, "duplicate id");
    seen.add(event.id);
    check(isString(event.title), at, "missing title");
    check(EVENT_TYPES.includes(event.event_type), at, `unknown event_type ${event.event_type}`);
    check(event.is_recurring === false, at, "recurring events are never stored");
    check(isStringList(event.styles), at, "styles must be a list of strings");
    for (const style of event.styles ?? []) check(STYLES.includes(style), at, `unknown style "${style}"`);
    for (const field of ["organizer", "venue", "address", "area", "weekday", "contact"]) {
      check(isNullableString(event[field]), at, `${field} must be a string or null`);
    }
    check(isDate(event.date), at, `bad date ${event.date}`);
    // A workshop series: its sessions' rules instead of the days' limit (its end_date is its last session).
    if (event.sessions != null) {
      for (const problem of seriesProblems(event)) check(false, at, `bad sessions: ${problem}`);
    } else if (event.end_date != null) {
      // Over several consecutive days: the last one, after `date` and at most MAX_EVENT_DAYS in all.
      const days = isDate(event.end_date) && isDate(event.date) ? daysFrom(event.date, event.end_date) + 1 : NaN;
      check(days > 1 && days <= MAX_EVENT_DAYS, at, `bad end_date ${event.end_date}: after date, ${MAX_EVENT_DAYS} days at most`);
    }
    for (const field of ["start_time", "end_time"]) {
      check(event[field] === null || TIME.test(event[field]), at, `bad ${field} ${event[field]}`);
    }
    check(Array.isArray(event.prices), at, "prices must be a list");
    for (const price of event.prices ?? []) {
      check(isString(price.label) && Number.isInteger(price.amount_cop) && price.amount_cop >= 0, at, "bad price");
      check(isNullableString(price.condition), at, "price condition must be a string or null");
    }
    check(isStringList(event.artists) && isStringList(event.activities) && isStringList(event.doubts), at, "bad lists");
    check(CONFIDENCE.includes(event.confidence), at, `bad confidence ${event.confidence}`);
    check(isString(event.account) && ACCOUNT.test(event.account), at, `bad account ${event.account}`);
    check(Array.isArray(event.media) && event.media.length > 0, at, "needs at least one post in media");
    for (const media of event.media ?? []) {
      check(isString(media.post_id) && isString(media.permalink), at, "media needs post_id and permalink");
      check(MEDIA_TYPES.includes(media.media_type), at, `bad media_type ${media.media_type}`);
      if (media.media_type === "STORY") {
        check(isProfile(media.permalink), at, `bad permalink ${media.permalink}: a story links to its account's profile`);
        check(STORY_ID.test(media.post_id ?? ""), at, `bad post_id ${media.post_id}: a story's is story-<hash>`);
      } else {
        check(PERMALINK.test(media.permalink ?? ""), at, `bad permalink ${media.permalink}`);
      }
      check(isString(media.published) && !Number.isNaN(Date.parse(media.published)), at, "bad published time");
      check(isNullableString(media.caption), at, "caption must be a string or null");
      if (media.flyer != null) {
        check(FLYER.test(media.flyer), at, `bad flyer path ${media.flyer}`);
        check(fileExists(media.flyer), at, `flyer file missing: ${media.flyer}`);
      }
      if (media.preview != null) {
        check(PREVIEW.test(media.preview), at, `bad clip path ${media.preview}`);
        check(fileExists(media.preview), at, `clip file missing: ${media.preview}`);
      }
      check(media.slides == null || (Number.isInteger(media.slides) && media.slides > 0), at, "slides must be a count");
    }
  }

  // Sorted by date, then start time: the site groups and picks days assuming this order.
  const order = (event) => `${event.date ?? ""} ${event.start_time ?? ""}`;
  for (let index = 1; index < (Array.isArray(events) ? events.length : 0); index++) {
    check(order(events[index - 1]) <= order(events[index]), `events[${index}] ${events[index].id}`, "events.json isn't sorted by date and time");
  }
  return problems;
}

// Run as a command (not imported by the tests).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dataDir = new URL("../../data/", import.meta.url);
  const read = (file) => JSON.parse(readFileSync(new URL(file, dataDir), "utf8"));
  const events = read("events.json");
  const problems = checkData(events, read("meta.json"), (file) => existsSync(new URL(file, dataDir)));
  if (problems.length) {
    console.error(`data/ doesn't match the data contract (docs/DATA.md):\n  ${problems.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`data/ OK: ${events.length} events.`);
}
