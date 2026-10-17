// The unit tests again, with the clock months ahead on a Saturday at 23:30 Bogotá (tests/shiftedClock.ts): a test
// that only passes on today's date fails here, on the PR that adds it, instead of later on a sweep's data PR (17 Oct
// 2026). Saturday for the weekday with an accent ("sáb"), 23:30 for the night before a new day in Bogotá.
import { spawnSync } from "node:child_process";

const DAYS_AHEAD = 120;
const day = new Date(Date.now() + DAYS_AHEAD * 86_400_000);
day.setUTCDate(day.getUTCDate() + ((6 - day.getUTCDay() + 7) % 7)); // the next Saturday
const at = `${day.toISOString().slice(0, 10)}T23:30:00-05:00`;

console.log(`Unit tests with the clock at ${at} (Bogotá)`);
const run = spawnSync("npx", ["vitest", "run"], { stdio: "inherit", shell: true, env: { ...process.env, CLOCK_AT: at } });
process.exit(run.status ?? 1);
