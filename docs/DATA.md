# Data contract

The backend (a private repository, `pa-bailar/backend`) writes `data/` through a pull request
after each sweep that changes it (it sweeps twice a day, at 9 AM and 9 PM Bogotá time); the frontend
only reads it. The backend's Pydantic models are the source of truth;
[`frontend/src/scripts/types.ts`](../frontend/src/scripts/types.ts) mirrors them, and
[`frontend/scripts/check-data.mjs`](../frontend/scripts/check-data.mjs) checks every data PR against
this contract in CI. Breaking changes bump `schema_version` in `meta.json` and change both
repositories (backend first, behind the new version).

## Files

| File | Written by | Read by | Content |
|---|---|---|---|
| `data/events.json` | backend | frontend (build) | Array of events, sorted by date (an event over several days: its first day; a workshop series: its first session) and start time |
| `data/meta.json` | backend | frontend (build) | `schema_version`, `generated_at` (Bogotá time), `accounts` (every Instagram account the sweep reads, sorted; the footer's sources, including those without upcoming events; optional for older data) and stats of the last sweep that changed data. Only committed with a real change; the site's "Actualizado el" uses the time of the last check, passed by the deploy, falling back to `generated_at`. |
| `data/flyers/*.webp` | backend | frontend (static files) | Flyer copies, max 1080×1350, WebP q80 |
| `data/previews/*.mp4` | backend | frontend (static files) | Clips of videos: 6 silent seconds, 480 px, H.264 (`EventMedia.preview`) |


## Event (`events.json` item)

| Field | Type | Notes |
|---|---|---|
| `id` | string | Readable title + day + month (the first day for an event over several days, the first session for a workshop series), e.g. `social-de-halloween-24-oct` (`-2`, `-3`… if taken). It's the event's URL (`/evento/<id>/`), so it's set once and never changes: not when more posts are merged in, nor when a re-extraction rewords the title (the backend's `pa_bailar/ids.py`). |
| `title` | string | As written on the flyer |
| `event_type` | `social` · `workshop` · `concert` · `festival` · `congress` · `competition` · `show` · `other` | `social` includes parties; `workshop` includes one-time special classes; `congress` is a multi-day dance congress or encuentro (workshops, socials, shows, often a full pass), `festival` a festival of music or dance in general |
| `is_recurring` | boolean | Always `false` in stored data (recurring events are discarded) |
| `styles` | Style[] | From the fixed list below; de-duplicated |
| `organizer`, `venue`, `address`, `area` | string \| null | |
| `date` | `YYYY-MM-DD` | Always a valid date (events without one are discarded). For an event over several days, its first day; for a workshop series, its first session's |
| `end_date` | `YYYY-MM-DD` \| null (optional) | For an event over several consecutive days (a congress, a festival weekend): its last day, inclusive. After `date`, and at most 7 days in all (`end_date` ≤ `date` + 6). For a workshop series: its last session's date (up to `date` + 122, see [Workshop series](#workshop-series)). Null for a one-day event, including a night past midnight; absent in data written before it existed |
| `sessions` | `Session[]` \| null (optional) | Only for a workshop series: its 2 to 12 dated sessions, in order (see [Workshop series](#workshop-series)). `null` for every other event, including one over consecutive days; absent in data written before it existed |
| `weekday` | string \| null | Spanish, as Gemini read it |
| `start_time`, `end_time` | `HH:MM` \| null | 24-hour; invalid times become `null` and are noted in `doubts`. Over several days: the first day's start and the last day's end (null when the post only gives a schedule per day). A workshop series: its first session's (`weekday` too) |
| `prices` | `{label, amount_cop, condition}[]` | `amount_cop` ≥ 0; `0` means free |
| `artists`, `activities` | string[] | |
| `contact` | string \| null | How to reach the organizer: an @username, a website or a phone number (`WhatsApp 3001234567` when the post marks it as WhatsApp) |
| `confidence` | `high` · `medium` · `low` | Gemini's own estimate |
| `doubts` | string[] | Missing or assumed details, in Spanish |
| `account` | string | Instagram username of the organizer: letters, digits, `.` and `_`, up to 30 |
| `media` | `EventMedia[]` | Every post (or story) announcing the event. Main post first: flyers (images and carousels) before videos, newest first within each, so the latest flyer is the cover; stories last, so a post's flyer is the cover once there is one. The site keeps this order. At least one; it can be a single story. |

### EventMedia

| Field | Type | Notes |
|---|---|---|
| `post_id` | string | Instagram media id, or `public-<code>` for a post read from its public page, or `story-<hash>` for a story (letters, digits, `_` and `-` after `story-`) |
| `permalink` | string | Link to the post: `https://www.instagram.com/<p, reel, reels or tv>/<code>/`. A story: the account's profile, `https://www.instagram.com/<account>/` (a story's own link dies after 24 hours); `<account>` is a username, not one of Instagram's paths (`p`, `reel`, `reels`, `tv`, `stories`, `explore`, `accounts`, `direct`) |
| `media_type` | `IMAGE` · `CAROUSEL_ALBUM` · `VIDEO` · `STORY` | `STORY`: a screenshot of an Instagram story, added by hand (see [Stories](#stories)) |
| `published` | string | Instagram timestamp, e.g. `2026-09-30T12:00:00+0000` |
| `flyer` | string \| null | Path relative to `data/`, `flyers/<post id>-<slide>.webp`, or `flyers/<post id>.webp` for flyers saved before slides were in the name. Shared by events announced on the same image. |
| `caption` | string \| null | Post text |
| `preview` | string \| null (optional) | When the flyer is a video's frame (a reel, or a carousel's video slide): a short silent clip of it, path relative to `data/`, `previews/<post id>-<slide>.mp4` (6 s, 480 px, H.264). Absent or null otherwise, and for videos Instagram gives no file for |
| `slides` | integer \| null (optional) | Carousels: how many slides. Absent or null for a single photo or video, and in data written before it existed |

### Stories

An event can come from an Instagram story: the owner shares a screenshot of it with the admin page, and the
backend reads it. Most such events never get a post, so a story can be an event's only media. Its `EventMedia`:

- `media_type`: `"STORY"`; `post_id`: `story-<hash>` (of the image).
- `permalink`: the account's profile, `https://www.instagram.com/<account>/`, never the story's own link.
- `flyer`: the story cropped to its content, `flyers/story-<hash>-<slide>.webp`; never the full screenshot.
- `caption`: null (the owner's notes aren't published). `published`: when the screenshot was taken.
- Everything else as for `IMAGE`.

On the site a story's flyer is a plain image labeled "Historia" (no Instagram player: there's no post to show),
with "De una historia de @cuenta · las historias duran 24 horas" and "Ver perfil en Instagram ↗" opening the
profile. `check-data.mjs` accepts a `STORY` only with a profile link, and a post only with a post link.

### Workshop series

A finite program people sign up for once and attend on separate, non-consecutive days, every one of them dated in
the post: a "programa intensivo" on Sundays 8, 22 and 29 November and 6 December, a "ciclo de talleres", a short
course. It's **one event** with `sessions` (the owner's decision of 4 October 2026; the backend's
`docs/ARCHITECTURE.md`, section 9.1):

```json
{
  "id": "programa-intensivo-de-bachata-8-nov",
  "date": "2026-11-08",
  "end_date": "2026-12-06",
  "sessions": [
    { "date": "2026-11-08", "start_time": "14:00", "end_time": "17:00" },
    { "date": "2026-11-22", "start_time": "14:00", "end_time": "17:00" },
    { "date": "2026-11-29", "start_time": "14:00", "end_time": "17:00" },
    { "date": "2026-12-06", "start_time": "14:00", "end_time": "17:00" }
  ],
  "weekday": "domingo",
  "start_time": "14:00",
  "end_time": "17:00"
}
```

| Rule | |
|---|---|
| Sessions | 2 to 12, sorted by date, no date twice. Each `Session` has all three keys: `date` (a real `YYYY-MM-DD`), `start_time` and `end_time` (`HH:MM` or null) |
| Span | The last session at most 123 days in all after the first (about 4 months): `end_date` ≤ `date` + 122 |
| The event's own fields | `date` is the first session's date and `end_date` the last's; `start_time`, `end_time` and `weekday` the first session's; the id is named after the first session |
| Not a series | An event over consecutive days keeps `date` and `end_date` (7 days at most) with `sessions` null; a workshop repeated on another date (people attend one) is one event per date |

`check-data.mjs` checks these rules (the backend's `models.series_problems` holds the same) and applies them instead of
the 7-day limit when `sessions` isn't null. `schema_version` stays 1: the field is additive, and data without it reads
as no series.

On the site a series is upcoming until its last session and is on its sessions' days only: the list shows it under its
next session's day (it moves on as each one passes), the date filters and the calendar count its session days, its card
shows the next session ("4 sesiones · próxima: dom 22 nov"; within a week "Domingo · 2:00 p. m. · sesión 3 de 4"), and
its details list every session. The calendar feed has one entry per session. How: `ARCHITECTURE.md`, sections 5.2
and 6.

### Dance styles

Salsa and bachata have one level of specificity. The plain name is used when the variant can't be told, and it's dropped when a variant is known. Every other style stays general. The list is `Style` in `models.py`, and the synonyms are in `normalize.py`.

| Style | Includes |
|---|---|
| `salsa` | salsa, variant not stated |
| `salsa cubana` | casino, rueda de casino, timba |
| `salsa en línea` | on1, on2, mambo, New York / Los Angeles style |
| `salsa caleña` | estilo caleño |
| `bachata` | bachata, variant not stated (also moderna / fusión) |
| `bachata sensual` | |
| `bachata dominicana` | tradicional |
| `merengue`, `cha cha chá`, `son`, `kizomba`, `zouk`, `champeta`, `dancehall`, `heels`, `tango`, `swing` | as named |
| `urbano` | reguetón, hip hop, street |
| `afro` | afro, afrobeat, rumba cubana |
| `otro` | anything else |

On the site, filtering by **Salsa** or **Bachata** also shows their variants.

## Rules

- **Only one-time events with a valid date** are stored. Regular classes and recurring nights are dropped.
- **An event over several consecutive days is one event** with `date` and `end_date` (its id, sorting and
  `weekday` go by the first day). A workshop repeated on another date (people attend one) stays one event per date;
  a workshop series (one sign-up, every session attended) is one event with `sessions` ([Workshop series](#workshop-series)).
- **One event, many posts:** a flyer, a video and a reminder of the same event are one event with several `media` (see the backend's `pa_bailar/merging.py`).
- **Re-analyzing a post** first removes what it contributed, so nothing is duplicated.
- **Writes are atomic** (temp file + rename) and every load/save is validated against the models.
- **Line endings are LF**, so files are identical on Windows and on the Linux CI runner.
- **Retention:** every sweep deletes events whose last day (`end_date`, or `date`; a series: its last session) was more than 60 days ago and their flyers, and forgets analyzed posts older than 45 days (in the backend).
