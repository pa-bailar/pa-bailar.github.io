# Pa' Bailar · Bogotá

**https://pa-bailar.github.io**: one-time dance events in Bogotá (socials and workshops) collected
from the Instagram accounts of the city's dance academies, on one page with a calendar.

```
frontend/   Astro site (static), deployed to GitHub Pages
data/       events.json + flyers/, updated by a daily pull request from the backend
docs/       architecture (ARCHITECTURE.md), design system (DESIGN.md) and data contract (DATA.md)
```

The data comes from a separate, private backend (Instagram → Gemini) that opens a pull request here
every day with the new events. This repository only builds and publishes the site.

**How the site gets its data, is built, published and works in the browser, with diagrams:
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).**

## Develop

Requires Node.js 24 (`.nvmrc`). From `frontend/`:

```bash
npm ci          # first time
npm run dev     # local preview at http://localhost:4321
npm run check   # data format + type check + color contrast (WCAG AA)
npm test        # unit tests (Vitest)
npm run build   # static site in frontend/dist/
```

Besides the home page, the build makes one page per event (`/evento/<id>/`, what shared links open),
a JPEG link preview per event (`/og/<id>.jpg`) and a subscribable calendar feed (`/calendario.ics`).

## Workflows

| Workflow | When | What |
|---|---|---|
| `ci` | Every pull request | Data format check, type check, color contrast, build. The required check on `main`. |
| `deploy` | Push to `main`, the backend's daily sweep, or *Run workflow* | Builds the site and publishes it to GitHub Pages |

`main` is protected (`protect-main` ruleset): changes only arrive through squash-merged pull requests
that pass `ci`; force pushes and deletion are blocked. The daily data PRs carry the `data` label and
merge themselves when `ci` passes.

## Visit statistics

[GoatCounter](https://jzamora9.goatcounter.com) (free, no cookies, no consent banner needed): page
visits, each event opened in the viewer, and clicks on Instagram, WhatsApp, calendar, "Cómo llegar"
and the calendar subscription (`data-track`, `frontend/src/scripts/lib/analytics.ts`). Shared WhatsApp
links carry `utm_source=whatsapp`. Local testing (localhost) isn't counted.

## Contributing

Work on a branch (`feat/...`, `fix/...`), open a pull request and use
[Conventional Commits](https://www.conventionalcommits.org/) messages.
