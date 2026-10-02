// Checks data/events.json and data/meta.json against the data contract (docs/DATA.md) before the site
// is built. The backend that writes them lives in another (private) repository, so this is where a
// mismatch is caught: CI fails instead of the site breaking.
// Usage: node scripts/check-data.mjs   (exits 1 on any problem; run by `npm run check`)

import { existsSync, readFileSync } from "node:fs";

const dataDir = new URL("../../data/", import.meta.url);
const read = (file) => JSON.parse(readFileSync(new URL(file, dataDir), "utf8"));

const EVENT_TYPES = ["social", "workshop", "concert", "festival", "competition", "show", "other"];
const MEDIA_TYPES = ["IMAGE", "CAROUSEL_ALBUM", "VIDEO"];
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

const problems = [];
const check = (ok, where, message) => ok || problems.push(`${where}: ${message}`);
const isString = (value) => typeof value === "string" && value.length > 0;
const isNullableString = (value) => value === null || typeof value === "string";
const isStringList = (value) => Array.isArray(value) && value.every((item) => typeof item === "string");

const meta = read("meta.json");
check(meta.schema_version === 1, "meta.json", `schema_version ${meta.schema_version}, expected 1`);
check(isString(meta.generated_at) && !Number.isNaN(Date.parse(meta.generated_at)), "meta.json", "bad generated_at");

const events = read("events.json");
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
  check(DATE.test(event.date ?? "") && !Number.isNaN(Date.parse(event.date)), at, `bad date ${event.date}`);
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
  check(isString(event.account), at, "missing account");
  check(Array.isArray(event.media) && event.media.length > 0, at, "needs at least one post in media");
  for (const media of event.media ?? []) {
    check(isString(media.post_id) && isString(media.permalink), at, "media needs post_id and permalink");
    check(MEDIA_TYPES.includes(media.media_type), at, `bad media_type ${media.media_type}`);
    check(isString(media.published) && !Number.isNaN(Date.parse(media.published)), at, "bad published time");
    check(isNullableString(media.caption), at, "caption must be a string or null");
    if (media.flyer) check(existsSync(new URL(media.flyer, dataDir)), at, `flyer file missing: ${media.flyer}`);
  }
}

// Sorted by date, then start time: the site groups and picks days assuming this order.
const order = (event) => `${event.date ?? ""} ${event.start_time ?? ""}`;
for (let index = 1; index < (Array.isArray(events) ? events.length : 0); index++) {
  check(order(events[index - 1]) <= order(events[index]), `events[${index}] ${events[index].id}`, "events.json isn't sorted by date and time");
}

if (problems.length) {
  console.error(`data/ doesn't match the data contract (docs/DATA.md):\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log(`data/ OK: ${events.length} events.`);
