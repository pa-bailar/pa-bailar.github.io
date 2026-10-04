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

Last reviewed: 4 October 2026.

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
        CI["ci: data contract, types,<br/>contrast, tests, build"]
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
        CI->>CI: check-data, astro check, contrast, tests, build
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
  it's started from;
- the Content Security Policy (`security.csp`, section 3.3) and the `csp-meta` integration that checks it.

### 3.1 Reading the data: `src/data.ts`

```mermaid
flowchart LR
    EJ["data/events.json"] --> DT["src/data.ts"]
    MJ["data/meta.json"] --> DT
    FL["data/flyers/*.webp"] -- "sharp: width × height" --> DT
    DT --> EV["events: DanceEvent[]<br/>(each flyer with its size)"]
    DT --> ME["meta: Meta"]
    DT --> AC["accounts: academies with events"]
```

- **Typed once:** the JSON is cast to the types in `src/scripts/types.ts`, which mirror the backend's
  models. CI checked the files against the contract first.
- **Flyer sizes:** each flyer's pixel size is read at build time and added to its media item. Cards then
  show each flyer at its own shape without the page jumping while images load (section 5.4).
- **Build time only:** `data.ts` uses Node (`sharp`, the file system). The browser never imports it; it
  gets the data inside the page.

### 3.2 What the build generates

| Output | Source | What it is |
|---|---|---|
| `/` (`index.html`) | `pages/index.astro` | The app: header, toolbar, jump bar, both views, dialog, filter sheet. Every event is embedded as JSON (`<script type="application/json" id="events-data">`), and the browser renders the cards and calendar from it. The preview image is the brand's own (`/og/sitio.jpg`), not an event's flyer |
| `/evento/<id>/` | `pages/evento/[id].astro` | One page per event: where a shared link points. A browser is forwarded to the home page with the event open (section 5.3). Rendered at build time with the same markup as the dialog. Includes the link preview's tags (section 3.4) and schema.org `Event` data for search engines |
| `/og/<id>.jpg` | `pages/og/[id].jpg.ts` | Each event's link-preview image: 1200×630, the flyer with the date, title, place and price (section 3.4) |
| `/og/sitio.jpg` | `pages/og/sitio.jpg.ts` | The home page's link preview (1200×630): stripes, "Pa' Bailar", the tagline and the record. Drawn once with the site's fonts by `scripts/og-site.html` and stored as `src/assets/og-site.jpg` |
| `/thumbs/<flyer>.webp` | `pages/thumbs/[name].webp.ts` | A 160 px square thumbnail of every flyer, for the sheet with an event's posts (opened from the "▦ 16" badge on the flyer). A few KB each instead of the 100–200 KB flyer, so they show at once on a phone |
| `/calendario.ics` | `pages/calendario.ics.ts` | A subscribable calendar feed (iCalendar, RFC 5545) with every event. Rebuilt with the site, so subscribed calendars refresh on their own. No longer linked from the footer (it added little); kept so existing subscriptions keep working |
| `/manifest.webmanifest` | `pages/manifest.webmanifest.ts` | What lets a phone install the site like an app: name, colors, icons, full screen |
| `/icons/<name>.png` | `pages/icons/[name].png.ts` | The app icons (192, 512, maskable 512, Apple touch icon), made from SVG at build time |
| `/sw.js` | `pages/sw.js.ts` | The service worker: makes it installable and opens it offline with the last events (pages network first; flyers and build files cached). A new version per build |
| `/sitemap-index.xml` | `@astrojs/sitemap` | Home and every event page, for search engines (the 404 page is excluded) |
| `/404.html` | `pages/404.astro` | "Este evento ya pasó o no existe" (most missing addresses are old event links, whose events were deleted), the first four upcoming events as of the build, and a link home. Any other address gets "Esta página no existe" (a small script reads the path) |
| `/flyers/*.webp` | `data/flyers/` (public folder) | The flyers, copied as they are |
| `/previews/*.mp4` | `data/previews/` (public folder) | Videos' clips (6 silent seconds), copied as they are |

```mermaid
flowchart TD
    D["src/data.ts<br/>(events + flyer sizes)"] --> IDX["index.astro → /"]
    D --> EVT["evento/[id].astro → /evento/&lt;id&gt;/"]
    D --> OG["og/[id].jpg.ts → /og/&lt;id&gt;.jpg<br/>(linkPreviewImage.ts, section 3.4)"]
    D --> ICS["calendario.ics.ts → /calendario.ics"]
    D --> TH["thumbs/[name].webp.ts → /thumbs/&lt;flyer&gt;.webp"]
    IDX --> SM["sitemap-index.xml"]
    EVT --> SM
    PUB["data/ (public folder)"] --> FLY["/flyers/*.webp, /previews/*.mp4"]
```

**Shared code between build and browser:** the views in `src/scripts/` produce HTML strings, so the same
code renders an event's detail in the browser (the dialog) and at build time (the event page).

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
  inlines. Ours are two inline scripts, the theme before first paint (`BaseLayout.astro`) and the event pages'
  forward to the app (`evento/[id].astro`), written as strings and added with `allowInlineScript()`
  (`src/csp.ts`), which puts their hash in the page's policy.
- **Checked at every build** (`scripts/csp-meta.mjs`): Astro writes the `<meta>` at the end of `<head>`, where
  it wouldn't cover what comes before it; the integration moves it right after `<meta charset>`. It also fails
  the build if a page has an inline script or `<style>` the policy doesn't allow, or any `style=""` attribute.
  So a new inline script needs `allowInlineScript()`, and a style that depends on data is set from a script
  (`element.style`, which the policy allows), like the cards' flyer shape (`applyFlyerRatios`, `eventCard.ts`).
- **What a `<meta>` can't do:** `frame-ancestors` (who may frame the site), reports and other headers aren't
  possible on GitHub Pages.
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
  dom 4 oct, 9:00 a. m." (over several days "Level Up Bachata Fusion Congress — 13–15 nov", without the time); the
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
  - **Cost:** about 0.12 s per event: with 77 events the build takes about 10 s more (15 s instead of 5 s), and the
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
| `ci` | Every pull request (including data PRs, and title edits); manual | The PR title (Conventional Commits, `release.mjs check`). `npm ci`. Then `npm run check`, which is the data contract (`check-data.mjs`), `astro check` (strict TypeScript) and color contrast (`check-contrast.mjs`). Then `npm test` (Vitest), then `npm run build` | `contents: read` |
| `deploy` | Push to `main` (every merged PR); manual; the backend's sweep on days without changes (with `checked_at`) | **version** job: the version from the commits since the last tag (`release.mjs plan`); if they change the site, tag it and publish its GitHub Release. **build** job: `npm ci`, `npm run build` (with `PUBLIC_CHECKED_AT` and `PUBLIC_VERSION`), upload the Pages artifact. **deploy** job: publish to GitHub Pages (environment `github-pages`) | Version: `contents: write` (it runs no npm package). Build: `contents: read` only (it runs npm's install scripts). Deploy: `pages: write`, `id-token: write` |

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
    participant H as index.html
    participant I as Inline script (head)
    participant M as main.ts start()
    participant V as Views

    H->>I: before first paint
    I->>I: theme: saved mode, else light 6:00–17:59 / dark otherwise
    H->>M: module script after parsing
    M->>M: events = JSON from #events-data
    M->>M: theme toggle, event dialog, jump bar, view switch, click tracking
    M->>V: render(): filters, Próximos or Calendario, jump bar, view switch
```

- **No data request:** the events arrive inside the HTML, so the first render needs no network.
  The flyers load lazily as they come into view.
- **One delegated click listener** in `main.ts` handles every control marked with a `data-*` attribute:
  view, type, style, date, academy, clear filters, day, month, today, event.

### 5.2 State and rendering

```mermaid
flowchart TD
    ST["AppState (state.ts)<br/>view · typeFilter · styles · dates ·<br/>accountFilter · query · savedOnly · month · selectedDay"]
    CLICK["Click on a data-* control<br/>(main.ts handleClick)"] --> ST
    ST --> R["render()"]
    R --> F["filters.ts<br/>date, type and style chips<br/>(toolbar and filter sheet)"]
    R --> U["upcomingView.ts<br/>Próximos: events grouped by period"]
    R --> C["calendarView.ts<br/>Calendario: month grid + the day's events"]
    R --> J["jumpBar.ts<br/>phones: ⚙ · dates ▾ · rhythm ▾"]
    R --> VS["viewSwitch.ts<br/>phones: floating calendar / list button"]
    U --> CARD["eventCard.ts"]
    C --> CARD
    CARD -- "tap" --> DLG["eventDialog.ts<br/>viewer: swipe between events"]
    DLG --> DET["eventDetail.ts"]
```

- **The state is a plain object** (`state.ts`), and every change re-renders the visible parts. There's
  no framework: the views return HTML strings, inserted with `innerHTML` after escaping every value from
  the data (`lib/dom.ts`, `escapeHtml`).
- **Filtering** (`matchesFilters`): an event must pass every group (AND), and within the rhythms and the dates
  any choice will do (OR):
  - **Dates** (`dates`, several): periods of the list ("hoy", "fin-de-semana", "2026-11"…) plus "manana"
    (`TOMORROW`). An event matches when any of its days from today falls in a chosen period (`matchesDates`), so an
    event over several days counts in each period it runs through. The list then shows it on its first such day
    (`listedDay`), and `groupByPeriod` gives "Mañana" a group of its own when it's chosen. Upcoming list only: the
    calendar ignores them.
  - **Type** (`typeFilter`, one): social, workshop…
  - **Rhythms** (`styles`, several): filtering by a family ("salsa") also matches its variants ("salsa caleña").
  - **Academy:** set by tapping an academy's name on a card.
  - **Search** and **Guardados**.

  The options (`filterOptions` in `views/filters.ts`, `dateOptions` in `state.ts`) are counted against the other
  groups (`matchesFilters(event, state, except)`): an option that would add nothing isn't offered, so a choice never
  leads to an empty list; chosen ones stay so they can be unchosen. Filters live only in memory: not in the URL or
  storage, as before (`DESIGN.md`, "Filters").
- **"Próximos"** groups upcoming events by period: today, this week, this weekend, next week, the rest
  of the month, then one group per month for the next six months, and one per year beyond that
  (`groupByPeriod`). On phones, cards read like an Instagram feed. An event over several days (`end_date`)
  is upcoming until its last day, and once it has started it's listed under "Hoy" every day it goes on
  (`shownDay` in `lib/dates.ts`).
  Long lists stay short where it matters: the near periods show their flyers in full (six, then "Ver N más"),
  and later periods start as a summary row ("Ver los 23 eventos"); `DESIGN.md`, "Long lists".
- **"Calendario"** shows a month grid. Dots mark days with events, Colombian holidays are tinted, and
  the selected day's events are listed below. An event over several days is on each of its days
  (`groupByDay`), across months too: a festival from 31 October to 2 November shows in both months.
- **Keeping your place:**
  - when a filter changes while you're reading the list, the period you were in stays under the bar;
  - each view remembers its scroll position, so switching to the calendar and back returns you to the
    same spot.

### 5.3 The event viewer and URLs

```mermaid
stateDiagram-v2
    [*] --> List
    List --> Viewer: tap a card / pushState /evento/<id>/
    Viewer --> Viewer: swipe, ‹ ›, arrow keys / replaceState /evento/<other id>/
    Viewer --> List: ×, Escape, drag down, or back
    [*] --> EventPage: a shared link, or a link opened in a new tab
    EventPage --> Viewer: forwards to /?evento=<id>, the list behind
```

- **The viewer is a `<dialog>`** with one slide per event on screen, in list order. Swiping uses CSS
  scroll snapping. On phones it's a bottom sheet you can drag down to close (`lib/sheet.ts`).
- **Only three slides have content:** the current event and its two neighbors (`views/viewerWindow.ts`). The
  others are empty slides of the same width, filled as a swipe gets near them; closing the viewer empties them
  all. Rendering every slide loaded every flyer of the list at once, which made iPhones close the page
  (section 5.7).
- **The address bar follows the event:**
  - opening pushes the event's own URL to the history, so the phone's back button closes the viewer;
  - swiping replaces it, so back still closes instead of stepping through events;
  - every event's URL is a real page (`/evento/<id>/`), so copying the address shares the event.
- **A shared link opens the app:** the event's page forwards a browser to the home page with `?evento=<id>`, which opens that event in the viewer with the list behind it (`main.ts`, `openSharedEvent`). Link previews and search engines read the event's page itself (they don't run scripts).
- **The event page** (`eventPage.ts`) is already rendered at build time; a browser leaves it for the app
  at once. Its script only adds the theme toggle, the sheet with an event's posts, and click tracking.
- **The actions** are plain links built in `lib/links.ts`:
  - "Ver en Instagram" opens the post;
  - "Compartir" opens the phone's share menu with the event's text and page URL (`views/sharing.ts`);
  - "Cómo llegar" opens Google Maps' search URL.

### 5.4 Flyers

- **Never cropped:** on phones each flyer shows at its own shape, from 4:5 (portrait) to 1.91:1
  (landscape), like Instagram's feed. The size comes from the build (section 3.1), so nothing jumps
  while images load.
- **Taller flyers, and every card on wide screens,** get a 4:5 frame, with the flyer fitted whole over a
  blurred copy of itself.
- **Lazy loading:** every card image uses `loading="lazy"` and `decoding="async"`.

### 5.5 Installing, saving and searching

- **Install:** `views/installPrompt.ts` offers it (a banner under the header, a footer link): Chrome/Edge's own dialog, or a sheet with the steps for where the visitor is (`lib/installPlace.ts`, from the user agent: Safari 26, earlier Safari, other iPhone browsers, apps' own browsers, Android). On iPhone the page can't tell whether it was added, so "Ya la agregué" and closing the steps hide the banner (section 5.7). It also registers the service worker (built site only).
- **Saved events** live in this browser (`lib/saved.ts`, localStorage); "Guardados" filters the list and the calendar to them.
- **Search** (`lib/search.ts`) runs on the events already in the page, accent-insensitive, every word anywhere in the event.
- **Sharing** (`views/sharing.ts`) goes through the phone's share menu: an event (its link, whose preview shows the flyer, date, title, place and price: section 3.4), a near period or the visitor's plans (an image drawn in the browser, `lib/shareCard.ts`, and a list for WhatsApp).

### 5.6 Themes

- **Two themes:** "Fania de día" (light) and "Noche Fania" (dark).
- **Three modes:** auto, light and dark. **Auto** follows the visitor's clock: light from 6:00 to 17:59,
  dark the rest of the day, switching on its own while the page is open.
- **Remembered** in `localStorage`. An inline script in `BaseLayout.astro` applies it before the first
  paint, so the page never flashes the wrong theme (allowed by its hash, section 3.3).
- **Colors** are CSS tokens with `light-dark()` (`styles/tokens.css`); [`DESIGN.md`](DESIGN.md) has
  them all.

### 5.7 iPhone (Safari)

Every browser on an iPhone is Safari's engine (WebKit), with its own limits:
- **Memory.** iOS closes a tab that uses too much memory ("A problem repeatedly occurred on…", the page
  reloads), with no error the page can catch. Decoded images are the big cost: a 1080×1350 flyer is about
  6 MB once decoded, whatever its file size. So:
  - the viewer renders only the current event and its neighbors (section 5.3). Before, opening any event
    rendered a slide per event in the list: 35 flyers (about 190 MB decoded) and every clip, loaded at once,
    and kept after closing. Measured in WebKit with an iPhone profile: opening an event took the page from
    100 MB to 235 MB, and four open/close rounds to 573 MB; now 118 MB and 215 MB;
  - the one-time swipe nudge animates only those rendered slides;
  - videos' clips (`views/clips.ts`): `preload="none"`, muted, `playsinline`, one playing at a time; a clip that
    leaves the page is released (unwatched, its `src` removed and reloaded), so its decoder and buffers go;
  - Instagram's player (an iframe) is removed when its slide goes off screen, when the viewer closes and when
    the post sheet closes.
- **One bad event can't break the viewer:** a slide that fails to render shows a link to the event's page
  instead (`eventDialog.ts`).
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
  `DTEND;VALUE=DATE:20261116`); schema.org's `endDate` is the last day.
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
| **GoatCounter** (`jzamora9.goatcounter.com`) | Visit statistics, without cookies or personal data, so no consent banner is needed | Page views. Each event opened in the viewer, as a view of its page. Clicks on elements with `data-track` (Instagram, the contact links, "Cómo llegar", sharing, saving, installing, reports). Local testing isn't counted. Its script (`count.js`) is a copy served from the site (`src/vendor/goatcounter-count.js`, ISC license), not loaded from `gc.zgo.at`: the policy (section 3.3) then allows no other script host, and GoatCounter keeps its `/count` endpoint compatible, so the copy needs no updates | Nothing breaks: the script is optional and wrapped in `try` (`lib/analytics.ts`) |
| **Instagram embed** (`instagram.com/embed.js`) | Showing a post inside the site when a visitor taps a flyer (videos play, carousels swipe) | Loaded only on that tap, never with the page: the post's link; Instagram's player then runs as Meta's code (and cookies) inside its frame | Our copy of the flyer stays, with "Abrir en Instagram" (also when a post's link can't be read) |
| **Google Fonts** | Shrikhand, Bodoni Moda (italic) and Instrument Sans | The font request | System fonts are used |
| **Instagram, WhatsApp, Google Maps** | Links the visitor chooses to open | Only what's in the link | |
| **Google Forms** (the author's account) | Reports and ideas: "¿Algo está mal? Repórtalo" in each event's detail (the event filled in, `lib/links.ts`, `feedbackUrl`) and "Escríbenos" in the footer. No account needed; answers go to a Google Sheet and an email | What the visitor writes, and the event it's about | Nothing on the site: it's a link |

Flyers are copies served from this repository, so the site never needs Instagram to show events. The
only Instagram content it loads is a post's player, and only when a visitor taps a flyer to watch it.

---

## 8. Quality checks

| Check | What it verifies | Where |
|---|---|---|
| Data contract | Every field of `events.json` and `meta.json`: types, allowed values (event types, styles, confidence), real dates and time formats, `end_date` after `date` and within 7 days, unique ids, usernames, post links (`instagram.com/<p, reel, reels or tv>/<code>/`), flyer and clip paths (inside `flyers/` and `previews/`) and their files existing, sorting | `frontend/scripts/check-data.mjs` |
| Types | `astro check`: strict TypeScript, including `noUncheckedIndexedAccess` | `tsconfig.json` |
| Color contrast | Every color pair the site uses, in both themes, against WCAG 2.2 AA. It reads the tokens from `tokens.css`, so it can't drift from the design system | `frontend/scripts/check-contrast.mjs` |
| Unit tests | Dates and Bogotá's "today", formatting, filtering (rhythms and dates, "Mañana", the options and their counts) and period grouping, holidays, the policy check, where the visitor can install from and its steps, which viewer slides are rendered, link previews (their text, the image's version, one image drawn with and one without a flyer) | `frontend/tests/*.test.ts` (Vitest) |
| Build | Every page, image and feed is generated; every page's Content Security Policy allows its inline scripts and styles, and no page has a `style=""` attribute (section 3.3); every event's link preview has its tags and a 1200×630 JPEG under 280 KB (section 3.4) | `npm run build`, `frontend/scripts/csp-meta.mjs`, `frontend/scripts/og-check.mjs` |

All five run in `ci` on every pull request, and the ruleset requires `ci` before merging.

---

## 9. Code map

```
frontend/
  astro.config.mjs        site URL, public folder (../data), sitemap, DATA_DIR, Content Security Policy
  vitest.config.ts        unit tests, with Astro's settings
  scripts/                check-data.mjs, check-contrast.mjs (run by npm run check); release.mjs (versions);
                          og-site.html (draws the home page's link preview); csp-meta.mjs (the policy, after
                          the build); og-check.mjs (the events' link previews, after the build)
  tests/                  Vitest tests, factories.ts (test events)
  src/
    data.ts               the data, typed, with flyer sizes (build time only)
    csp.ts                allowInlineScript(): an inline script, allowed by its hash (build time only)
    linkPreviewImage.ts   an event's link-preview image: satori + sharp (build time only)
    vendor/goatcounter-count.js   GoatCounter's script, served from the site
    env.d.ts              the build's variables: PUBLIC_CHECKED_AT, PUBLIC_VERSION
    assets/og-site.jpg    the home page's link preview, drawn by scripts/og-site.html
    assets/fonts/og/      the fonts drawn into the events' link previews (TTF, with their OFL licenses)
    layouts/BaseLayout.astro   <head>: meta, previews, fonts, theme before paint, GoatCounter, the CSS
    pages/
      index.astro         the app
      evento/[id].astro   an event's page (forwards browsers to the app)
      og/[id].jpg.ts, og/sitio.jpg.ts   link previews
      thumbs/[name].webp.ts   flyer thumbnails
      icons/[name].png.ts, manifest.webmanifest.ts, sw.js.ts   installing (icons, manifest, service worker)
      calendario.ics.ts   the calendar feed (no longer linked)
      404.astro
    components/           SiteHeader, ThemeToggle, Stripes, ViewToolbar, ViewSwitch, JumpBar, FilterSheet,
                          CalendarView, EventDialog, PostsSheet, PostViewer, InstallOffer, SiteFooter
    scripts/
      main.ts             entry point of the home page: state, clicks, render
      eventPage.ts        entry point of an event's page
      state.ts            AppState, filtering, period grouping
      screenHistory.ts    the phone's back between the app's screens
      types.ts            DanceEvent, EventMedia, Meta, AppState (mirror of the backend's models)
      theme.ts, themeConfig.ts   theme modes
      views/              upcomingView, calendarView, eventCard, eventDetail, eventDialog, filters,
                          jumpBar, viewSwitch, postsSheet, postViewer, inlinePlayer, clips, saveButton,
                          sharing, installPrompt, viewerWindow (HTML strings + their behavior)
      lib/                dates, holidays, format, links, linkPreview, contact, mediaLabel, search, saved,
                          share, shareText, shareCard, analytics, dom, icons, sheet, instagramEmbed, installPlace
    styles/               tokens.css (design tokens), base.css, components/*.css
```

| Module | Responsibility |
|---|---|
| `data.ts` | Reads `data/`, adds flyer sizes, lists the academies |
| `state.ts` | The UI state; filtering (AND across groups, OR within rhythms and dates); grouping by period; the date options |
| `views/upcomingView.ts` | "Próximos" |
| `views/calendarView.ts` | "Calendario", with holidays |
| `views/eventCard.ts` | A card: flyer at its shape, date sticker, details |
| `views/eventDetail.ts` | An event's full detail (dialog and page): the flyer of each post, details, prices, actions |
| `views/eventDialog.ts`, `views/viewerWindow.ts` | The viewer: slides (only the current event and its neighbors rendered), swiping, URL history, closing |
| `screenHistory.ts` | History entries for the app's screens (academy, period, calendar, saved): the phone's back steps through them |
| `views/filters.ts` | Date, type and style chips, the academy notice; the rhythm and date options with their counts; the dropdowns' labels |
| `views/jumpBar.ts` | Phones: the sticky bar, its checklist menus (dates, rhythms), keeping your place, hiding on scroll |
| `views/viewSwitch.ts` | Phones: the floating calendar / list button |
| `lib/links.ts` | Every URL built from an event: flyer, clip, page, link preview, Maps, the report form |
| `lib/linkPreview.ts`, `linkPreviewImage.ts` | A shared link's preview: its title, description, the image's text and version; the image itself (build time) |
| `lib/mediaLabel.ts` | What the label over a post's image says (Ver con sonido, Ver video, Ver las N), and which cards get a ▶ |
| `lib/sheet.ts` | Bottom sheets that drag to dismiss; panel sheets with their own back-button step |
| `lib/instagramEmbed.ts` | Instagram's player for a post, its script loaded on demand |
| `views/postsSheet.ts`, `views/postViewer.ts` | An event's posts (Flyers / Videos); a post watched inside the site |
| `views/inlinePlayer.ts` | A video tapped in the detail plays in the image's place (Instagram's player), removed when off screen |
| `views/clips.ts` | Videos' clips in the detail: the one on screen plays, silent and looping, one at a time; released when they leave the page |
| `lib/contact.ts` | The organizer's contact as a link: Instagram, WhatsApp, phone or website |
| `lib/search.ts` | Search over the events in the page |
| `lib/saved.ts`, `views/saveButton.ts` | Saved events ("Guardados"): the ids in this browser; the bookmarks and toggles |
| `lib/share.ts`, `lib/shareText.ts`, `lib/shareCard.ts`, `views/sharing.ts` | Sharing through the phone's menu: the text, the image of a list, what each share button sends |
| `views/installPrompt.ts`, `lib/installPlace.ts` | Installing the site like an app: the offer, and the steps for each browser; registers the service worker |
| `lib/analytics.ts` | GoatCounter events |
| `lib/dom.ts`, `lib/icons.ts` | DOM helpers and `escapeHtml`; inline SVG icons |
| `lib/dates.ts`, `lib/holidays.ts`, `lib/format.ts` | Dates in Bogotá, Colombian holidays, Spanish formatting |

---

## 10. Working on the site

From `frontend/` (Node 24):

```bash
npm ci
npm run dev       # http://localhost:4321, with the current data/
npm run check     # data contract, types, contrast
npm test
npm run build     # frontend/dist/
npm run preview   # the build, as published (with its Content Security Policy)
```

Changes go on a branch, through a pull request with a Conventional Commits title, and merge when `ci`
passes. The README has the details. A visual change follows [`DESIGN.md`](DESIGN.md). A change to the
data's shape starts in the backend (`models.py`), then [`DATA.md`](DATA.md), `types.ts` and
`check-data.mjs` here, behind a new `schema_version`.
