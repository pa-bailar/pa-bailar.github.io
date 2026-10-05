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

Requires Node.js 24 (`.nvmrc`). No keys or `.env` file are needed: the build reads only public data (the deploy
passes it the version and the last check time, `PUBLIC_VERSION` and `PUBLIC_CHECKED_AT`). From `frontend/`:

```bash
npm ci          # first time
npm run dev     # local preview at http://localhost:4321
npm run check   # data format + type check + color contrast (WCAG AA) + CSS custom properties
npm test        # unit tests (Vitest)
npm run build   # static site in frontend/dist/ (fails if a page breaks its Content Security Policy)
npm run preview # the build at http://localhost:4321, with the policy (dev mode doesn't apply it)
```

Besides the home page (the list, `/`), the calendar's own address (`/calendario/`) and Guardados' (`/guardados/`, not
indexed), each the same page opening on that view, the build makes one page per event (`/evento/<id>/`: shared links point there,
and it forwards browsers to the home page with the event's details open over the list, unless it already passed), a link-preview image per event
(`/og/<id>.jpg`, 1200×630: the flyer with the date, title, place and price, drawn with the fonts in
`frontend/src/assets/fonts/og/`) and a calendar feed (`/calendario.ics`, no longer linked; kept for existing
subscriptions). The build fails if an event's preview is missing or weighs over 280 KB.

## Workflows

| Workflow | When | What |
|---|---|---|
| `ci` | Every pull request | PR title format, data format check, type check, color contrast, CSS custom properties, tests, build. The required check on `main`. |
| `deploy` | Push to `main`, a backend sweep that changed nothing, or *Run workflow* | Checks and builds the site, publishes it to GitHub Pages, then tags the new version and publishes its release (see [Versions](#versions)) |

The workflows use only GitHub's own actions (`actions/*`), by major version tag (`@v7`): GitHub maintains them
and moves the tag only for compatible releases. A third-party action would be pinned to a full commit SHA instead.

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

Once a deploy is live, a new version is tagged (`v1.3.0`) and published as a
[GitHub Release](https://github.com/pa-bailar/pa-bailar.github.io/releases) listing its changes, one line
per PR. The footer shows "versión 1.3.0", linked to its release. `ci` rejects a PR whose title doesn't
follow the format, so no change goes uncounted.

## Visit statistics

[GoatCounter](https://jzamora9.goatcounter.com) (free, no cookies, no consent banner needed): page
visits, each event whose details were opened, where its details were opened from (`detalles-tarjeta`, `detalles-boton`,
`detalles-enlace`; `detalles-linea` is retired), and clicks as events named `click-<name>` (`data-track="<name>"`,
`frontend/src/scripts/lib/analytics.ts`): Instagram (the details' Instagram button: `click-ver-video`, `click-ver-carrusel`, `click-ver-publicacion`; the viewer's "Abrir en Instagram": `click-instagram-desde-visor`, `click-instagram-perfil-desde-visor`), an account's @ (`click-perfil-tarjeta`, `-detalle`, `-organiza`, `-historia`, `-fuentes`, and `click-contacto-instagram`), the other contact links (WhatsApp…), "Cómo llegar", the other posts
(`click-ver-publicaciones`), sharing, saving,
installing and reports, and the bar at the bottom (`click-barra-eventos`, `-calendario`, `-buscar`, `-guardados`,
`-filtros`). Shared
links carry `utm_source=compartido`. Local testing (localhost) isn't counted.

## Contributing

Work on a branch (`feat/...`, `fix/...`), open a pull request and title it with
[Conventional Commits](https://www.conventionalcommits.org/): the title becomes the commit on `main` and
sets the next version ([Versions](#versions)).
