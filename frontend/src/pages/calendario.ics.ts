// Subscribable calendar feed (/calendario.ics, iCalendar RFC 5545), rebuilt with every deploy.
// Subscribed calendars refresh on their own schedule (Google: every 12–24 h). Written by lib/calendarFeed.ts.

import type { APIRoute } from "astro";
import { events } from "../data";
import { calendarFeed } from "../scripts/lib/calendarFeed";

const HOST = new URL(import.meta.env.SITE ?? "https://pa-bailar.github.io").host;

export const GET: APIRoute = () => {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, ""); // 20261002T110000Z
  return new Response(calendarFeed(events, stamp, HOST), {
    headers: { "Content-Type": "text/calendar; charset=utf-8" },
  });
};
