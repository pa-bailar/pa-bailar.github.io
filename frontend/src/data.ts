// The data the backend publishes (../data), typed once for every page. CI checks the files against the
// contract (scripts/check-data.mjs) before this cast is trusted. Typed even when events.json is empty: an
// empty list would otherwise be inferred as never[] and fail the type check.
import rawEvents from "../../data/events.json";
import rawMeta from "../../data/meta.json";
import type { DanceEvent, Meta } from "./scripts/types";

export const events = rawEvents as unknown as DanceEvent[];
export const meta = rawMeta as Meta;

/** The academies that have events, for the footer's source list. */
export const accounts = [...new Set(events.map((event) => event.account))].sort();
