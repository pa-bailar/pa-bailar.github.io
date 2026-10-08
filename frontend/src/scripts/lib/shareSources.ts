// What each share button of the list shares (views/sharing.ts draws and sends it): a near period as it's on screen
// ("Este finde en Bogotá", with the filters in use), and the visitor's plans in Guardados. Pure, so it's tested
// (tests/shareSources.test.ts).

import { type AgendaGroup, listedDay } from "../state";
import type { AppState, DanceEvent } from "../types";
import { lastDay, shownDay } from "./dates";
import { dateRangeLabel, styleLabel, typeLabel } from "./format";
import { PERIOD_SHARE_TITLES, periodShareText, plansShareText } from "./shareText";

/** What a list's share button shares (data-share="<key>"). */
export interface ShareSource {
  title: string; // the image's title: "Este finde en Bogotá"
  subtitle: string; // "Viernes 2 al domingo 4 de octubre · Salsa"
  text: string; // the message
  events: DanceEvent[];
}

type Filters = Pick<AppState, "types" | "styles" | "query">;

/** What narrows the list, for a shared image's subtitle: "Salsa, Bachata", "Talleres", «búsqueda». (The period is
 * the title.) */
export function filtersLabel({ types, styles, query }: Filters): string {
  return [types.map(typeLabel).join(", "), styles.map(styleLabel).join(", "), query.trim() ? `«${query.trim()}»` : ""]
    .filter(Boolean)
    .join(" · ");
}

export interface ShareSourcesInput {
  /** The list's periods, as on screen. */
  groups: AgendaGroup[];
  state: Filters & Pick<AppState, "dates" | "view">;
  /** The saved events still to come, in the list's order. */
  plans: DanceEvent[];
  /** Each plan's link in the message. */
  planUrl: (event: DanceEvent) => string;
}

/** Each share button's content, by its key: `periodo-<period>` for the near periods, `planes` in Guardados. */
export function shareSources({ groups, state, plans, planUrl }: ShareSourcesInput): Map<string, ShareSource> {
  const sources = new Map<string, ShareSource>();
  const filters = filtersLabel(state);
  for (const group of groups) {
    const title = PERIOD_SHARE_TITLES[group.key];
    const days = group.events.map((event) => listedDay(event, state)); // as listed: an event under way is today's
    const first = days[0];
    const last = days.at(-1);
    if (!title || !first || !last) continue;
    sources.set(`periodo-${group.key}`, {
      title,
      subtitle: [dateRangeLabel(first, last), filters].filter(Boolean).join(" · "),
      text: periodShareText(filters ? `${title} · ${filters}` : title, group.events),
      events: group.events,
    });
  }
  const [firstPlan] = plans;
  const lastPlanDay = plans.map(lastDay).sort().at(-1); // the plans' last day: an event over several days may end last
  if (state.view === "saved" && firstPlan && lastPlanDay) {
    sources.set("planes", {
      title: "Mis planes para bailar",
      subtitle: dateRangeLabel(shownDay(firstPlan), lastPlanDay),
      text: plansShareText(plans, planUrl),
      events: plans,
    });
  }
  return sources;
}
