# Pa' Bailar · Bogotá

**https://pa-bailar.github.io**: one-time dance events in Bogotá (socials and workshops) collected
from the Instagram accounts of the city's dance academies, on one page with a calendar.

```
frontend/   Astro site (static), deployed to GitHub Pages
data/       events.json + flyers/ + previews/, updated by pull requests from the backend
docs/       architecture (ARCHITECTURE.md), design system (DESIGN.md) and data contract (DATA.md)
```

The data comes from a separate, private backend (Instagram → Gemini). It sweeps twice a day (9 AM and
9 PM Bogotá time, each account about once a day) and opens a pull request here when the events change.
This repository only builds and publishes the site.

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

Besides the home page, the build makes one page per event (`/evento/<id>/`: shared links point there,
and it forwards browsers to the home page with the event open), a JPEG link preview per event
(`/og/<id>.jpg`) and a calendar feed (`/calendario.ics`, no longer linked; kept for existing subscriptions).

## Workflows

| Workflow | When | What |
|---|---|---|
| `ci` | Every pull request | PR title format, data format check, type check, color contrast, tests, build. The required check on `main`. |
| `deploy` | Push to `main`, a backend sweep that changed nothing, or *Run workflow* | Tags the new version and publishes its release (see [Versions](#versions)), builds the site and publishes it to GitHub Pages |

`main` is protected (`protect-main` ruleset): changes only arrive through squash-merged pull requests
that pass `ci`; force pushes and deletion are blocked. The data PRs carry the `data` label and
merge themselves when `ci` passes.

## Versions

Each merged pull request's title (Conventional Commits) sets the site's next version
([Semantic Versioning](https://semver.org/)); `frontend/scripts/release.mjs` works it out:

| Title | Version |
|---|---|
| `feat(...): …` | minor: 1.2.0 → 1.3.0 |
| `fix`, `perf`, `refactor`, `copy`, `style`, `revert` | patch: 1.2.0 → 1.2.1 |
| `feat!: …`, or `BREAKING CHANGE:` in the description | major: 1.2.0 → 2.0.0 |
| `docs`, `chore` (the data PRs), `ci`, `test`, `build` | none: visitors see nothing new |

On every deploy, a new version is tagged (`v1.3.0`) and published as a
[GitHub Release](https://github.com/pa-bailar/pa-bailar.github.io/releases) listing its changes, one line
per PR. The footer shows "versión 1.3.0", linked to its release. `ci` rejects a PR whose title doesn't
follow the format, so no change goes uncounted.

## Visit statistics

[GoatCounter](https://jzamora9.goatcounter.com) (free, no cookies, no consent banner needed): page
visits, each event opened in the viewer, and clicks on Instagram, the contact links (WhatsApp…),
"Cómo llegar", sharing, saving, installing and reports (`data-track`, `frontend/src/scripts/lib/analytics.ts`). Shared
links carry `utm_source=compartido`. Local testing (localhost) isn't counted.

## Contributing

Work on a branch (`feat/...`, `fix/...`), open a pull request and title it with
[Conventional Commits](https://www.conventionalcommits.org/): the title becomes the commit on `main` and
sets the next version ([Versions](#versions)).
