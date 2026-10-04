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
| `data/events.json` | backend | frontend (build) | Array of events, sorted by date (an event over several days: its first day) and start time |
| `data/meta.json` | backend | frontend (build) | `schema_version`, `generated_at` (Bogotá time), `accounts` (every Instagram account the sweep reads, sorted; the footer's sources, including those without upcoming events; optional for older data) and stats of the last sweep that changed data. Only committed with a real change; the site's "Actualizado el" uses the time of the last check, passed by the deploy, falling back to `generated_at`. |
| `data/flyers/*.webp` | backend | frontend (static files) | Flyer copies, max 1080×1350, WebP q80 |
| `data/previews/*.mp4` | backend | frontend (static files) | Clips of videos: 6 silent seconds, 480 px, H.264 (`EventMedia.preview`) |


## Event (`events.json` item)

| Field | Type | Notes |
|---|---|---|
| `id` | string | Readable title + day + month (the first day for an event over several days), e.g. `social-de-halloween-24-oct` (`-2`, `-3`… if taken). It's the event's URL (`/evento/<id>/`), so it's set once and never changes: not when more posts are merged in, nor when a re-extraction rewords the title (the backend's `pa_bailar/ids.py`). |
| `title` | string | As written on the flyer |
| `event_type` | `social` · `workshop` · `concert` · `festival` · `congress` · `competition` · `show` · `other` | `social` includes parties; `workshop` includes one-time special classes; `congress` is a multi-day dance congress or encuentro (workshops, socials, shows, often a full pass), `festival` a festival of music or dance in general |
| `is_recurring` | boolean | Always `false` in stored data (recurring events are discarded) |
| `styles` | Style[] | From the fixed list below; de-duplicated |
| `organizer`, `venue`, `address`, `area` | string \| null | |
| `date` | `YYYY-MM-DD` | Always a valid date (events without one are discarded). For an event over several days, its first day |
| `end_date` | `YYYY-MM-DD` \| null (optional) | Only for an event over several consecutive days (a congress, a festival weekend): its last day, inclusive. After `date`, and at most 7 days in all (`end_date` ≤ `date` + 6). Null for a one-day event, including a night past midnight; absent in data written before it existed |
| `weekday` | string \| null | Spanish, as Gemini read it |
| `start_time`, `end_time` | `HH:MM` \| null | 24-hour; invalid times become `null` and are noted in `doubts`. Over several days: the first day's start and the last day's end (null when the post only gives a schedule per day) |
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
  `weekday` go by the first day). The same workshop on separate, non-consecutive dates is one event per date.
- **One event, many posts:** a flyer, a video and a reminder of the same event are one event with several `media` (see the backend's `pa_bailar/merging.py`).
- **Re-analyzing a post** first removes what it contributed, so nothing is duplicated.
- **Writes are atomic** (temp file + rename) and every load/save is validated against the models.
- **Line endings are LF**, so files are identical on Windows and on the Linux CI runner.
- **Retention:** every sweep deletes events whose last day (`end_date`, or `date`) was more than 60 days ago and their flyers, and forgets analyzed posts older than 45 days (in the backend).
