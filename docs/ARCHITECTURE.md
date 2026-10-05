# Pa' Bailar: architecture (site)

How the site at <https://pa-bailar.github.io> gets its data, how it's built and published, and how it
works in the visitor's browser. This repository (`pa-bailar/pa-bailar.github.io`, public) holds the
site and the published data.

The collector that produces the data (Instagram → Gemini) is a separate, private repository
(`pa-bailar/backend`). Its `docs/ARCHITECTURE.md` covers the whole system's infrastructure in depth:
external services, the sweep, quotas, monitoring.

Related documents in this repository:
- [`DATA.md`](DATA.md): the data contract, every field of `events.json`.
- [`DESIGN.md`](DESIGN.md): the design system, every visual rule.

Last reviewed: 5 October 2026.

Contents:

1. [The site in one picture](#1-the-site-in-one-picture)
2. [How data reaches the site](#2-how-data-reaches-the-site)
3. [The build: from data/ to static files](#3-the-build-from-data-to-static-files)
4. [Publishing: workflows and protection](#4-publishing-workflows-and-protection)
5. [In the browser](#5-in-the-browser)
6. [Dates, time zones and holidays](#6-dates-time-zones-and-holidays)
7. [Third-party services](#7-third-party-services)
8. [Quality checks](#8-quality-checks)
9. [Code map](#9-code-map)
10. [Working on the site](#10-working-on-the-site)

---

## 1. The site in one picture

The site is **fully static**: HTML, CSS, a little JavaScript and images. It's built by Astro, served by
GitHub Pages, and has no server, database or API of its own. All of its data is in `data/`, which the
backend updates through pull requests.

```mermaid
flowchart LR
    subgraph Backend["pa-bailar/backend (private)"]
        SW["sweep, twice a day<br/>Instagram → Gemini"]
    end

    subgraph Repo["pa-bailar/pa-bailar.github.io (this repository)"]
        PR["data PR<br/>(pa-bailar-bot, label data)"]
        CI["ci: data contract, types,<br/>contrast, CSS, tests, build"]
        MAIN[("main<br/>data/ + frontend/")]
        DEP["deploy: astro build →<br/>GitHub Pages"]
    end

    PAGES["GitHub Pages<br/>pa-bailar.github.io"]
    VIS(("Visitors"))
    GC["GoatCounter<br/>(visit statistics)"]
    GF["Google Fonts"]

    SW -- "twice a day, when events changed" --> PR
    PR --> CI -- "pass: auto-merge (squash)" --> MAIN
    MAIN -- "push to main" --> DEP --> PAGES --> VIS
    SW -. "no changes: start deploy<br/>with the check time" .-> DEP
    VIS -. "page views, clicks" .-> GC
    VIS -. "fonts" .-> GF
```

| Folder | What | Who writes it |
|---|---|---|
| `data/` | `events.json`, `meta.json`, `flyers/*.webp`, `previews/*.mp4` (videos' clips). Also the site's public folder: flyers and clips are served as-is | The backend, only through data PRs |
| `frontend/` | The Astro site: pages, components, scripts, styles, tests | People, through PRs |
| `docs/` | Architecture (this file), data contract, design system | People |
| `.github/workflows/` | `ci` and `deploy` | People |

---

## 2. How data reaches the site

The backend's sweep runs twice a day, at 9 AM and 9 PM Bogotá time (cron-job.org starts its workflow), and
reads each account about once a day. It works on a checkout of this repository and writes `data/` exactly
as described in [`DATA.md`](DATA.md).

```mermaid
sequenceDiagram
    autonumber
    participant B as Backend sweep (GitHub Actions)
    participant R as This repository
    participant CI as ci workflow
    participant D as deploy workflow
    participant P as GitHub Pages

    B->>R: check out main (anonymous: the repository is public)
    B->>B: write data/events.json, data/meta.json, data/flyers/, data/previews/
    alt events.json or flyers changed
        B->>R: push branch data/sweep-<day>-<run> (as pa-bailar-bot)
        B->>R: open PR "chore(data): daily sweep <day>", label data, enable auto-merge
        R->>CI: pull_request
        CI->>CI: check-data, astro check, contrast, CSS properties, tests, build
        CI-->>R: ci passed
        R->>R: squash merge (ruleset: ci required), delete branch
        R->>D: push to main
        D->>P: build and publish
    else nothing changed
        B->>D: workflow_dispatch with checked_at = time of the check
        D->>P: build and publish ("Actualizado el …" stays current)
    end
```

Notes:
- **Only real changes open a PR.** `meta.json` is rewritten on every run, but only events or flyers
  count as a change. Days without news don't fill the history with commits.
- **The bot's PRs are checked like anyone's.** The backend uses a GitHub App (pa-bailar-bot), not the
  default workflow token, so its PR triggers this repository's `ci`. A PR from the default token
  wouldn't trigger workflows.
- **A data PR can't break the site.** `check-data.mjs` checks every field against the contract, and the
  build must succeed before the PR can merge. If the backend ever writes something the site doesn't
  understand, the data PR stays open and the backend's run reports it.
- **"Actualizado el …"** in the header shows when the data was last **checked**, not when it last
  changed:
  - on days without changes, the backend starts the deploy with `checked_at`, which reaches the build as
    `PUBLIC_CHECKED_AT`;
  - otherwise, the build uses `meta.json`'s `generated_at`.
- **Old events leave on their own:** the backend deletes events dated more than 60 days ago, together
  with their flyers. Past events still in the data aren't shown in "Próximos", but their pages and the
  calendar keep them.

---

## 3. The build: from data/ to static files

`npm run build` (Astro 7). `astro.config.mjs` sets:
- the site's URL (`https://pa-bailar.github.io`);
- **`publicDir: "../data"`**, so the data folder is served at the site's root: `flyers/123-0.webp`
  becomes `https://pa-bailar.github.io/flyers/123-0.webp`;
- the `@astrojs/sitemap` integration;
- `import.meta.env.DATA_DIR`, the data folder's absolute path, so the build finds the flyers wherever
  it's started from, and `import.meta.env.ASSETS_DIR` (`src/assets/`: the home page's link preview);
- the Content Security Policy (`security.csp`, section 3.3) and the `csp-meta` integration that checks it;
- the `og-check` integration: every event's link preview exists, is 1200×630 and light enough (section 3.4);
- the `sw-precache` integration: writes the build's file names (`/_astro/`) into `sw.js`, which stores them when it
  installs (section 3.2);
- `markdown.syntaxHighlight: false`: there's no Markdown, and Shiki's highlighting needs `style` attributes,
  which the policy blocks.

Astro is pinned to its minor version (`~7.3.5` in `package.json`, patches only): the policy's `<meta>` and
hashes come from Astro's `security.csp`, so a minor update can change what `csp-meta.mjs` reads. Update it on
purpose, then build and check the console.

### 3.1 Reading the data: `src/data.ts`

```mermaid
flowchart LR
    EJ["data/events.json"] --> DT["src/data.ts"]
    MJ["data/meta.json"] --> DT
    FL["data/flyers/*.webp"] -- "sharp: width × height" --> DT
    DT --> EV["events: DanceEvent[]<br/>(each flyer with its size)"]
    DT --> ME["meta: Meta"]
    DT --> AC["accounts: every account the sweep reads"]
```

- **Typed once:** the JSON is cast to the types in `src/scripts/types.ts`, which mirror the backend's
  models. CI checked the files against the contract first.
- **Flyer versions:** each flyer's media item also gets `version`, a short hash of its file (`src/images.ts`,
  `fileVersion`). Flyers are named by post and slide, and the backend makes one again under the same name (a better
  crop, a post read again), so its URL carries the version (`?v=`, `flyerUrl` and `thumbUrl` in `lib/links.ts`; a
  thumbnail's adds the thumbnails' size and quality): a new file is a new URL for browsers and the service worker,
  and every other image keeps its URL (section 3.2, `/sw.js`).
- **Flyer sizes:** each flyer's pixel size is read at build time and added to its media item. Cards then
  show each flyer at its own shape without the page jumping while images load (section 5.4).
- **Build time only:** `data.ts` uses Node (`sharp`, the file system). The browser never imports it; it
  gets the data inside the page.

### 3.2 What the build generates

| Output | Source | What it is |
|---|---|---|
| `/` (`index.html`) | `pages/index.astro` (its body: `components/HomePage.astro`) | The app: header, toolbar, jump bar, both views, details drawer, filter sheet. Every event is embedded as JSON (`<script type="application/json" id="events-data">`), and the browser renders the cards and calendar from it. The preview image is the brand's own (`/og/sitio.jpg`), not an event's flyer |
| `/calendario/` | `pages/calendario/index.astro` | The same app opening on the calendar (`HomePage.astro` with `view="calendar"`; `main.ts` reads the address with `viewOfPath`), so a reload or a shared link stays on it. Each view's title and description: `lib/viewTitles.ts` |
| `/evento/<id>/` | `pages/evento/[id].astro` | One page per event: where a shared link points. A browser is forwarded to the home page with the event open over the list, unless it's past (section 5.3). Rendered at build time: the flyer, then the same details as the drawer. Includes the link preview's tags (section 3.4) and schema.org `Event` data for search engines (a workshop series: from its first session to its last, each session a `subEvent`, section 6) |
| `/og/<id>.jpg` | `pages/og/[id].jpg.ts` | Each event's link-preview image: 1200×630, the flyer with the date, title, place and price (section 3.4) |
| `/og/sitio.jpg` | `pages/og/sitio.jpg.ts` | The home page's link preview (1200×630): stripes, "Pa' Bailar", the tagline and the record. Drawn once with the site's fonts by `scripts/og-site.html` and stored as `src/assets/og-site.jpg` |
| `/thumbs/<flyer>.webp` | `pages/thumbs/[name].webp.ts` | A 160 px square thumbnail of every flyer: the sheet with an event's posts, the summarized periods' row of small flyers, the 404 page and a shared list's image (`lib/shareCard.ts`). A few KB each instead of the 100–200 KB flyer, so they show at once on a phone |
| `/calendario.ics` | `pages/calendario.ics.ts` | A subscribable calendar feed (iCalendar, RFC 5545) with every event (its description: the time, or an event's days when it runs over several, `calendarDescription`), and a workshop series as one entry per session (`lib/calendarFeed.ts`, section 6). Rebuilt with the site, so subscribed calendars refresh on their own. No longer linked from the footer (it added little); kept so existing subscriptions keep working |
| `/manifest.webmanifest` | `pages/manifest.webmanifest.ts` | What lets a phone install the site like an app: name, colors, icons, full screen |
| `/icons/<name>.png` | `pages/icons/[name].png.ts` | The app icons (192, 512, maskable 512, Apple touch icon), made from SVG at build time |
| `/sw.js` | `pages/sw.js.ts` | The service worker: makes it installable and opens it offline with the last events (pages network first; flyers and build files cached). Installing it stores both pages of the app (`/` and `/calendario/`) and every build file (`/_astro/`, listed after the build by `scripts/sw-precache.mjs`), so it opens offline from the first visit and after each deploy; offline, an address it never stored gets the home page. A new version per build for pages and build files. Flyers and thumbnails go in one image cache kept across builds (`images`, the most recent 300, `IMAGE_LIMIT`), by their URL with its version (`?v=`, section 3.1): a flyer made again under its name is a new URL, fetched once, and replaces its older copies; offline, an older copy shows. (Until October 2026 the cache's name carried a hash of every flyer, so nearly every sweep's new flyer dropped a returning visitor's whole image cache; those `images-<hash>` caches are deleted once) |
| `/sitemap-index.xml` | `@astrojs/sitemap` | Home, the calendar and every event page, for search engines (the 404 page is excluded) |
| `/404.html` | `pages/404.astro` | "Este evento ya pasó o no existe" (most missing addresses are old event links, whose events were deleted), the first four upcoming events as of the build, and a link home. Any other address gets "Esta página no existe" (a small script reads the path) |
| `/flyers/*.webp` | `data/flyers/` (public folder) | The flyers, copied as they are |
| `/previews/*.mp4` | `data/previews/` (public folder) | Videos' clips (6 silent seconds), copied as they are |

```mermaid
flowchart TD
    D["src/data.ts<br/>(events + flyer sizes and versions)"] --> IDX["index.astro → /"]
    D --> EVT["evento/[id].astro → /evento/&lt;id&gt;/"]
    D --> OG["og/[id].jpg.ts → /og/&lt;id&gt;.jpg<br/>(linkPreviewImage.ts, section 3.4)"]
    D --> CAL["calendario/index.astro → /calendario/<br/>(the same app, on the calendar)"]
    D --> ICS["calendario.ics.ts → /calendario.ics"]
    D --> TH["thumbs/[name].webp.ts → /thumbs/&lt;flyer&gt;.webp"]
    IDX --> SM["sitemap-index.xml"]
    CAL --> SM
    EVT --> SM
    PUB["data/ (public folder)"] --> FLY["/flyers/*.webp, /previews/*.mp4"]
```

**Shared code between build and browser:** the views in `src/scripts/` produce HTML strings, so the same
code renders an event's detail in the browser (the details drawer) and at build time (the event page).

### 3.3 The Content Security Policy

GitHub Pages can't send headers, so the policy is a `<meta http-equiv="content-security-policy">` in every
page. It tells the browser what the page may load and run; anything else (a script or style slipped into an
event's text, a link to another site's script) is blocked.

| Directive | Allows | For |
|---|---|---|
| `default-src` | `'self'` | Anything not listed below: only the site's own files |
| `script-src` | `'self'`, `https://www.instagram.com`, hashes | The build's bundles, our copy of GoatCounter's `count.js`, Instagram's `embed.js`; the inline scripts by their hash |
| `style-src` | `'self'`, `https://fonts.googleapis.com`, hashes | The CSS files, Google Fonts' stylesheet, the styles Astro inlines (by hash) |
| `style-src-attr` | `'unsafe-hashes'` + one hash | No `style=""` attributes, except the fixed one `embed.js` gives Instagram's player |
| `img-src` | `'self'`, `data:`, `https://jzamora9.goatcounter.com` | Flyers, thumbnails, icons; the favicon (a `data:` SVG); GoatCounter's fallback image |
| `media-src` | `'self'` | The videos' clips (`previews/`) |
| `font-src` | `https://fonts.gstatic.com` | Google Fonts |
| `connect-src` | `'self'`, `https://jzamora9.goatcounter.com` | GoatCounter's counts (`sendBeacon`) |
| `frame-src` | `https://www.instagram.com` | Instagram's player |
| `worker-src`, `manifest-src` | `'self'` | `sw.js`, `manifest.webmanifest` |
| `object-src`, `base-uri`, `form-action` | `'none'` | No plugins, no `<base>`, no forms |

- **Where it's set:** `astro.config.mjs` (`security.csp`). Astro adds the hashes of the scripts and styles it
  inlines. Ours are two inline scripts, the theme before first paint (`src/themeScript.ts`, in `BaseLayout.astro`) and the event pages'
  forward to the app (`evento/[id].astro`), written as strings and added with `allowInlineScript()`
  (`src/csp.ts`), which puts their hash in the page's policy.
- **Checked at every build** (`scripts/csp-meta.mjs`): Astro writes the `<meta>` at the end of `<head>`, where
  it wouldn't cover what comes before it; the integration moves it right after `<meta charset>`. It also fails
  the build if a page has an inline script or `<style>` the policy doesn't allow, any `style=""` attribute, or any
  inline event handler (`onclick=""`, `onerror=""`…).
  So a new inline script needs `allowInlineScript()`, and a style that depends on data is set from a script
  (`element.style`, which the policy allows), like the cards' flyer shape (`applyFlyerRatios`, `eventCard.ts`).
- **What a `<meta>` can't do:** `frame-ancestors` (who may frame the site), `sandbox`, reports and other headers
  need a response header, and GitHub Pages sends none. Other sites can frame the pages; with no accounts or forms,
  that leads nowhere.
- **`npm run dev` doesn't apply it** (Vite's dev server injects scripts). To try it: `npm run build` and
  `npm run preview`, then look for "Content Security Policy" errors in the console.

### 3.4 Link previews

What WhatsApp, Instagram, iMessage, Telegram and Facebook show when an event's link (`/evento/<id>/`) is shared.
They read the page's Open Graph tags (they don't run scripts) and download its image.

```mermaid
flowchart LR
    EV["event (data.ts)"] --> LP["lib/linkPreview.ts<br/>title, description, text on the image, version"]
    LP --> PG["evento/[id].astro<br/>og:title, og:description, og:image?v=…"]
    LP --> IMG["linkPreviewImage.ts<br/>satori (fonts/og) → SVG,<br/>sharp: blurred flyer + JPEG"]
    IMG --> OG["/og/&lt;id&gt;.jpg (1200×630)"]
    PG --> CHK["og-check.mjs, after the build"]
    OG --> CHK
```

- **The text** (`scripts/lib/linkPreview.ts`, pure, tested): the title with the date, "Intensivo Ritmos Cubanos —
  dom 4 oct, 9:00 a. m." (over several days "Level Up Bachata Fusion Congress — 13–15 nov", without the time; a
  workshop series from its first session, "Programa intensivo — 4 sesiones desde dom 8 nov, 2:00 p. m.", and its
  first session's sticker, so a preview kept in a chat for weeks stays true); the
  description, "Taller de salsa cubana · Cra 16 #52-46 · Desde $ 35.000 · Pa' Bailar"; the image's `alt`. Apps
  keep a preview for days, so dates are always real ones, never "Hoy" or "Mañana".
- **The tags** (`BaseLayout.astro`): `og:title`, `og:description`, `og:url`, `og:type`, `og:locale` (`es_CO`),
  `og:site_name`, `og:image` (absolute, with `?v=`), `og:image:width`, `og:image:height`, `og:image:type`,
  `og:image:alt`, and `twitter:card` `summary_large_image` with its title, description and image. Without the size,
  Facebook and WhatsApp may show no image on a link's first share (they haven't downloaded it yet). The home page
  keeps its own image (`/og/sitio.jpg`), with the same tags.
- **The image** (`src/linkPreviewImage.ts`, `pages/og/[id].jpg.ts`): 1200×630 (1.91:1, what every app shows whole;
  a vertical flyer alone gets cropped or shrunk). Its design is in [`DESIGN.md`](DESIGN.md), "Link previews".
  - **Text with the site's fonts, without system fonts:** satori lays out the text and turns it into SVG paths, with
    the TTF files in `src/assets/fonts/og/` (Shrikhand, Instrument Sans 400 and 600, Bodoni Moda Medium Italic, each
    with its SIL Open Font License). The build machine has no fonts, and satori reads neither WOFF2 nor system fonts.
    satori's version is pinned (`package.json`): an update can move text, so check the images after one.
  - **The flyer:** sharp blurs a copy of it for the background of the left half, fits the whole flyer over it with
    a soft shadow, draws the SVG on top and writes a JPEG (quality 84, full color resolution so the red and green
    text stays crisp; a busy flyer that would weigh more than 280 KB is written again at lower quality). A video's
    flyer is its frame, as everywhere. An event without a flyer gets the record of the app icon.
  - **Cost:** about 0.12 s per event: with 77 events (October 2026) the build takes about 10 s more (15 s instead of 5 s), and the
    images weigh about 115 KB each (9 MB in all, from 5 MB for the old 600 px flyers).
- **Corrections reach the apps** (`?v=`): apps cache a preview by its URL, and GitHub Pages can't send cache headers
  (it serves everything with a 10-minute cache). So the image's URL carries a short hash of what it shows
  (`previewVersion`): the days, time, title, place, price, the flyer's file and size, and `PREVIEW_DESIGN_VERSION`
  (bump it when the design changes). A corrected event gets a new URL, which apps fetch again; anything the image
  doesn't show (caption, styles, contact) keeps the old one, so nothing is fetched again for nothing. The page's own
  text (title, description) is read again whenever an app refreshes the link.
- **Checked at every build** (`scripts/og-check.mjs`): every event in `events.json` has its page with all the
  tags, and its `og:image` has a version and points to a file the build made, a 1200×630 JPEG as the tags say,
  under 280 KB (WhatsApp skips preview images over about 300 KB). Otherwise the build fails.
- **Old links:** events are deleted 60 days after they end (section 2), and their pages and images with them. Their
  links then open the 404 page, which says the event passed and lists what's next (section 3.2).

---

## 4. Publishing: workflows and protection

### 4.1 Workflows

| Workflow | Trigger | Steps | Permissions |
|---|---|---|---|
| `ci` | Every pull request (including data PRs, and title edits); manual | The PR title (Conventional Commits, `release.mjs check`). `npm ci`. Then `npm run check`, which is the data contract (`check-data.mjs`), `astro check` (strict TypeScript), color contrast (`check-contrast.mjs`) and the CSS custom properties (`check-css-vars.mjs`). Then `npm test` (Vitest), then `npm run build` | `contents: read` |
| `deploy` | Push to `main` (every merged PR); manual; the backend's sweep on days without changes (with `checked_at`) | **version** job: the version from the commits since the last tag (`release.mjs plan`), and its release notes (an artifact). **build** job: `npm ci`, `npm run check`, `npm run build` (with `PUBLIC_CHECKED_AT` and `PUBLIC_VERSION`), upload the Pages artifact. **deploy** job: publish to GitHub Pages (environment `github-pages`). **release** job, only after a successful deploy and when the commits change the site: tag the version and publish its GitHub Release (`gh release create`). A failed build or deploy tags nothing, and the next run works out the same version again | Version and build: `contents: read` (the build runs npm's install scripts). Deploy: `pages: write`, `id-token: write`. Release: `contents: write` (it runs no npm package, only `gh`) |

- **One deploy at a time:** `concurrency: pages` without cancelling, so two merges in a row publish one
  after the other.
- **Node:** version 24 (`.nvmrc`), with an npm cache keyed on `frontend/package-lock.json`.
- **Versions:** squash merges make each PR one commit on `main`, titled like the PR. `feat` → minor,
  `fix`/`perf`/`refactor`/`copy`/`style`/`revert` → patch, `!` or `BREAKING CHANGE:` → major; `docs`, `chore`
  (data), `ci`, `test`, `build` → no version. The release notes group the PRs (features, fixes, other
  changes); the footer shows the version, linked to its release. The first tag, `v1.0.0`, marks where
  numbering started.

### 4.2 Protection of `main`

The `protect-main` ruleset is active with **no bypass**, for anyone including administrators and the bot:
- changes only arrive through pull requests;
- merges are squash only;
- the `ci` check must pass;
- force pushes and deleting `main` are blocked.

The repository allows auto-merge and deletes merged branches. Data PRs (label `data`) enable auto-merge
when opened, so they merge on their own once `ci` passes.

### 4.3 GitHub Pages

- **Source:** "GitHub Actions" (`build_type: workflow`): Pages serves whatever the `deploy` workflow
  uploads, not a branch.
- **URL:** the repository's name (`pa-bailar.github.io`) makes it the organization's root site:
  `https://pa-bailar.github.io/`.

---

## 5. In the browser

### 5.1 Start-up

```mermaid
sequenceDiagram
    participant H as index.html (or /calendario/)
    participant I as Inline script (head)
    participant M as main.ts start()
    participant V as Views

    H->>I: before first paint
    I->>I: theme: dark if saved, else light
    H->>M: module script after parsing
    M->>M: events = JSON from #events-data
    M->>M: theme toggle, details drawer, posts sheet, media viewer, sharing, install offer, service worker, jump bar, bottom bar, click tracking, save buttons
    M->>M: the view from the address (viewOfPath: /calendario/ is the calendar)
    M->>V: render(): filters, Próximos or Calendario, jump bar, bottom bar
    M->>V: opened on /calendario/: the calendar's home on screen (openedOnCalendar)
    M->>M: a shared link's event (openSharedEvent), then the screens' history (initScreenHistory)
    M->>M: watchDayChange: shown again on another day, draw again (or load again)
```

- **No data request:** the events arrive inside the HTML, so the first render needs no network.
  The flyers load lazily as they come into view.
- **Shown again on another day** (`views/dayChange.ts`, `watchDayChange`): an installed app left open overnight, or a
  tab from yesterday. When the page is shown again (`visibilitychange`, or `pageshow` from the back-forward cache) and
  Bogotá's day isn't the one it was drawn on, the calendar's day and month move to today if they were that day
  (`moveToToday`), and everything is drawn again: "Hoy" is today's, past events leave. More than 6 hours after it
  loaded (`STALE_AFTER_MS`) and online, it loads again instead (`resumeAction`): the events are embedded at build
  time, and the site is rebuilt twice a day.
- **One delegated click listener** in `main.ts` handles every control marked with a `data-*` attribute (`CONTROLS`:
  each attribute with its named handler, tried in order):
  "Cuándo" (`data-when-open`, an option `data-when`, its × `data-when-clear`), "Guardados" (`data-saved-only`), close
  and clear the search, Filtros (`data-open-filters`), a period opened whole (`data-show-period`), a card's posts
  (`data-card-posts`), an event (`data-event`), a view (`data-view`: the bottom bar's Eventos and Calendario, links
  whose plain clicks it takes over; the tabs on wide screens), a filter chip (`data-filter` + `data-value`),
  clear filters, and the calendar's day, month (`data-month-step`) and "Hoy" (`data-today`).

### 5.2 State and rendering

```mermaid
flowchart TD
    ST["AppState (state.ts)<br/>view · types · styles · dates · hideBars ·<br/>query · savedOnly · month · selectedDay"]
    CLICK["Click on a data-* control<br/>(main.ts handleClick)"] --> ST
    ST --> R["render()"]
    R --> F["lib/filterModel.ts → views/filters.ts<br/>the bar's chips and line,<br/>the filter sheet, the toolbar's rows"]
    R --> U["upcomingView.ts<br/>Próximos: events grouped by period"]
    R --> C["calendarView.ts<br/>Calendario: month grid + the day's events"]
    R --> J["jumpBar.ts<br/>phones: the pinned bar, search, keeping your place"]
    J --> WM["whenMenu.ts<br/>the Cuándo menu: open, place, keys, close"]
    R --> BN["bottomNav.ts<br/>phones: the bar at the bottom,<br/>the search field above the keyboard"]
    U --> CARD["eventCard.ts"]
    C --> CARD
    CARD -- "tap" --> DLG["eventDrawer.ts<br/>details drawer over the list"]
    DLG --> DET["eventDetail.ts"]
```

- **The state is a plain object** (`state.ts`), and every change re-renders the visible parts. There's
  no framework: the views return HTML strings, inserted with `innerHTML` after escaping every value from
  the data (`lib/dom.ts`, `escapeHtml`).
- **Filtering** (`matchesFilters`): an event must pass every group (AND), and within the dates, the types and the
  rhythms any choice will do (OR):
  - **Dates** (`dates`, several): periods of the list ("hoy", "fin-de-semana", "2026-11"…) plus "manana"
    (`TOMORROW`). An event matches when any of its days from today falls in a chosen period (`matchesDates`), so an
    event over several days counts in each period it runs through, and a workshop series in each period with a session
    to come (only its sessions' days, `daysOf`; counted once per period). The list then shows it on its first such day
    (`listedDay`), and `groupByPeriod` gives "Mañana" a group of its own when it's chosen. Upcoming list only: the
    calendar ignores them.
  - **Types** (`types`, several): social, workshop…
  - **Rhythms** (`styles`, several): filtering by a family ("salsa") also matches its variants ("salsa caleña").
  - **Bars** (`hideBars`, on or off; off by default): while on, no event with `bar: true` (`isBar`, `matchesBars`;
    an event without the field isn't a bar). Not a group of options: it isn't left out of any option's count, so every
    count leaves the bars out while they're hidden. Filtros' badge counts it as one, in both views; the model lists it last
    among the choices as "Sin bares" (`HIDDEN_BARS`, a removable chip in the row and a name in the line), and its controls
    (the sheet's switch, the toolbar's chip, "Sin bares ×") carry `data-filter="bars"`, which `toggleFilter` in
    `main.ts` turns on or off. **Remembered** in this browser: `lib/storedSwitch.ts` (`storedSwitch`, a reusable on/off
    setting: `1` while on, the key removed while off; storage blocked, it reads as off and what's set holds for the
    visit), key `hide-bars` (`HIDE_BARS_KEY`), read once at start into `createInitialState({ hideBars })` and written
    on every change, "Limpiar" included. A shared link to a bar's event while they're hidden opens its details over the
    list without its card (`openSharedEvent`), instead of sending it to its page as a past event.
  - **Search** and **Guardados**.

  Every path that shows events goes through `matchesFilters`: the list (`renderUpcomingView`), the calendar
  (`calendarDays` in `calendarView.ts`: dots, names, labels, the day's list), the options' counts and the line
  (`filterModel`); `tests/hideBars.test.ts` guards it (no other script reads `bar` off an event).

  The options (`filterModel` in `lib/filterModel.ts`, pure and tested; `dateOptions` in `state.ts`) exist by the events in
  view before any filter, in a stable order, so chips never move; each is counted against the other groups
  (`matchesFilters(event, state, except)`), and one with nothing to show is `dimmed` (unless chosen), not hidden. The
  model also gives the bar's "Cuándo" (`when`, `whenModel`: the chip's label, "Finde" or "Finde +1", and the menu's
  options, "Cualquier fecha" first, each with its count and its days from `periodDays`, e.g. "9–11 oct"; null in the
  calendar), its rhythm chips (`quickStyles`: Salsa, Bachata, Urbano, Tango, fixed), every choice in use (`applied`)
  and those without a chip of their own (`extra`, removable chips first in the row; never a date, "Cuándo" shows them), Filtros' badge in the bar at the bottom (`active`,
  `activeFilterCount`: every choice; dates only in the list) and the count shown (`shown`). `summaryLine` writes the
  line under the bar ("12 eventos · Finde, Salsa"; in the calendar "5 eventos en octubre · Salsa"). `clearFilters`
  ("Limpiar") clears dates, rhythms and types and shows the bars again (`main.ts` forgets it in storage), not the
  search nor Guardados. The other filters live only in memory: not in the URL or storage, as before (`DESIGN.md`,
  "Filters"); hiding the bars is the one remembered.
- **"Próximos"** groups upcoming events by period: today, this week, this weekend, next week, the rest
  of the month, then one group per month for the next six months, and one per year beyond that
  (`groupByPeriod`). On phones, cards read like an Instagram feed. An event over several days (`end_date`)
  is upcoming until its last day, and once it has started it's listed under "Hoy" every day it goes on
  (`shownDay` in `lib/dates.ts`). A workshop series (`sessions`) is upcoming until its last session and listed under
  its next session's day, among that day's events by its time (`listOrder`: by the day each event is listed on, then
  its start time that day, `startOn`); once a session passes it moves to the following one.
  Long lists stay short where it matters: the near periods show their flyers in full (six, then "Ver N más"),
  and later periods start as a summary row ("Ver los 23 eventos"); `DESIGN.md`, "Long lists".
- **"Calendario"** shows a month grid. Days with events show them as colored dots on phones (at most two rows: past
  six, four dots and "+N", `dotsHtml`) and as up to three names and "+N" on wide screens, so a busy day never makes
  its week taller. Colombian holidays are tinted, and
  the selected day's events are listed below, under its heading and count (which glows when the day changes).
  Whatever changes that list ends with its start on screen (`revealDay` in `views/viewNavigation.ts`: the page moves only when it's below
  the fold). An event over several days is on each of its days
  (`groupByDay`), across months too: a festival from 31 October to 2 November shows in both months. A workshop series
  is on its sessions' days only, and a month without one of them doesn't list it. A day's events go by their start
  time that day.
- **One date at a time in the bar:** an option of "Cuándo" sets `dates` to that one period (or none), its × empties
  them; the "Filtros" sheet still toggles several. Both read and write the same `dates`, so the bar, its line, the
  sheet and the toolbar always agree.
- **Keeping your place:**
  - when a filter changes while you're reading the list, the period you were in (the lowest one crossing a band
    under the bar, measured just before: `captureListPosition`) stays under the bar;
  - the list remembers where it was left, so switching to the calendar and back returns you to the same spot (to the
    same period if a filter changed in the calendar). The calendar instead always opens on its home: the month's
    title under the pinned bar if the page is past it, and the day's list on screen (`calendarHome` and `revealDay` in
    `views/viewNavigation.ts`; `DESIGN.md`, "Phones: feed, jump bar, the bar at the bottom and filter sheet").

### 5.3 The details drawer and URLs

```mermaid
stateDiagram-v2
    [*] --> List
    List --> Drawer: tap a card (its photo flyer too) or "Detalles" / pushState /evento/<id>/
    Drawer --> Drawer: another card (side panel) / replaceState /evento/<other id>/
    Drawer --> List: ×, the scrim, Escape, drag down, or back (all through history.back)
    [*] --> EventPage: a shared link, or a link opened in a new tab
    EventPage --> Drawer: forwards to /?evento=<id>: the list at its card, the drawer over it
    EventPage --> EventPage: a past event (Bogotá's date) or ?pagina: it stays
```

- **The drawer is one `<dialog>`** (`EventDrawer.astro`, `views/eventDrawer.ts`) with one event's details in it
  (`eventDrawerHtml`: the head with when, the title, the type, the account (its profile, opened inside the site: `lib/accountLink.ts`) and ×; then the quick actions and the
  details). No flyer: the card is right there. Two modes, chosen when it opens and switched if the window crosses
  900 × 600px while open (`show` / `swapMode`; a phone in landscape, 932 × 430, keeps the drawer and the bar at the
  bottom, which a side panel would cover):

  ```mermaid
  stateDiagram-v2
      state "Drawer (phones, under 900px wide or 600px tall; modal)" as Sheet {
          [*] --> Medium
          Medium --> Full: pull up, scroll the content, wheel, the handle, keyboard focus below the fold
          Full --> Medium: pull down from the bar or the content's top, wheel up at the top, the handle
      }
      state "Side panel (900 × 600px and up; not modal)" as Panel
      [*] --> Sheet: showModal()
      [*] --> Panel: show(), html.has-side-panel
      Sheet --> [*]: ×, scrim, Escape, back, drag down from Medium
      Panel --> [*]: ×, Escape, back
  ```

  - **Drawer:** the dialog covers the screen (`overflow: clip`, so focusing inside never scrolls it) with its own
    scrim (`--scrim`, its opacity following the drawer: 32% at half height, 55% at full) and the panel, moved by
    `--drawer-y` (its offset below full height). Its geometry and gestures are pure functions in
    `views/drawerSheet.ts` (tested): `offsetFor` (half height: the lower 55%; full: 12px from the top), `scrimAt`,
    `settle` (a flick of 0.5 px/ms goes its way; else past max(110px, 22% of the screen) below half height closes, the
    same numbers as the bottom sheets, from `lib/sheetMotion.ts`;
    else the nearer height; from full, a pull down lands at half), `exitDuration` (160–280ms) and `cardScrollDelta`
    (how far the list moves so the tapped card stays in view: only when it would be mostly hidden, then its flyer
    goes under the bar). Touch: at half height every vertical drag moves the drawer (`touch-action: none`); at full
    the content scrolls natively and the drawer follows the finger from its bar, or from the content's top pulling
    down. A mouse or pen drags the bar (pointer capture once it's a drag, so the handle's tap still works). Rise
    320ms, settle 300ms, CSS transitions (the motion tokens, `--duration-*` and `--ease-*` in `tokens.css`, mirrored
    by `lib/motion.ts`); no motion with reduced motion.
  - **Modal:** `showModal()` makes the list inert and `html:has(dialog:modal)` stops it scrolling. The dialog has
    `autofocus`, so opening focuses the dialog itself, not its handle (which is still below the screen: focusing it
    scrolled the list); then the title takes the focus. Closing gives it back to what opened it (the last card, when
    the side panel swapped events: the focus is read before `close()`, since the browser moves it back to the first).
  - **Side panel:** fixed on the right (`--panel-width`), opened with `show()` so the page stays usable; the page
    leaves room for it (`.has-side-panel`), the open event's card is outlined (`highlightCurrentCard`, also after
    each render), and Escape is handled by the page (a non-modal dialog doesn't get it). A card tapped while it's
    open shows its event there and replaces the URL, unless the list moved to another screen meanwhile (a period opened whole,
    the calendar): that screen keeps its entry and the event gets one over it. Closing on such a screen (its entry
    kept the event's address) puts the address back to its view's, `/` or `/calendario/` (`addressAfterClosing`,
    `lib/links.ts`). Closing never reopens an earlier event: a back that passes over a screen undone from inside the
    panel and lands on another event's entry is ignored while the panel slides out (`historyMove` in
    `views/drawerHistory.ts`), and the close steps out of that entry too.
- **Every close goes through the history:** ×, the scrim, Escape and a drag call `history.back()`, and the
  `popstate` slides it away from where the finger left it (`requestClose` → `leave`); the back button does the same.
  Safari's edge swipe (`hasUAVisualTransition`) closes it at once. Back from a sheet over the drawer (posts, a post)
  lands on the same event, and the drawer stays.
- **Forward never lands on a closed overlay:** forward onto the entry of a sheet (`lib/sheet.ts`) or the "Cuándo" menu
  (`whenMenu.ts`) that isn't open anymore goes back over it, since what it showed (a post, a profile) is gone. Without
  that, drawer → @ → back → back → forward → forward left the drawer on the profile's entry, and its × took two taps
  (the first only left that entry). Done where those entries are written rather than in the drawer (treating "stay"
  as "close" while it leaves), so it holds for every overlay, the "Filtros" sheet over the list too.
- **One event, nothing kept:** only the open event's details are rendered, with no image; closing empties the
  drawer (section 5.7).
- **The address bar follows the event:** opening pushes the event's own URL (`/evento/<id>/`), so the phone's back
  button closes it; every event's URL is a real page, so copying the address shares the event.
- **A shared link opens the app:** the event's page forwards a browser to `/?evento=<id>` (its inline script, unless
  the event is past in Bogotá's date, `?pagina` is set, or the visitor is a bot or a link-preview fetcher, by its
  user agent). `openSharedEvent` (`main.ts`) takes the parameter off the
  address (keeping the others, like `utm_source`), finds the event's card (`sharedEventEntry`, `upcomingView.ts`:
  its period opened whole first if it's summarized or past "Ver N más"), waits for the fonts and a laid-out frame,
  then opens the drawer with the list scrolled to the card (`shared`: its flyer loads at once) and counts
  `detalles-enlace`. An event not in the list goes back to its page with `?pagina=1`. Link previews and search
  engines read the event's page itself (they don't run scripts).
- **The event page** (`eventPage.ts`) is already rendered at build time (the flyer, then the drawer's details); a
  browser leaves it for the app at once. What depends on the day ("Hoy", "Mañana", "Este evento ya pasó") is set
  again when it opens: the page was built hours earlier. A workshop series' detail is drawn again whole, since its
  date sticker and its sessions (the next one, those past) depend on the day too; the build's is the fallback. Its script adds the theme toggle, click tracking, the posts
  sheet and media viewer, the save button, sharing, the install offer and the service worker, the clips, and the
  detail's clicks (the flyer plays a video in place, the posts badge, the media links).
- **The media:** the details' **Instagram** quick action (`data-media-link`: `video`, `carrusel` or `publicacion`,
  said in its `aria-label`) opens the post in the media viewer (`postViewer.ts`, Instagram's player); it's a link to
  the post underneath, so a new-tab click follows it; "Ver las 3 publicaciones" and a card's "▦ 3" open the posts sheet
  (`postsSheet.ts`), whose chosen post opens in the media viewer in its place (`openPanelSheet(…, { replacing })`
  takes over the sheet's history entry and its opener: closing the post gives the focus back to "Ver las 3
  publicaciones", since the browser would give it to the post's thumbnail, inside the closed sheet). On the event page, the flyer still plays a video in place
  (`inlinePlayer.ts`).
- **A story** (`media_type` `STORY`, [`DATA.md`](DATA.md#stories); `isStory` in `lib/mediaLabel.ts`) has no post
  behind it: its flyer is a plain image on the event page (not a link, labeled "Historia"), the media viewer shows
  only the flyer and never loads Instagram's player, and the inline player never gets it. The details say "De una
  historia de @cuenta · las historias duran 24 horas", and their Instagram quick action opens the account's profile
  in the media viewer (a `data-profile` link to its `permalink`).
- **An account's @** (anywhere: a card, the details' head, Organiza, an @ Contacto, a story's Instagram button, the
  footer's sources; all built by `lib/accountLink.ts`) opens its profile in the media viewer: an iframe of Instagram's
  profile embed (`profileEmbedUrl`, `https://www.instagram.com/<account>/embed/`; `frame-src` already allows
  Instagram), covered by "Cargando el perfil…" until it has drawn. The link underneath is the profile itself, for a new
  tab. There's no account filter anymore.
- **The other actions:**
  - "Compartir" (a quick action, and a card's share icon) opens the phone's share menu with the event's text and page
    URL (`views/sharing.ts`);
  - "Cómo llegar" (in the Lugar row) opens Google Maps' search URL (`mapsUrl` in `lib/links.ts`).

### 5.4 Flyers

- **Never cropped:** on phones each flyer shows at its own shape, from 4:5 (portrait) to 1.91:1
  (landscape), like Instagram's feed. The size comes from the build (section 3.1), so nothing jumps
  while images load.
- **Taller flyers, and every card on wide screens,** get a 4:5 frame, with the flyer fitted whole over a
  blurred copy of itself.
- **Lazy loading:** every card image uses `loading="lazy"` and `decoding="async"` (a shared link's card loads at once).
- **Videos' clips in the feed:** a card whose image is a video with a clip shows a `<video data-clip>` with the flyer as
  its poster, played silent by `views/clips.ts` (section 5.7). The clips have no sound track, so a tap there opens the details
  like the rest of the card.

### 5.5 Installing, saving and searching

- **Install:** `views/installPrompt.ts` offers it (a banner under the header, a footer link): Chrome/Edge's own dialog, or a sheet with the steps for where the visitor is (`lib/installPlace.ts`, from the user agent: Safari 26, earlier Safari, other iPhone browsers, apps' own browsers, Android). On iPhone the page can't tell whether it was added, so "Ya la agregué" and closing the steps hide the banner (section 5.7). It also registers the service worker (built site only).
- **Saved events** live in this browser (`lib/saved.ts`, localStorage); "Guardados" filters the list and the calendar to them.
- **What's kept in this browser** (localStorage, each read and written inside `try`, so blocked storage only means it
  lasts for the visit): `theme`, `saved-events`, `hide-bars` (`lib/storedSwitch.ts`), things shown once
  (`lib/onceFlag.ts`, e.g. `details-hint-seen`) and the install offer's `install-dismissed-at`.
- **Search** (`lib/search.ts`) runs on the events already in the page, accent-insensitive, every word anywhere in the event.
  On phones its field is the bar at the bottom (`views/bottomNav.ts`): Buscar opens it with a history entry of its
  own, an overlay (`{ search: <this opening's id>, overlay: true }` over the screen's state, the same address;
  `searchHistory`): back or × leaves it and clears the search, the keyboard's Enter leaves it and keeps the search, and
  forward onto it once closed goes back over it, like the sheets' entries. An overlay opened over it (the details, the
  "Cuándo" menu) carries only the screen and the open event (`overlayState`), never another overlay's mark, so the
  field steps back only when its own entry is on top: an empty field left for one of them waits, and closes when that
  one does (`leftEmpty`). A reload drops any overlay mark from the entry it lands on (`initScreenHistory`), and a wider
  screen (`WIDE_QUERY`, the bar's own media query) closes the field, keeping the search. Typing goes through the same `[data-search]` input handler as the
  toolbar's field (`main.ts`).
- **Sharing** (`views/sharing.ts`) goes through the phone's share menu: an event (its link, whose preview shows the flyer, date, title, place and price: section 3.4), a near period or the visitor's plans (an image drawn in the browser, `lib/shareCard.ts`, and a list for WhatsApp).

### 5.6 Themes

- **Two themes:** "Fania de día" (light) and "Luz de escenario" (dark).
- **Light by default** for everyone, not the device's setting nor the time. A two-way switch, "Claro" /
  "Oscuro" (`ThemeToggle.astro`, `scripts/theme.ts`).
- **Remembered** in `localStorage`, key `theme`, value `light` or `dark`; any other value (the old `auto`)
  reads as light and is removed. Blocked storage: the switch works for the visit only.
- **Before first paint:** an inline script (`src/themeScript.ts`, put in `<head>` by `BaseLayout.astro`) sets
  `<html data-theme>` and the `theme-color` meta from the saved value, so a dark choice never flashes light
  (allowed by its hash, section 3.3). CSS defaults to `color-scheme: light`; `[data-theme=dark]` switches.
  The rule and colors live in `scripts/themeConfig.ts` (the colors from `lib/brandColors.ts`), shared by both; `tests/theme.test.ts` runs the inline
  script against the same cases.
- **Colors** are CSS tokens with `light-dark()` (`styles/tokens.css`); [`DESIGN.md`](DESIGN.md) has
  them all. The dark theme adds its lighting (`--stage-light`, `--grain`, painted by `base.css`); the calendar uses
  the same colors. `check-contrast.mjs` checks every pair in both themes.

### 5.7 iPhone (Safari)

Every browser on an iPhone is Safari's engine (WebKit), with its own limits:
- **Memory.** iOS closes a tab that uses too much memory ("A problem repeatedly occurred on…", the page
  reloads), with no error the page can catch. Decoded images are the big cost: a 1080×1350 flyer is about
  6 MB once decoded, whatever its file size. So:
  - the details drawer renders one event's text and no image at all: the flyer is the card's, already on screen
    (section 5.3). Closing it empties it. (An earlier viewer rendered a slide per event of the list, 35 flyers and
    every clip at once: about 190 MB decoded, which made iPhones close the page; then the current event and its
    neighbors, with their flyers again over the list.)
  - videos' clips (`views/clips.ts`), in the feed and on an event's page: `preload="none"`, muted, `playsinline`,
    one playing at a time (≤ 1 clip decoding); a clip that leaves the screen pauses and unloads (its
    `src` set aside and the video reloaded empty, put back when it's seen again); a clip whose card is redrawn away is
    released. Something over the list holds them (`holdClips`): the full drawer covers them, and the media viewer
    plays the post with sound;
  - Instagram's player (an iframe) is removed when the media viewer closes, and on an event's page when the video
    playing in place goes off screen.
- **One bad event can't break the drawer:** if its details fail to render, it shows a link to the event's page
  instead (`eventDrawer.ts`).
- **Installing** has no browser dialog: the page is added from the share menu. Where that menu is depends on
  the browser and the version, so `lib/installPlace.ts` reads the user agent:
  - Safari 26 (iOS 26 reports itself as iOS 18.6, so Safari's own `Version/26` tells): ⋯ at the bottom right →
    Compartir → Agregar a inicio → Abrir como app web → Agregar (with the top or bottom bar layouts, Compartir is
    in the bar);
  - Safari 18 and earlier: Compartir in the middle of the bottom bar → Agregar a inicio → Agregar (iPad: at the
    top right);
  - Chrome, Edge, Firefox: their own Compartir, then the same menu (iOS 16.4 or later; earlier, only Safari:
    the steps say so, with "Copiar enlace");
  - Instagram, Facebook, TikTok, the Google app…: their own browsers can't install; open it in Safari, or copy
    the link.

  The home-screen app keeps its storage apart from Safari, and Safari can't ask whether it's installed. It's
  recognized when it runs (`display-mode: standalone`, `navigator.standalone`), and shows no offer there.
- **The keyboard and the bar at the bottom** (`views/bottomNav.ts`). iOS doesn't shrink the layout viewport when the
  keyboard opens: a `position: fixed; bottom: 0` bar stays under the keyboard, and the visual viewport shrinks and pans
  (`visualViewport.offsetTop`). While the search field has the focus, the bar rises by `keyboardInset` (pure, tested):
  the layout viewport's height (`documentElement.clientHeight`) minus the visual viewport's `height + offsetTop`, never
  below 0, set as `--keyboard-inset` on the bar (its `bottom`), with the home indicator's padding dropped (`.is-lifted`).
  It's read again on the visual viewport's `resize` and `scroll` and the window's `resize`, and 100, 300 and 600ms
  after focus and blur, since the keyboard animates without always telling. Known iOS bug: `offsetTop` can stay
  stale after the keyboard closes; on blur the inset drops to 0 at once (it only applies while the field has the
  focus), and a stale `offsetTop` with a full-height viewport comes out ≤ 0 anyway. Without `visualViewport` the inset
  is 0 and the browser places the bar (Chrome on Android before 108 resized the layout viewport itself). The page
  has no `viewport-fit=cover`, so `env(safe-area-inset-bottom)` is 0 and iOS keeps the bar above the home indicator.
  Untested on a real iPhone yet: Safari 26's floating toolbar may sit over the bar.
- **Head tags:** `apple-touch-icon` (180×180, opaque, iOS rounds it) and `apple-mobile-web-app-title`
  (`BaseLayout.astro`); iOS takes the rest (name, full screen) from the manifest.

---

## 6. Dates, time zones and holidays

- **Dates are Bogotá dates:** event dates are plain `YYYY-MM-DD` strings in Bogotá's local time.
  "Today" is always Bogotá's, whatever the visitor's or the build machine's time zone (`lib/dates.ts`,
  `todayIso`, with `Intl` and `America/Bogota`). Bogotá is UTC−5 all year.
- **Times** are shown in 12-hour format ("8:00 p. m.") and stored as `HH:MM` 24-hour. The ICS feed uses
  the `America/Bogota` time zone.
- **Events over several days** (`end_date`, `docs/DATA.md`): `lib/dates.ts` has `lastDay`, `isMultiDay`,
  `daysOf` and `shownDay`. They're past only after their last day (the event page's "Este evento ya
  pasó"). Calendars (`eventTimes`, the ICS feed) get them as all-day events from the first day to the day
  after the last, as the format's end is exclusive (13–15 November: `DTSTART;VALUE=DATE:20261113`,
  `DTEND;VALUE=DATE:20261116`); schema.org's `endDate` is the last day (for one day, the post's end time, or none:
  the calendars' 4 hours are a guess).
- **When an event is over** is one rule, `isUpcoming` in `lib/dates.ts` (before `endsAt`, compared with Bogotá's
  `nowInBogota`, "YYYY-MM-DD HH:MM"): at the end of its last day, except a **night past midnight** (a one-day event,
  or a series' last session, whose end time is before its start: 21:00–03:00, `end_date` null as `DATA.md` says),
  which is on until its end time the morning after. The list, "Guardados", the "Cuándo" options, a shared link (the
  event page's forward and the app), the event page's "Este evento ya pasó" and the 404 page's list all use it. At
  1 a. m. last night's social is still listed, under "Hoy" (`shownDay`), and leaves at 3:00. Over several days the
  times are the first day's start and the last day's end, so they never make a night past midnight.
- **Workshop series** (`sessions`, `docs/DATA.md`): `isSeries`, `nextSession` (the first on or after today),
  `shownSession` (the next, or the last once all passed), and `daysOf` (its sessions' days, not those between) in
  `lib/dates.ts`. `isMultiDay` is false for a series. The card and the details show the next session (`cardWhenLabel`,
  `stickerDate`, `sessionsHtml`, as of today in the browser). Calendars get one entry per session with its own times
  (`sessionTimes`, `lib/calendarFeed.ts`: a VEVENT each, its UID the event's id and the session's date, so Google and
  Apple import each session; not RDATE, which can't give each session its own times). schema.org gets one `Event` from
  the first session (`startDate`) to the last (`endDate`: its end time when the post gives it, else its day), which is
  what Google reads, with each session as a `subEvent`.
- **Adding days** (`addDays`) moves the calendar date, not 24-hour steps, so "Mañana" and "Próxima
  semana" stay right for a visitor whose time zone has daylight saving time.
- **Colombian holidays** (`lib/holidays.ts`) are calculated, not downloaded:
  - fixed dates;
  - holidays moved to the following Monday (Ley Emiliani);
  - holidays relative to Easter (Meeus' algorithm).

  The tests check them against the official 2026 and 2027 lists. In the calendar, holidays get a tint,
  and their label and heading say "Festivo".

---

## 7. Third-party services

| Service | What for | Data sent | If it's down |
|---|---|---|---|
| **GitHub Pages** | Hosting | | The site is down |
| **GoatCounter** (`jzamora9.goatcounter.com`) | Visit statistics, without cookies or personal data, so no consent banner is needed | Page views. Each event opened in the details drawer, as a view of its page. Where details were opened from, as events: `detalles-tarjeta` (the card), `detalles-boton` (its "Detalles"), `detalles-enlace` (a shared link; `detailsEventName`); `detalles-linea` (the line that ended each card) is retired since October 2026. Clicks on elements with `data-track` (Instagram, the contact links, "Cómo llegar", sharing, including `compartir-tarjeta` from a card's row, saving, installing, reports). Local testing isn't counted. Its script (`count.js`) is a copy served from the site (`src/vendor/goatcounter-count.js`, ISC license), not loaded from `gc.zgo.at`: the policy (section 3.3) then allows no other script host, and GoatCounter keeps its `/count` endpoint compatible, so the copy needs no updates | Nothing breaks: the script is optional and wrapped in `try` (`lib/analytics.ts`) |
| **Instagram embed** (`instagram.com/embed.js`) | Showing a post inside the site (the media viewer: the details' Instagram quick action, a post chosen among the event's posts, an event page's flyer; videos play, carousels swipe) | Loaded only on that tap, never with the page: the post's link; Instagram's player then runs as Meta's code (and cookies) inside its frame | Our copy of the flyer stays, with "Abrir en Instagram" (also when a post's link can't be read) |
| **Instagram profile embed** (`instagram.com/<account>/embed/`, an iframe) | An account's profile inside the site (any account's @: `lib/accountLink.ts`): its photo, counts and latest posts | Loaded only on that tap: the account's name; Instagram's page runs as Meta's code (and cookies) inside its frame | "El perfil no cargó aquí: ábrelo en Instagram.", and the bar's "Abrir en Instagram ↗" |
| **Google Fonts** | Shrikhand, Bodoni Moda (italic) and Instrument Sans | The font request | System fonts are used |
| **Instagram, WhatsApp, Google Maps** | Links the visitor chooses to open | Only what's in the link | |
| **Google Forms** (the author's account) | Reports and ideas: "¿Algo está mal? Repórtalo" in each event's detail (the event filled in, `lib/links.ts`, `feedbackUrl`) and "Escríbenos" in the footer. No account needed; answers go to a Google Sheet and an email | What the visitor writes, and the event it's about | Nothing on the site: it's a link |

Flyers are copies served from this repository, so the site never needs Instagram to show events. The
only Instagram content it loads is a post's player or an account's profile embed, and only when a visitor taps to open one.

---

## 8. Quality checks

| Check | What it verifies | Where |
|---|---|---|
| Data contract | Every field of `events.json` and `meta.json`: types, allowed values (event types, styles, confidence), real dates and time formats, `end_date` after `date` and within 7 days, a workshop series' `sessions` (2 to 12, sorted, no repeats, real dates, both times, within 123 days, `date` and `end_date` the first and last's) instead, unique ids, usernames, post links (`instagram.com/<p, reel, reels or tv>/<code>/`; a story: the account's profile, `instagram.com/<account>/`, and a `story-<hash>` id), flyer and clip paths (inside `flyers/` and `previews/`) and their files existing, sorting | `frontend/scripts/check-data.mjs` |
| Types | `astro check`: strict TypeScript, including `noUncheckedIndexedAccess` | `tsconfig.json` |
| Color contrast | Every color pair the site uses, in both themes, against WCAG 2.2 AA. It reads the tokens from `tokens.css`, so it can't drift from the design system | `frontend/scripts/check-contrast.mjs` |
| CSS custom properties | Every `var(--name)` in the stylesheets, components and scripts has a definition; the few set from scripts (`style.setProperty`: the drawer's position, a flyer's shape, a sheet's drag) are listed, and each must still be set by one | `frontend/scripts/check-css-vars.mjs` |
| Unit tests | Dates and Bogotá's "today", formatting, filtering (rhythms and dates, "Mañana", the options and their counts) and period grouping, holidays, the policy check, where the visitor can install from and its steps, the filter chips (`filterModel`: the bar's chips, "Cuándo" (its label with one or several dates, its options and counts, each period's days, the menu's radio items, where it hangs, its keys), dimmed vs hidden options, multiple types, removable chips, the badge, the line, the calendar's line; "Limpiar"'s scope; empty results), the drawer (`drawerSheet.ts`: its heights, scrim, where a drag ends and the ways it closes, keeping the tapped card in view), a shared link's entry (`sharedEventEntry`: the period to open, or the page for a past event), the details (the drawer's order, no image, its media links and price line), the history between screens and overlays (`screenHistory.ts` with the sheets, on a fake history: a period left from inside the Filtros sheet or next to the side panel, the address after closing, each view's address (`/calendario/` and back to `/`), "Guardados" turned off in the calendar staying off in the list), the sheets (`sheetHistory.test.ts`: the focus after a post opened in the posts sheet's place; forward onto a closed sheet's or the "Cuándo" menu's entry), the details' history (`drawerHistory.ts`: push or replace, closing through back, back and forward, an earlier event's entry not reopened while closing, a shared link's entries) and the drawer's numbers against the CSS (`--drawer-top-gap`, the 900px breakpoint) and the sheets, each flyer's version (`?v=`) and the service worker's image cache, run against fake caches (`images.test.ts`: one cache across builds, a flyer made again replacing its old copy, an older copy offline), the build's files written into it, inline handlers in the policy check, the CSS custom properties check, the calendar feed's description and the report link for an event over several days, workshop series (`series.test.ts`: the next session before, between, on and after its sessions; where the list puts it; the date filters and "Cuándo"'s counts; the calendar's days; the card, its sticker and the details' sessions; the calendar feed's entries; link previews and shared texts; the data check's rules), every @account as one shared link that opens the profile inside the site (`accountLink.test.ts`, which also fails on a hand-written profile link), the "Video" label on every video's card, a phone calendar day's dots (`calendarDots.test.ts`: at most six, then four and "+N"), the contact links, the media labels, search and saved events, which periods open, shared texts, versions and release notes, the analytics names for opened details, stories (the data check: a profile link only for a `STORY`; the "Historia" label, the line and "Ver perfil en Instagram", an event with only a story, a post's media before a story's), things shown once (`onceFlag`, with and without storage), hiding the bars (`hideBars.test.ts`: `bar` absent is not a bar, the list, the calendar's days and dots, the options' counts, the badge and "Sin bares", "Limpiar", the sheet's switch, the setting remembered and with storage blocked, and a guard: every path filters through `matchesFilters`), link previews (their text, the image's version, one image drawn with and one without a flyer), the bar at the bottom (`bottomNav.test.ts`: Filtros' badge and name with "Sin bares", the view on screen, Guardados and a kept search, the search field's history entry on a fake history (back, ×, forward, the details over it), the keyboard's inset (`keyboardInset`: iOS's pan, collapsed toolbars, a stale `offsetTop`, no visualViewport), and a guard: five items in order, no floating button, phones only, Info in the header), the theme (the saved value, old ones, and the script before first paint), the motion tokens and the brand's hex colors against `tokens.css`, the release velocity, what each list's share button shares (`shareSources`), the short dates against Intl, the values read from the page (`isView`, `isFilterGroup`) and history entries (`historyState`), links that leave the site, the page shown again on another day (`dayChange.test.ts`), a night past midnight (`overnight.test.ts`: over at its end time the morning after, listed under "Hoy" until then) | `frontend/tests/*.test.ts` (Vitest) |
| Build | Every page, image and feed is generated; every page's Content Security Policy allows its inline scripts and styles, and no page has a `style=""` attribute or an inline `on…=""` handler (section 3.3); every event's link preview has its tags and a 1200×630 JPEG under 280 KB (section 3.4) | `npm run build`, `frontend/scripts/csp-meta.mjs`, `frontend/scripts/og-check.mjs`, `frontend/scripts/sw-precache.mjs` (fails if `sw.js` has no list to fill in) |

All six run in `ci` on every pull request, and the ruleset requires `ci` before merging.

---

## 9. Code map

```
frontend/
  astro.config.mjs        site URL, public folder (../data), sitemap, DATA_DIR and ASSETS_DIR, Content Security Policy,
                          the csp-meta, og-check and sw-precache integrations, no Markdown highlighting
  vitest.config.ts        unit tests, with Astro's settings
  scripts/                check-data.mjs, check-contrast.mjs, check-css-vars.mjs (run by npm run check); release.mjs (versions);
                          og-site.html (draws the home page's link preview); csp-meta.mjs (the policy, after
                          the build); og-check.mjs (the events' link previews, after the build); sw-precache.mjs (the build's
                          files, written into sw.js)
  tests/                  Vitest tests, factories.ts (test events, a story-only one, a workshop series), checkData.test.ts (the data contract), fakeHistory.ts (history and popstate in Node)
  src/
    data.ts               the data, typed, with flyer sizes and versions (build time only)
    csp.ts                allowInlineScript(): an inline script, allowed by its hash (build time only)
    themeScript.ts        the theme before first paint, an inline script (build time only)
    linkPreviewImage.ts   an event's link-preview image: satori + sharp (build time only)
    vendor/goatcounter-count.js   GoatCounter's script, served from the site
    env.d.ts              the build's variables: PUBLIC_CHECKED_AT, PUBLIC_VERSION, DATA_DIR, ASSETS_DIR
    images.ts             the flyers' list and each one's version (a hash of its file: its URL's ?v=)
    assets/og-site.jpg    the home page's link preview, drawn by scripts/og-site.html
    assets/fonts/og/      the fonts drawn into the events' link previews (TTF, with their OFL licenses)
    layouts/BaseLayout.astro   <head>: meta, previews, fonts, theme before paint, GoatCounter, the CSS
    pages/
      index.astro         the app, on the list (/)
      calendario/index.astro   the same app, on the calendar (/calendario/)
      evento/[id].astro   an event's page (forwards browsers to the app)
      og/[id].jpg.ts, og/sitio.jpg.ts   link previews
      thumbs/[name].webp.ts   flyer thumbnails
      icons/[name].png.ts, manifest.webmanifest.ts, sw.js.ts   installing (icons, manifest, service worker)
      calendario.ics.ts   the calendar feed (no longer linked; written by lib/calendarFeed.ts)
      404.astro
    components/           HomePage (the app's body, for / and /calendario/), SiteHeader, ThemeToggle, Stripes,
                          ViewToolbar, JumpBar, BottomNav, FilterSheet, CalendarView, EventDrawer, PostsSheet,
                          PostViewer, InstallOffer, SiteFooter
    scripts/
      main.ts             entry point of the home page: state, render, the clicks' handlers
      eventPage.ts        entry point of an event's page
      state.ts            AppState, filtering, period grouping
      screenHistory.ts    the phone's back between the app's screens
      types.ts            DanceEvent, EventMedia, Meta, AppState (mirror of the backend's models)
      theme.ts, themeConfig.ts   the Claro / Oscuro switch, its rule and colors
      views/              upcomingView, calendarView, viewNavigation, eventCard, eventDetail, eventDetailActions, eventDrawer,
                          drawerSheet, drawerGestures, drawerHistory, filters, jumpBar, whenMenu, bottomNav, postsSheet,
                          postViewer, inlinePlayer, clips, saveButton, sharing, installPrompt, detailsHint, dayChange (HTML strings +
                          their behavior)
      lib/                dates, holidays, format, links, linkPreview, calendarFeed, contact, mediaLabel, filterModel, search,
                          saved, share, shareText, shareSources, shareCard, analytics, dom, focus, icons, accountLink,
                          externalLink, sheet, sheetMotion, motion, brandColors, instagramEmbed, installPlace, onceFlag, storedSwitch,
                          viewTitles
    styles/               tokens.css (design tokens), base.css, components/*.css
```

| Module | Responsibility |
|---|---|
| `data.ts` | Reads `data/`, adds flyer sizes and versions (`?v=`), lists every account the sweep reads (`meta.accounts`, else the accounts with events) for the footer's sources |
| `state.ts` | The UI state; filtering (AND across groups, OR within dates, types and rhythms; hiding the bars: `isBar`, `matchesBars`, `HIDE_BARS_KEY`); Filtros' count (the badge); "Limpiar"; grouping by period; the date options |
| `views/upcomingView.ts` | "Próximos"; where a shared link's event is (`sharedEventEntry`) |
| `views/calendarView.ts` | "Calendario", with holidays; each day's events with the filters on (`calendarDays`); a day's dots on phones (`dotsHtml`, at most `MAX_DOTS_PER_DAY`); the selected day's heading with its count, glowing when the day changes |
| `views/eventCard.ts` | A card: flyer at its shape (or a video's clip; every video's "Video" mark, clip or not), date sticker, the posts' badge, the action row ("Detalles ›" with its offset, Compartir, Guardar), details |
| `views/detailsHint.ts`, `lib/onceFlag.ts` | The first visit's pulse on the first card's "Detalles"; things shown once per browser |
| `lib/storedSwitch.ts` | A setting turned on or off and remembered in this browser ("Ocultar eventos de bares"), holding for the visit when storage is blocked |
| `views/eventDetail.ts` | An event's details (the drawer's, and the event page's with the flyer on top): head, quick actions, details, prices, media links. Pure HTML strings, imported at build time by the event pages |
| `views/eventDetailActions.ts` | What the details' clicks open: the post in the media viewer, the event's posts (`openEventPosts`), a video in place on the event's page (`handleDetailClick`) |
| `views/eventDrawer.ts`, `views/drawerSheet.ts` | The details: a drawer over the list on phones (half / full height, scrim, keeping the card in view) and a side panel on wide screens; opening and closing; the geometry and where a drag ends (pure, tested) |
| `views/drawerGestures.ts` | Dragging the drawer: touch, mouse or pen, the wheel (through `DrawerControl`) |
| `views/drawerHistory.ts` | The details' history entries: the event's address, closing through back, what back or forward does (`historyMove`) |
| `screenHistory.ts` | History entries for the app's screens (period, calendar, saved): the phone's back steps through them. Its hooks (`initScreenHistory`): the screen on show (`current`), putting one back (`apply(screen, undoing)`: stepping back out of the calendar keeps "Guardados" as it was set there) and each screen's address (`address`: `viewPath`, so the calendar's entries are `/calendario/`). Back from an in-page jump (the header's Info, `#info`) puts the scroll back. Overlays (sheets, the details, the "Cuándo" menu, the search field) carry the screen under them (`overlayState`); a screen left from inside one is skipped later. Every entry's state is one type (`AppHistoryState`), read with `historyState` |
| `components/HomePage.astro`, `lib/viewTitles.ts` | The app's page, for both addresses (`/` and `/calendario/`, by its `view`); each view's title and description, for the page's head and the tab's title when the view changes |
| `lib/filterModel.ts` | The filters' model, pure: options, counts, dimmed, the bar's chips, "Cuándo" (`whenModel`), what's applied, the badge, the line (`summaryLine`), stale dates |
| `views/filters.ts` | Drawing the model: the phone bar's chips and line, the filter sheet, the toolbar's rows and status; empty results |
| `views/jumpBar.ts` | Phones: the pinned bar (the chips; it never hides), the filter sheet's setup, keeping your place, scrolling on purpose |
| `views/whenMenu.ts` | Phones: the "Cuándo" menu under its chip: its items (`whenMenuHtml`), opening (its own history entry, as an overlay), where it hangs (`menuPlacement`), the keys (`nextOption`), closing (Escape, a tap outside that does nothing else, Tab, back) and the focus |
| `views/bottomNav.ts` | Phones: the bar at the bottom (Eventos, Calendario, Buscar, Guardados, Filtros): the view on screen (`aria-current`), Filtros' badge and name (`navItems`, `filtersLabel`), the search field docked above the keyboard (`openSearchField`, `closeSearchField`, `keyboardInset`) and its history entry (`searchHistory`), the bar's height for what must stay above it (`bottomInset`) |
| `views/dayChange.ts` | The page shown again on another day: the calendar's day and month to today, drawn again; hours later and online, loaded again |
| `views/viewNavigation.ts` | Switching views (the list back where it was left, the calendar on its home: `calendarHome`, also when the page opens on `/calendario/`; the view on screen again: the top of the page), the tab's title; the calendar's day list on screen (`revealDay`); the screens' history hooks (`currentScreen`, `applyScreen`) |
| `lib/focus.ts` | Keeping the keyboard's focus through a redraw (`focusSelector`, `focusScope`), and after "Limpiar" |
| `lib/accountLink.ts` | Every @account's link (`accountLinkHtml`, `accountLinkAttrs`): the profile, opened inside the site (`data-profile`); `tests/accountLink.test.ts` fails on any other profile link |
| `lib/links.ts` | Every URL built from an event: flyer, clip, page, link preview, Maps, the report form; an account's profile and its embed (`profileUrl`, `profileEmbedUrl`); each view's address (`viewPath`, `viewOfPath`) and where closing an event returns (`addressAfterClosing`); calendar times (a series' per session) |
| `lib/calendarFeed.ts` | The calendar feed's text (`/calendario.ics`): one VEVENT per event, or per session of a workshop series |
| `lib/linkPreview.ts`, `linkPreviewImage.ts` | A shared link's preview: its title, description, the image's text and version; the image itself (build time) |
| `lib/mediaLabel.ts` | What the label over a post's image says (Ver con sonido, Ver video, Ver las N, Historia), and which cards say "Video" (`isVideoCover`); stories (`isStory`, `storySource`: "De una historia de @cuenta…") |
| `lib/sheet.ts`, `lib/sheetMotion.ts` | Bottom sheets that drag to dismiss; panel sheets with their own back-button step; the release and exit numbers they share with the drawer (`releaseVelocity`, the flick, the slops) |
| `lib/motion.ts` | The motion tokens scripts use (durations, Material's curves), mirroring `tokens.css` |
| `lib/brandColors.ts` | The palette as hex, for what can't read CSS (link previews, the share card, the app's icons, the favicon, `theme-color`), checked against `tokens.css` |
| `lib/instagramEmbed.ts` | Instagram's player for a post, its script loaded on demand |
| `views/postsSheet.ts`, `views/postViewer.ts` | An event's posts (Flyers / Videos); a post watched inside the site (the media viewer); an account's profile there (`openProfileViewer`: any `a[data-profile]`, every account's @) |
| `views/inlinePlayer.ts` | A video tapped in the detail plays in the image's place (Instagram's player), removed when off screen |
| `views/clips.ts` | Videos' clips in the feed and on an event's page: the one on screen plays, silent and looping, one at a time; held under the full drawer and the media viewer; unloaded off screen, released when they leave the page |
| `lib/contact.ts` | The organizer's contact as a link: Instagram, WhatsApp, phone or website |
| `lib/search.ts` | Search over the events in the page |
| `lib/saved.ts`, `views/saveButton.ts` | Saved events ("Guardados"): the ids in this browser; the bookmarks and toggles |
| `lib/share.ts`, `lib/shareText.ts`, `lib/shareSources.ts`, `lib/shareCard.ts`, `views/sharing.ts` | Sharing through the phone's menu: the text, what each list's button shares (`shareSources`, pure), the image of a list, the buttons |
| `views/installPrompt.ts`, `lib/installPlace.ts` | Installing the site like an app: the offer, and the steps for each browser; registers the service worker |
| `lib/analytics.ts` | GoatCounter events: page views of events, clicks (`data-track`), where details were opened from |
| `lib/dom.ts`, `lib/icons.ts` | DOM helpers (`escapeHtml`, `isPlainClick`: a click that isn't asking for a new tab); inline SVG icons |
| `lib/accountLink.ts`, `lib/externalLink.ts` | Links as HTML: an account's @ (its profile inside the site), and any other that leaves in a new tab (`externalLinkHtml`) |
| `lib/dates.ts`, `lib/holidays.ts`, `lib/format.ts` | Dates in Bogotá (an event's days: over several days, or a workshop series' sessions), Colombian holidays, Spanish formatting (`LOCALE`, the short weekday and month names shared by the cards, previews and shared texts) |

---

## 10. Working on the site

From `frontend/` (Node 24):

```bash
npm ci
npm run dev       # http://localhost:4321, with the current data/
npm run check     # data contract, types, contrast, CSS custom properties
npm test
npm run build     # frontend/dist/
npm run preview   # the build, as published (with its Content Security Policy)
```

Changes go on a branch, through a pull request with a Conventional Commits title, and merge when `ci`
passes. The README has the details. A visual change follows [`DESIGN.md`](DESIGN.md). A change to the
data's shape starts in the backend (`models.py`), then [`DATA.md`](DATA.md), `types.ts` and
`check-data.mjs` here, behind a new `schema_version`.
