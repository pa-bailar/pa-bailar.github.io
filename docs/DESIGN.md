# Pa' Bailar design system

Two themes, one system:

| Theme | Name | Mood | Source |
|---|---|---|---|
| Light | **Fania de día** | A 1970s salsa flyer: cream offset paper, tomato red and marigold ink | New York salsa graphics (Izzy Sanabria, Fania Records), 1968–88 |
| Dark | **Luz de escenario** | The late-night social: a hotel ballroom in an indigo and violet wash, a magenta gel spot from above, gold lettering, pink accents. | European *bachata sensual* socials and festivals, 2010s–2020s |

The **structure** (type, motifs, components) comes from Fania. The **mood** of the dark theme comes from bachata sensual. Both themes share every component; only the color values change, plus the dark theme's lighting ("Luz de escenario", below).

**Light by default.** Everyone sees Fania de día first, whatever the device's light/dark setting or the time: it's the site's main look. The switch in the top right shows the current theme, **☀ Claro** or **☾ Oscuro**, and a tap changes to the other one:
- **Remembered** on that device (`localStorage`, key `theme`: `light` or `dark`). Where storage is blocked (private mode), the switch still works for that visit.
- **Older saved values** (the old "Auto" mode, anything unknown) read as Claro and are removed.
- **Without JavaScript:** Claro.

## Files

```
frontend/src/styles/
├─ tokens.css            ← every design decision lives here
├─ base.css              ← element defaults, .container, shared text styles, utilities
└─ components/           ← one file per component, named like the component
   ├─ stripes.css
   ├─ buttons.css
   ├─ tags.css
   ├─ site-header.css
   ├─ toolbar.css
   ├─ event-card.css
   ├─ calendar.css
   ├─ event-detail.css   ← an event's details: the parts shared by the drawer and the event's page
   ├─ drawer.css         ← the details drawer over the list (phones), the side panel (wide screens)
   ├─ sheet.css          ← bottom sheets: rise, drag to dismiss (with scripts/lib/sheet.ts)
   ├─ jump-bar.css       ← phones: the pinned bar, its row of chips and the line under it
   ├─ filters.css        ← the filter chips (bar, sheet, toolbar), "Cuándo" and its menu, the line and the toolbar's status row
   ├─ view-switch.css    ← phones: the floating calendar / list button
   ├─ posts-sheet.css    ← every post announcing an event
   ├─ post-viewer.css    ← a post with Instagram's player
   ├─ filter-sheet.css
   ├─ site-footer.css
   └─ install.css        ← installing the site: the banner and the steps sheet
```

## Tokens

`tokens.css` has three layers:

1. **Palette:** raw named colors (`--wine-900`, `--tomato-600`, `--marigold-600`…). **Components never use these.**
2. **Semantic colors:** what a color is *for* (`--bg`, `--surface`, `--text-muted`, `--accent`, `--action`…). Each is `light-dark(<Fania de día>, <Luz de escenario>)`. **Components only use these.**
3. **Scales:** type sizes, spacing, radii, control sizes, motion.

Themes switch through CSS `color-scheme`: `light` at `:root`, `dark` only under `html[data-theme="dark"]`. An inline script in `<head>` (`src/themeScript.ts`, put in every page by `BaseLayout.astro`) reads the saved choice and sets `data-theme` before first paint, so a visitor who chose Oscuro never sees a flash of Claro; it also sets the `theme-color` meta for the phone's address bar. The Content Security Policy allows it by its hash (`ARCHITECTURE.md`, section 3.3). `scripts/theme.ts` runs the switch; the switch's icon and label follow `data-theme` through CSS, so they're right before any script loads. Both share their rule (only a saved `dark` is dark) and colors through `scripts/themeConfig.ts`. The installed app's manifest uses the light theme's paper for its splash screen and bar.

### Semantic colors

| Token | Fania de día | Luz de escenario | Use |
|---|---|---|---|
| `--bg` | cream-150 (aged offset paper) | indigo-900 `#16122b` (the ballroom) | Page background |
| `--surface` | cream-75 | indigo-800 `#221c3d` | Cards, dialog, buttons |
| `--surface-sunken` | cream-250 | indigo-950 `#0e0b1f` | Image wells, callouts |
| `--border` | wine-900 | indigo-400 `#8579b0` | Outlines of cards, chips, buttons |
| `--divider` | cream-300 | indigo-600 `#382f5c` | Lines between sections and rows |
| `--text` | wine-900 | lilac-50 `#f5eef7` | Body text |
| `--text-muted` | cocoa-500 | lilac-300 `#c3b7db` | Metadata, captions |
| `--text-italic` | wine-500 | pink-250 `#f6a9d2` | Bodoni italic accents |
| `--logo` | tomato-600 | gold-300 `#f4c542` | The wordmark |
| `--accent` | tomato-600 | pink-400 `#ff7eb9` | Event time, active tab, selected day |
| `--action` / `--on-action` | deep orange / white | gold / ink `#1c1033` | A primary button ("Ver eventos" in the Filtros sheet, "Instalar", the 404's), shaped like the WhatsApp one |
| `--accent-text` | tomato-700 | pink-400 | The accent as a word on the page: "× Limpiar" (4.93:1; `--accent` is 4.0:1 on the page) |
| `--chip-active-*` | wine / cream | pink-300 `#ff9fcb` / ink | Selected filter chip, the badges on ⚙ and 🔖 |
| `--dimmed` | cocoa-200 | indigo-400 | A filter option with nothing to show: its label and dashed outline (inactive, exempt from contrast) |
| `--details-ink` | wine-900 | lilac-300 `#c3b7db` | The cards' "Detalles ›": its frame (13.4:1 and 9.62:1 on the page; 8.54:1 on a dark card); the label is `--text` |
| `--details-pressed` | cream-250 | indigo-800 | "Detalles ›" pressed: the frame's fill |
| `--scrim` | wine-950 | indigo-975 | Under the details drawer: 32% at half height, 55% at full |
| `--backdrop` | wine at 60% | indigo-black at 78% | Behind the bottom sheets (the filters, the posts, the media viewer, the install steps) |
| `--focus` | tomato-600 | gold-300 | The keyboard's focus ring |
| `--stripe-1..3` | tomato, orange, marigold | magenta `#e0438f`, coral `#f2785c`, gold | 70s stripes, the period rule, the offset under "Detalles ›" |
| `--period-title` / `--period-shadow` | deep tomato / sand | pink-200 `#f7b0d4` / indigo-975 | Period headings |
| `--sticker-*` | tomato / cream | gold / ink | Round date sticker |
| `--today-*` | marigold / wine | gold / ink | Today's number in the calendar |
| `--holiday-bg` | a tomato tint | plum-700 `#3e1f4a` | Calendar: public holidays |
| `--pulse` | tomato, translucent | pink, translucent | The ring of the first visit's pulse on "Detalles" (decorative) |
| `--type-*` / `--on-type` | per event type | pink (social), gold (workshop), coral (concert), lavender `#c9adf7` (festival, congress, show), lilac (competition, other) / ink | Type tag, calendar pills and dots |

### Luz de escenario: the dark theme's lighting

The dark theme isn't a flat color: the page is lit like the ballroom of a late-night bachata sensual social.
- **The light** (`--stage-light`, painted on `body` by `base.css` under `[data-theme=dark]`): a magenta gel
  spot from above the logo (`rgb(232 70 150)` at 40%, fading by 80% of its 400px), a violet beam from the
  right (`rgb(110 90 255)` at 26%) and a faint haze further down. It scrolls with the page: it lights the header
  and fades before the first cards.
- **The grain** (`--grain`): a fine film noise (an SVG `feTurbulence` as a `data:` image, which the CSP's
  `img-src` allows) at 5%, over the page, the details drawer and the bottom sheets, so they read as the same air.
- **Phones:** the toolbar (tabs and chips) isn't sticky there, so it's transparent in dark and lets the light
  through instead of cutting it with a flat band. The pinned jump bar keeps `--bg`.
- **The browser bar** (`theme-color`) is the page's indigo, `#16122B` (`scripts/themeConfig.ts`, from `lib/brandColors.ts`).

The calendar uses the same theme as the rest of the page (an earlier version gave it its own palette;
the owner preferred one look throughout).

**Contrast** (`npm run check` checks every pair in light and in dark):
- Luz de escenario: body text 15.97:1 on the page, 14.18:1 on cards; muted 9.62:1; the lowest text pair is
  "Gratis" (5.33:1, white on green, as in light), then the pink time on cards (6.87:1); outlines ≥ 4.12:1.
- **Over the light**, measured on rendered pixels (the brightest background pixel behind each text, at 375 and
  1280px): logo ≥ 7.73:1, tagline ≥ 7.72:1, "Actualizado" ≥ 7.89:1, tabs ≥ 8.69:1, the switch's outline
  ≥ 3.15:1; in the calendar, the month ≥ 11.16:1 and the weekdays ≥ 8.04:1.

### Typography

| Token | Font | Use |
|---|---|---|
| `--font-display` | **Shrikhand** | Wordmark, event titles, sticker day number. Echoes 70s salsa lettering without copying the Fania logo. |
| `--font-serif` | **Bodoni Moda Italic** | Tagline, day headings, month title, dialog subheadings: the sensual touch. Always italic, weight 500. |
| `--font-sans` | **Instrument Sans** | Everything else. 400 regular, 600 bold. No other weights. |

Sizes: `--text-2xs` 11 · `xs` 12 · `sm` 13 · `md` 15 (body) · `base` 16 · `lg` 17 · `xl` 21 · `2xl` 26 · `3xl` 36 · `logo` 44–72 (fluid).
`--text-base` is for the search fields (under 16px, iPhones zoom the page in on focus) and the media viewer's title.
`npm run check` fails when a stylesheet reads a custom property nobody defines (`scripts/check-css-vars.mjs`; the
few set from scripts are listed there): an undefined `--text-base` once left the search fields at 15px.

### Spacing, shape and sizes

- Spacing on a 4px base: `--space-1` 4 · `2` 8 · `3` 12 · `4` 16 · `5` 24 · `6` 32 · `7` 48.
- Corners:
  - `--radius-sm` (2px): tags, chips, buttons, like printed labels
  - `--radius-md` (4px): cards, dialog, calendar cells
  - `--radius-round`: **only** the date sticker and calendar day numbers
- `--border-width` 1.5px everywhere.
- Controls: `--control-height` 40px (buttons, toggle), `--chip-height` 32px, `--sticker-size` 60px.
- Touch: `--touch-target` 44px (the filter chips, the bar's 🔍 and 🔖, the cards' action row, the drawer's buttons and handle). A control drawn smaller (a 40px chip, the 32px handle) gets an invisible `::after` that makes up the difference above and below, so the bar stays 56px.
- The phone bar: `--jump-bar-height` 56px, `--filter-line-height` 40px (the line under it while filtering);
  `--pinned-height`, what's pinned to the top (the bar, plus the line while filtering: 56 or 96px), which jumps and
  the keyboard's focus land under (`scroll-margin-top`, `scroll-padding-top`); `--menu-width` 304px ("Cuándo"'s menu).
- The cards' "Detalles ›": `--details-height` 36px (its frame; the button is 44px), `--details-offset` 2px,
  `--details-tuck` (how far the offset reaches under the frame's ink: one device pixel from 2x, half of one below; set
  per screen density in `tokens.css`).
- The details: `--drawer-top-gap` 12px (phones: what's left above the drawer at full height), `--panel-width` 420px (wide screens: the side panel).
- Small parts: `--tab-underline` 3px (the selected tab's line), `--icon-sm` 16px (marks over flyers and thumbnails, a chip's ×, "× Limpiar", a card's "Video"), `--icon-md` 20px ("Cuándo"'s clock and check, the cards' Compartir, the drawer's ×, the details' media links), `--icon-lg` 24px (Guardar, the details' quick actions, the floating button), `--handle-width` × `--handle-height` 40×4px (every sheet's grab handle, `.sheet-handle`), `--fab-size` 44px.
- Over photos: `--on-image` (white) with `--shadow-on-image`, the same in both themes, for marks that sit on any flyer (stacked squares); `--on-image-bg` (black at 60%) behind words and marks on a flyer (a card's "Video", "Historia").

### Motion

Material 3's curves and the sheets' and drawer's durations, in `tokens.css`. Scripts read the ones they need from
`scripts/lib/motion.ts` (`DURATION`, `EASE`); `tests/motion.test.ts` fails if the two disagree, or if a stylesheet
writes a curve itself. With reduced motion nothing animates (`base.css`).

| Token | Value | Use |
|---|---|---|
| `--duration` | 150ms | Hovers, small state changes |
| `--duration-bar` | 250ms | The floating view switch fading in and out |
| `--duration-enter` | 320ms | A bottom sheet rising, the details drawer rising to half height |
| `--duration-settle` | 300ms | A sheet or the drawer settling: between heights, springing back after a drag |
| `--duration-panel-in` / `--duration-panel-out` | 280ms / 200ms | The side panel sliding in and out (wide screens) |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Settling, springing back, the first visit's pulse on "Detalles" |
| `--ease-emphasized-decelerate` | `cubic-bezier(0.05, 0.7, 0.1, 1)` | Coming in: quick, with a soft landing |
| `--ease-emphasized-accelerate` | `cubic-bezier(0.3, 0, 0.8, 0.15)` | Leaving: it goes and keeps going |

Leaving after a drag takes 160–280ms at the finger's speed (`lib/sheetMotion.ts`), set by the script.

The palette's hex values for what can't read CSS (the link previews, the share card, the app's icons, the favicon,
`theme-color`) are in `scripts/lib/brandColors.ts`, named as their tokens and checked against `tokens.css`
(`tests/brandColors.test.ts`).

## Signature motifs

- **70s stripes** (`<Stripes />`): three bands (tomato, orange, marigold). Used in the page headers (home, event page, 404), the event detail and the footer; the period headings use the same three colors as one thin line. Don't use them anywhere else; they lose meaning if repeated. The one exception: the cards' "Detalles ›" has a printer's offset under its frame in the same three colors, as a smooth gradient (the owner's choice; see "Opening an event").
- **Date sticker:** a round "record label" with the day and month, inside the bottom-right corner of each flyer, on cards and in the event detail. Two events sharing one flyer (a monthly schedule) are told apart by it while swiping. An event over several days within one month shows its days, "13–15 / NOV", a size smaller (`--text-sm`, `.date-sticker--range`) to fit the 60 px circle; across months it keeps the first day ("31 / OCT"), and the card's line gives the range. A workshop series shows its next session ("29 / NOV"), the last once all have passed.
- **Italic headings:** group, day and month headings in Bodoni italic, like a handwritten setlist.

The light theme's creams are the paper of 1970s salsa flyers and sleeves. The page uses the slightly darker, aged tone (`#ECDDC6`) rather than near-white, so it isn't glaring. Cards sit one step lighter so they still lift off the page.

## Upcoming list

- **Period headers** (Izzy Sanabria's Fania lettering): the title in the display face (Shrikhand) in `--period-title` (deeper tomato in light, soft pink in dark: calmer than the logo, no glare) with a 2px offset shadow (`--period-shadow`: sand in light, the deepest black in dark), between two thin lines made of the three Fania colors side by side and the event count ("5 eventos"), with generous space above. Page colors only, so it never reads as a post. Title contrast 4.93:1 (light) and 10.49:1 (dark): it passes even the normal-text 4.5:1.
- **Grouped by period, not by day** (`groupByPeriod` in `scripts/state.ts`). Days with one or two events share rows instead of each leaving a mostly empty row. The buckets don't overlap, follow the usual calendar "date range" grouping, and split out the weekend because that's when most socials happen:

  | Group | Range |
  |---|---|
  | Hoy | today, always first: what most visitors come for. An event over several days that has started is here every day it goes on |
  | Esta semana | tomorrow … Thursday of this week (only Monday–Wednesday) |
  | Este fin de semana | Friday … Sunday of this week (Friday night counts as weekend) |
  | Próxima semana | next Monday … Sunday |
  | Más adelante en *mes* | rest of the current month |
  | *Mes* / *Mes de año* | one group per later month (year shown outside the current year) |

  Weeks run Monday to Sunday.
- **Choosing dates** (the date filter, see "Filters") lists each event on its first day within the chosen periods,
  and "Mañana", when chosen, gets a group of its own between "Hoy" and the rest (its share icon says "Mañana en
  Bogotá"). Chosen periods open whole: no summary row, no "Ver N más".
- **Each card says when:** "Hoy / Mañana · 8:00 p. m.", the weekday within a week ("Domingo · 6:00 p. m."), or weekday and date further away ("Martes 20 oct."). The sticker keeps the date number.
- **An event over several days says its days** instead (`cardWhenLabel`), by where today falls (Level Up, Friday 13 to Sunday 15 November):

  | When | Card |
  |---|---|
  | further away | Vie 13 – dom 15 nov (across months: Sáb 31 oct – lun 2 nov) |
  | this week | Viernes 13 – domingo 15 |
  | the day before | Mañana · hasta el domingo 15 |
  | its first day | Hoy · hasta el domingo 15 |
  | while it goes on | En curso · hasta el domingo 15; the day before the last, En curso · termina mañana |
  | its last day | En curso · último día |

  The detail's "Cuándo" reads "Viernes 13 al domingo 15 de noviembre · hora por confirmar", and shared lists "Vie 13 – dom 15".
- **A workshop series** (one program on separate dated sessions, `DATA.md`) is one card, listed under its next session's
  day (among that day's events by its time) and moving on as each session passes; it leaves the list after the last.
  Its card says the next session (`cardWhenLabel`), its sticker shows that session's day:

  | When | Card |
  |---|---|
  | further than a week | 4 sesiones · próxima: dom 22 nov |
  | within a week | Domingo · 2:00 p. m. · sesión 3 de 4 (Hoy, Mañana as for any event; the session's own time) |
  | after the last | 4 sesiones · 8 nov – 6 dic (only on its page) |

  The detail's "Cuándo" reads "4 sesiones: 8, 22, 29 nov y 6 dic · 2:00 p. m. – 5:00 p. m." ("horario de cada sesión
  abajo" when their times differ), and shared texts the same; a period's shared list gives its next session.
- **Every @account is one link** (`accountLinkHtml` / `accountLinkAttrs` in `lib/accountLink.ts`): the card's, the details' head, Organiza, an @ Contacto, a story's Instagram button and the footer's sources all open the profile inside the site (`tests/accountLink.test.ts` fails on any other instagram.com profile link). **The academy on each card** ("@academia") opens its Instagram profile inside the site: the media viewer's sheet with Instagram's profile embed (its photo, counts and latest posts) and "Abrir en Instagram ↗" in the bar (`openProfileViewer` in `views/postViewer.ts`). The same as the details' @. It used to filter the list to the account; the owner dropped that filter on 4 October 2026 (an academy rarely has several events at once, and people expected its Instagram), and opening Instagram itself left the site with the app's back button. It's a link to the profile underneath, so a new tab still gets Instagram. It sits above the card's stretched click area.
- **Free events** show their price as a green "Gratis" label (`--free` / `--on-free`, checked for contrast).
- **Empty results** always offer a way out (see "Filters"): "Limpiar filtros", "Borrar la búsqueda", "Ver todos, no
  solo guardados".
- **Dance styles** are one line of text joined by a middle dot glued to the previous word with a no-break space (`stylesLabel`), never separate elements with CSS separators. The dot stays centered between words, and a wrapped line never starts with a dot. Each is named as in the filters (`styleLabel`): "Salsa · Urbano · Otros ritmos", never the data's "otro".

## Info and footer

- **"Info"** sits after the view tabs and looks like one, but it's a link to the footer (`#info`), never selected and outside the tab list for screen readers.
- **The footer is "Sobre Pa' Bailar"**: a heading in Bodoni italic, a one-line description, the disclaimer, the sources (every Instagram account the sweep reads, from `meta.json`), installing the app, "Escríbenos" (the report form), and at the bottom "Hecho por @jzamora5" (GitHub) with the version on the right. Each line has its icon.

## Sharing

Everything goes through the phone's own share menu (`lib/share.ts`, Web Share): the visitor picks
WhatsApp, a group, Instagram, Telegram or "copy", as in any app. Where there's no menu (most computers),
WhatsApp opens with the text. What can be shared (`scripts/views/sharing.ts`):
- **An event:** "Compartir" in its details (an outlined `.btn`) or on its card: its title, date, place and price, and its
  page's link, whose preview shows its own image (see "Link previews").
- **A near period:** a share icon at the end of "Hoy", "Esta semana", "Este fin de semana" and "Próxima
  semana" (`.share-icon`): an image of its events and a list for WhatsApp, as filtered on screen (a
  rhythms, a type or a search go in the subtitle; chosen dates are the periods themselves).
- **My plans:** in Guardados, "Tus 3 eventos guardados · Compartir mis planes" (`.plans-bar`): an image
  and a list where each event carries its own link.
- **The image** (`lib/shareCard.ts`) is drawn in the browser at share time, so it always matches the day,
  the filters and the saved events: a 1080×1350 portrait (what WhatsApp and Instagram show whole) in the
  light theme's colors and the page's fonts. Stripes, "Pa' Bailar", the title in Bodoni italic ("Este
  finde en Bogotá", "Mis planes para bailar"), the dates, up to four events (flyer thumbnail, day and time
  in tomato, title, academy and venue), "+ N eventos más" and the site's address. It's drawn as soon as
  its button comes into view, because phones only allow sharing right at the tap; if it isn't ready, the
  text goes alone.
- **The texts** (`lib/shareText.ts`) are written for WhatsApp: the title in *bold*, one line per event
  ("• Sáb 3 · 6:00 p. m. — *Salsa Freestyle* (@madyumdance)"). Shared links carry `utm_source=compartido`.

## Link previews

What a chat shows when an event's link is shared (WhatsApp, Instagram, iMessage, Telegram, Facebook), made at build
time for every event (`src/linkPreviewImage.ts`; how: `ARCHITECTURE.md`, section 3.4).

- **Title and description:** "Intensivo Ritmos Cubanos — dom 4 oct, 9:00 a. m." ("Level Up Bachata Fusion Congress —
  13–15 nov" over several days; a workshop series "… — 4 sesiones desde dom 8 nov, 2:00 p. m.", with "4 sesiones desde el
  domingo 8 de noviembre" and its first session's sticker on the image: true for as long as a chat keeps it) and "Taller de salsa cubana · Cra 16 #52-46 · Desde $ 35.000 · Pa' Bailar"
  (`lib/linkPreview.ts`). The date is in the title because descriptions are often cut.
- **The image, 1200×630** (1.91:1, the shape every app shows whole; a vertical flyer alone gets cropped or
  shrunk), the flyer on the left and the event on the right:
  - **Left half:** the whole flyer (never cropped, as everywhere on the site) over a blurred, darker copy of itself,
    with a soft shadow. A video's flyer is its frame. Without a flyer, the app icon's record on wine.
  - **The date sticker** sits on the seam, over the flyer's lower corner, like on the cards: the same record label
    (tomato, cream text, wine outline), 136 px. Over several days within a month it shows "13–15 / NOV"; across
    months the first day (`stickerDate`).
  - **Right half, on the page's paper** (cream-150): the stripes; the date and time in tomato (`--accent`), with real
    dates, never "Hoy" or "Mañana", since apps keep previews for days (the year when it isn't this one; the time
    moves whole to the next line when it doesn't fit); the title in Shrikhand, smaller as it gets longer (68 to
    42 px), at most three lines; the place (venue, address, area) in `--text-muted`, at most two lines; the price,
    "Gratis" as the cards' green tag (`--free`), otherwise "Desde $ 35.000" in bold; at the bottom "Pa' Bailar" in
    Shrikhand tomato and "pa-bailar.github.io" in Bodoni italic (`--text-italic`).
  - **Always the day theme's colors:** a preview is seen in apps of either theme, and the paper reads in both.
  - **Under 280 KB** (WhatsApp skips images over about 300 KB); most weigh about 115 KB.
- **The home page** keeps its own preview (`/og/sitio.jpg`: stripes, "Pa' Bailar", the tagline and the record).

## Not found (404)

- Most missing addresses are old event links (events leave the data 60 days after they end), so the page says
  "Este evento ya pasó o no existe" ("Esta página no existe" for any other address), "…pero la pista sigue
  abierta." in Bodoni italic, then "Próximos eventos": the first four upcoming events as rows (thumbnail, date in
  tomato, title in Shrikhand, venue), two columns on wide screens, and "Ver todos los eventos".
- The stripes stretch across the page, like the header's.

## Installing it like an app

- **What makes it installable:** the manifest (`pages/manifest.webmanifest.ts`: name, icons, and the light theme's paper `#ECDDC6` as its background and bar color, `THEME_COLORS.light`) and a
  service worker (`pages/sw.js.ts`). Icons are a record with a marigold label on the logo's tomato red,
  made at build time (`pages/icons/[name].png.ts`), with a smaller "maskable" one for phones that cut
  icons into circles or squircles.
- **Offline:** the installed app opens without a connection with the events from the last visit (pages
  network first, flyers and the build's files cached).
- **The offer** (`InstallOffer.astro`, `scripts/views/installPrompt.ts`), on every phone from the first
  visit: a banner under the header ("Pa' Bailar en tu celular" · Instalar · ×; × hides it for 30 days) and
  a link in the footer (also on computers whose browser can install). "Instalar" opens the browser's own
  install dialog when it has announced one (Chrome, Edge); otherwise a sheet with the steps for where the
  visitor is (`scripts/lib/installPlace.ts`). Nothing once installed.
- **The steps sheet:** three numbered steps (big numbers in the selected-chip colors), one short line each,
  with the browser's buttons drawn as they look on the phone (`.install-key`: its icon and its name, outlined,
  on `--surface-sunken`): ⋯, Compartir (the share icon), Agregar a inicio (a plus in a square). The sheet
  stays open while the visitor taps the browser's buttons, so the steps stay in view. Where the button is in
  the browser's bar right below the page, an arrow in the accent color bobs toward it
  (`.install-sheet__pointer`; it stays still with reduced motion). The texts, with iOS's own Spanish labels:

  | Where | Title | Steps |
  |---|---|---|
  | Safari 26 (iPhone) | Instálala en tu iPhone | Toca ⋯ abajo a la derecha y luego Compartir (¿Ya ves Compartir en la barra? Tócalo directo.) · Baja en el menú y elige Agregar a inicio. Si no está, toca Ver más. · Deja activado Abrir como app web y toca Agregar. Arrow: bottom right |
  | Safari 18 and earlier | Instálala en tu iPhone | Toca Compartir en la barra de abajo, en el centro. · Baja en el menú y elige Agregar a inicio. · Toca Agregar (arriba a la derecha). Arrow: bottom middle |
  | Safari on iPad | Instálala en tu iPad | Toca Compartir arriba a la derecha. · Elige Agregar a inicio. · Toca Agregar. No arrow |
  | Chrome, Edge, Firefox on iPhone | Instálala en tu iPhone | Toca Compartir junto a la dirección (Chrome) or in the browser's menu · Agregar a inicio · Agregar |
  | Inside Instagram, Facebook, TikTok, the Google app… | Ábrela en tu navegador | Toca ⋯ o ⋮ arriba a la derecha y elige Abrir en el navegador (Safari). · ¿No aparece? Toca Copiar enlace y pégalo en Safari. · Ahí toca Instalar en Pa' Bailar. With "Copiar enlace" |
  | An iPhone browser before iOS 16.4 | Ábrela en Safari | Copy the link, open it in Safari, install there. With "Copiar enlace" |
  | Android | Instalar en tu celular | Toca el menú ⋮ · Instalar aplicación · Instalar |

  On iPhone the page can't tell whether it was added, so the sheet ends with "Ya la agregué" (hides the offer
  for good), and closing the steps rests the banner for 30 days like ×; the footer's link stays.
- **A reminder:** whoever dismissed the banner gets one small reminder, once, when they save their second
  event ("Tus guardados a un toque: instala Pa' Bailar", `.install-nudge`, at the bottom to the left of the floating button, gone after
  10 seconds). Offering again at a moment the app clearly helps, instead of nagging, is Google's advice.
- **Knowing it's installed:** opened as the app; or this browser saw it installed (on Android the app shares the
  browser's storage, so opening the app once is enough); or Chrome on Android says so (`getInstalledRelatedApps`,
  the manifest lists the app as related to itself). Chrome offering to install again means it was uninstalled,
  and the offer comes back. iPhone keeps the home-screen app apart from Safari and can't be asked: there,
  ×, the steps or "Ya la agregué" hide the banner.

## Saving and searching

- **Saving ("Guardar")** is a bookmark, like Instagram's: at the right end of each card's action row (see "Opening
  an event"), and among the quick actions of the details and of an event's page (with its word: "Guardar" /
  "Guardado") (`.save-button`, `scripts/views/saveButton.ts`). Filled in the accent color
  when saved. Saved events live in this browser (`lib/saved.ts`, localStorage): no account, nothing
  sent anywhere. Events no longer in the data are forgotten.
- **"Guardados"** shows only saved events, in the list and the calendar: 🔖 in the phone bar (with the
  number of upcoming saved events on its corner) and a "Guardados" chip in the toolbar on wide screens.
  With none saved it says how to save one.
- **Search** (`lib/search.ts`) runs on the events already in the page: accent- and case-insensitive,
  every word must appear somewhere in the event (title, academy, organizer, venue, area, artists,
  rhythms, activities, type). On phones 🔍 turns the whole bar into the field (× closes it and clears the
  search); on wide screens the field sits at the end of the tabs' row. Results show after a short pause
  in typing, from the top of the list. Text is 16px so phones don't zoom in.

## Long lists

People look for "tonight, this weekend, next week" (the date buckets Eventbrite's quick filters use), so
the list stays short there and summarizes what's further away (`scripts/views/upcomingView.ts`):
- **Near periods in full:** Hoy, Esta semana, Este fin de semana and Próxima semana show their flyers (and
  any period chosen in the date filter).
- **Far events by year:** months get their own group for the next six months (relative to today, so in December next January is still its own month); beyond that, one group per year: "En 2027", or "Más adelante en 2027" when months of 2027 are already listed.
- **Later periods summarized:** "Más adelante en <mes>" and each later month start as one row with their
  first five flyers as small squares and "Ver los 23 eventos ›" (`.period-summary`); tapping it shows
  them in full. Choosing that period in the date filter opens it too.
- **Busy periods capped:** an open period shows six events, then "Ver 7 más" (`.period-more`).
- **Short lists whole:** with 12 events or fewer (for example once filtered) nothing is summarized. With
  nothing in the near periods, the first period opens.
- What the visitor opens stays open while filtering or switching views, and focus moves to the first
  newly shown event.

## Phones: feed, jump bar, view switch and filter sheet

- **Feed like Instagram:** under 720px each event is a full-width post, the flyer edge to edge at full size and the details right below, separated by space instead of boxed cards. Nothing is shrunk into thumbnails.
- **Jump bar** (`JumpBar.astro`, `scripts/views/jumpBar.ts`): one slim row (`--jump-bar-height`, 56px) pinned to the top, modeled on the filter bars of Google Maps and Airbnb: **[🔍] [🔖 3]**, then one row of chips that scrolls sideways: **[⚙ 3] [Social ×] [🕒 ▾] | [Salsa] [Bachata] [Urbano] [Tango]** (search and "Guardados": see "Saving and searching"; "Cuándo" and the chips: see "Filters").
  - **Compact, so two rhythms show at 375px:** 🔍, 🔖 and ⚙ are 40px squares (44px to the finger: 2px past each side, in
    the 8px gaps), and "Cuándo" is its clock and ▾ ("🕒 ▾"; the word "Cuándo" joins them from 480px). At 375px the row
    shows ⚙, 🕒 ▾, Salsa whole and Bachata to its last letter, under the fade.
  - **The row runs to the screen's edge** and fades there (a mask), so the next chip peeks and it reads as a row that scrolls (Material's single-line chip group). It keeps where it was scrolled while choosing, unless a new choice would be out of sight (made in the sheet, or a chip further along): then it scrolls just enough to show the first one.
  - **⚙** opens the filter sheet; its badge counts every choice in use (two rhythms count two, like Airbnb's).
  - **The line under it** ("12 eventos · Finde, Salsa" and "× Limpiar"), only while filtering (`--filter-line-height`, 40px): see "Filters".
  - **Keeping your place:** when a filter changes while you're inside the list, the period you were reading stays right under the bar; if the filter removed it, the next period (else the previous one) takes its place. The period being read is the lowest one crossing a band under the bar (`captureListPosition`).
  - **Pinned, never hidden:** the filters are at hand anywhere in the list. (It used to hide while scrolling down, like
    Instagram's header; the owner found the filters out of reach mid-list.) Opaque (`--bg`) with its line under it, and
    nothing else: no transform on it, and no `overflow: hidden` on html or body (iOS Safari's sticky breaks under one).
    Jumps (a filter change keeping your place, the keyboard's focus, a period's heading) land below it and its line
    (`--pinned-height`).
  - **Where it shows:** wherever the full toolbar isn't sticky (phones, short windows), in both views.
- **View switch** (`ViewSwitch.astro`, `scripts/views/viewSwitch.ts`): the tabs scroll away on phones, so an icon button (`--fab-size`, 44px) floats at the bottom right. It offers the other view: a calendar icon in the list, a list icon in the calendar (named for screen readers).
  - **Look:** the action color (`--action` / `--on-action`), ringed with the page color and a shadow, so it stands out even over a flyer of the same colors.
  - **Each view keeps its place, like Instagram's tabs:** coming back to a view lands exactly where it was left. The calendar keeps one rule instead (`revealDay` in `views/viewNavigation.ts`): **whatever changes the day's list ends with its start on screen**: opening the calendar (from the top or from deep in the list; the first time, the month's title lands under the pinned bar if the page was past it), coming back to it, a day, the month's ‹ ›, "Hoy", a filter, a search, "Guardados", back and forward. When the day's heading and the top of what follows (`DAY_PEEK`, 96px) are below the fold, the page moves just that far: gliding after a tap (at once with reduced motion), at once otherwise. When they're on screen, or above it (the visitor is reading the cards), it doesn't move, so trying days one after another never shakes the grid. On a phone the list started below the fold, and a tap there seemed to do nothing (the owner, 4 October 2026; a first-visit-only fix wasn't enough: after scrolling back up it happened again).
  - **A day tapped in the calendar says so where the list starts:** its heading ("Miércoles, 14 de octubre") has the count under it ("3 eventos", `--accent-text`, bold; none on an empty day, which says "No hay eventos este día.") and glows briefly in the accent when the day changes (`.calendar__day-heading.is-new`, 900ms; not on other redraws, and not with reduced motion). A tap moves the page only to bring the list's start on screen (the rule above), never otherwise. Screen readers hear "Miércoles, 14 de octubre: 3 eventos" (`#results-status`). If a filter changed meanwhile, the list comes back at the same period instead, as with any filter change. The tabs behave the same.
  - **Room:** the footer gets extra bottom padding so the button never covers its last line. Hidden wherever the toolbar is sticky.
  - **Away while the tabs are on screen** (`.is-away`, an IntersectionObserver on the tabs): they do the same, and on a first visit it would sit on the first card's date sticker. It fades in once the tabs scroll under the bar.
- **Filter sheet** (`FilterSheet.astro`, `filter-sheet.css`), from ⚙:
  - **Head:** "Filtros", "Limpiar" (in `--accent-text`, only enabled with something to clear) and ×.
  - **Groups**, in a body that scrolls between the head and the button: **Fecha** · *elige una o varias* (every period and month), **Ritmo** · *elige uno o varios* (every rhythm, the bar's four first, "Otros ritmos" last), **Tipo de evento** (several too). Each option with its count ("Noviembre 2"); the ones with nothing to show dimmed. Chips wrap, `--control-height` tall with a 44px target.
  - **"Ver 12 eventos"** stays at the bottom (the primary button): "Ver 1 evento", or "Sin eventos: cambia los filtros", disabled. It closes the sheet; choices apply at once, there's no apply step.
  - **Closing:** ×, a drag down (from the head, or from the groups scrolled to the top), the backdrop, Escape, back. The focus goes back to ⚙ (the new one, when a choice drew the row again).
  - **In the calendar:** Fecha says "En el calendario eliges el día en el mes."

## Filters

What narrows the list (`scripts/views/filters.ts`, the model in `lib/filterModel.ts`, the logic in `state.ts`), in the phone bar and its sheet, and on wide
screens in the toolbar's chip rows:

| Group | Choices | Options | In the phone bar |
|---|---|---|---|
| Fecha | several (the bar's "Cuándo": one) | each period of the list with something on ("Hoy", "Esta semana", "Este fin de semana", "Próxima semana", "Más adelante en octubre", each month, each year), and "Mañana" right after "Hoy" when something is on tomorrow | "🕒 ▾" (Cuándo): a menu with every one |
| Ritmo | several | each rhythm ("Salsa" includes its variants), "Otros ritmos" last | Salsa · Bachata · Urbano · Tango, always (the owner's choice) |
| Tipo de evento | several | each event type | from the sheet |

- **One tap chooses, another unchooses.** A chosen chip takes the selected-chip colors (`--chip-active-*`) with an ×;
  tapping it again (or its × anywhere) removes it. Choices made in the sheet that have no chip of their own in the bar
  show right after ⚙ as removable chips: "Social ×", "Kizomba ×" (never a date: "Cuándo" shows those).
- **Dates look like what they are: "Cuándo" (`views/whenMenu.ts`).** Dates used to be chips like the rhythms, and read
  as the same kind of thing. In the bar they're one control instead, the pattern of Google Maps' chips with a ▾:
  - **The chip:** a clock (in `--accent-text`; not a calendar, which is the floating button's icon, the owner's call
    of 4 October 2026) and ▾, "🕒 ▾", named "Cuándo: Cualquier fecha". Chosen, it reads
    "🕒 Finde" in the selected-chip colors, with **×** right beside it: a button of its own (not inside the chip's), the
    two drawn as one piece with a thin line between them; × takes the date away in one tap and the focus goes back to
    "Cuándo". Several dates chosen in the sheet read "🕒 Hoy +1", and × takes them all away.
  - **The menu** hangs from the chip (under it, its left edge with the chip's, never past the screen's sides; it scrolls
    when the screen is short, at least four options tall): "CUÁNDO", then **Cualquier fecha** and every period, each
    with the days it covers in muted text ("Hoy dom 4", "Este fin de semana 9–11 oct", "Resto de octubre 12–31 oct";
    none for a month or a year) and its count on the right; the date chosen has a check (`--accent-text`) and a sunken
    row (`--surface-sunken`). "Mañana" only when something is on tomorrow; an option with nothing to show is dimmed and a
    tap on it does nothing. 44px rows, `--surface`, `--shadow-menu`, the grain in dark.
  - **One tap applies it and closes the menu** (no "Listo"): it replaces whatever dates were chosen, and "Cualquier
    fecha" clears them. Several dates at once are chosen in the sheet.
  - **Closing:** Escape, a tap outside (that tap does nothing else: it could open an event behind it), the chip again,
    Tab, or back (it has a history entry of its own, as an overlay, like the sheets). The focus goes back to the chip.
  - **Semantics:** the chip has `aria-haspopup="menu"`, `aria-expanded` and `aria-controls`; the menu is `role="menu"`
    with `menuitemradio` options (`aria-checked`; dimmed ones `aria-disabled`), each named with its days and count
    ("Hoy (dom 4), 3 eventos"). Opening puts the focus on the date chosen (else "Cualquier fecha"); ↓ ↑ (around), Home
    and End move; ↓ or ↑ on the chip opens it.
- **Dimmed, never hidden:** an option that would show nothing with the other filters stays in place, dimmed (dashed,
  in `--dimmed`; `aria-disabled`, still focusable, a tap does nothing), so the row never jumps while choosing. A chosen
  option is never dimmed, so it can always be removed. Each option's count is how many events it would show with the
  other filters on.
- **Any within a group, all across groups:** two rhythms show events with either; two types, events of either; two
  periods, events on during either; a period and a rhythm, that rhythm in that period. Search and "Guardados" narrow
  further.
- **An event over several days counts for every day it runs:** a festival from Sunday to Tuesday is in "Finde" and in
  "Próx. semana"; a congress under way is in "Hoy" and, while it goes on tomorrow, in "Mañana". A workshop series counts
  for every period with a session to come, once each, and not for the days between sessions (the day before a session,
  "Mañana").
- **"Mañana"** overlaps the periods (tomorrow is in "Esta semana", the weekend or next week): it's an extra option,
  shown only when something is on tomorrow and never as a group unless chosen.
- **Choosing a date** shows just those periods, at the top of the list, whole (no summary rows, no "Ver N más").
- **What's chosen, at a glance:** under the bar, only while filtering, "**12 eventos** · Finde, Salsa" on the left (the
  count in `--text`, the names in `--text-muted`, cut with "…" when long) and "× Limpiar" on the right (`--accent-text`,
  named "Limpiar filtros" for screen readers). The count is also said politely to screen readers after each change
  (`#results-status`). In the calendar it reads "5 eventos en octubre · Salsa".
- **Clearing:** "× Limpiar", the sheet's "Limpiar", the toolbar's "Limpiar filtros" and an empty result's "Limpiar
  filtros" clear the dates, rhythms and types, not the search nor "Guardados" (they have their own way out).
  Nothing is remembered between visits, and filters aren't in the address.
- **Dates are the list's:** the calendar has its own days, so there the date chips hide (rhythms stay), the dates chosen
  are ignored (and kept for the list) and the badge doesn't count them.
- **Searching:** the bar becomes the search field, as before; the line under it stays while filtering.
- **Empty results always offer a way out:** with filters, "No hay eventos con estos filtros" · "Prueba con otras fechas
  o ritmos." · "Limpiar filtros"; with a search, "No encontramos eventos" · "Nada coincide con «…»." · "Borrar la
  búsqueda"; in Guardados also "Ver todos, no solo guardados".
- **Semantics:** filter chips are toggle buttons (`aria-pressed`), short names carry the full one ("Finde": "Este fin de
  semana", "Próx. semana": "Próxima semana"); removable chips are named "Quitar Social"; "Cuándo"'s × is "Quitar Este
  fin de semana"; ⚙ is "Todos los filtros, 3 activos". Focus stays on the chip chosen; after "Limpiar" (which hides or disables itself),
  focus goes to ⚙ (or the sheet's first chip, or the toolbar's first chip on wide screens).
- **Wide screens:** the toolbar keeps its chip rows (dates with the bar's short names, types, rhythms), chosen chips
  with ×, the same dimming, and a status row: "12 eventos" and a
  "Limpiar filtros" chip. Rows that don't fit wrap instead of cutting a chip.

## Events with several posts

An event can be announced by several Instagram posts (a flyer, then a video, a reminder). It's still **one** card:
- **Card:** shows the main post's flyer (images come before videos). A `.media-count` button ("▦ 3") in the flyer's top-right corner opens every post (above the card's stretched link, with a 44px target).
- **Every post, in a sheet** (`PostsSheet.astro`, `scripts/views/postsSheet.ts`): from the card's "▦ 3", the details' "Ver las 3 publicaciones", or the event page's `.posts-badge` over its flyer. It rises from the bottom on phones and is a centered window on wide screens, with two tabs, Flyers (photos and carousels) and Videos, when the event has both, and square thumbnails like Instagram's grid (▶ on videos, stacked squares on carousels, white with a shadow) that wrap. Thumbnails are 160 px files made at build time (`pages/thumbs/[name].webp.ts`), a few KB each. Choosing one opens it in the media viewer, in the sheet's place (it takes over the sheet's history entry, so back returns to the list or the details, not to a sheet that's gone); on an event's page it shows that post on the page instead (its image, the Instagram quick action, its caption).
- **The media viewer** (`PostViewer.astro`, `scripts/views/postViewer.ts`): the post inside the site, in a sheet over everything (the drawer included), with Instagram's own player (`lib/instagramEmbed.ts`). Videos play there with sound and carousels swipe through all their slides. Opening the Instagram app would leave the site, and the app's back button doesn't come back. The sheet's bar keeps "Abrir en Instagram ↗". Our copy of the flyer shows at once and the player replaces it when ready; if it can't load, the flyer stays with "Esta publicación solo se puede ver en Instagram." Instagram's script loads on the first tap only, never with the page. Closing it removes the player, so a video stops. It opens from the details' **Instagram** quick action, from a post chosen among the event's posts, from an account's @ (its profile), and on an event's page from its flyer.
- **Videos play in the feed.** When a card's image is a video's frame and the backend made its clip (`preview`), the card plays it: silent, looping, about 6 seconds, like Instagram's feed (`views/clips.ts`). The clips have no sound (the backend cuts them without it), so there's no sound control: a tap on the clip opens the details like the rest of the card, and the full video with its sound plays there (the Instagram quick action, Instagram's player). The owner's call of 4 October 2026, after a "Sin sonido / Con sonido" toggle that did nothing. Only the clip on screen plays, one at a time; a clip that leaves the screen unloads. It doesn't autoplay with reduced motion or the browser's data saver: the still frame stays. The service worker doesn't cache clips.
- **Every video's card says "Video"** (a camera, `ICONS.video`) at the lower left of its image (`.video-mark`, white on `--on-image-bg`, `--text-xs`; the sticker is on the right), whether it plays its clip or shows a still frame: one without a clip (Instagram gave no file, often a reel with music from Instagram's library), or a clip that doesn't autoplay (reduced motion, data saver). The owner's call of 4 October 2026: the label on some videos and not others was confusing. Not a ▶ in the middle: that promised it would play on the card. The card opens the details like a photo, and their Instagram button plays it.
- **On an event's page** the flyer is on top: its clip plays, a label says what's behind it (`lib/mediaLabel.ts`, `.event-detail__play`: "▶ Ver con sonido", "▶ Ver video", "Ver las 4"), and a tapped video plays in place (`views/inlinePlayer.ts`: Instagram's player in the image's place, full length, with sound; removed once it's out of view).
- **Instagram, inside the site:** the details' **Instagram** quick action shows the post in the media viewer (a video plays with sound, a carousel swipes), not in Instagram's app: the owner's call of 4 October 2026, since Instagram's back button doesn't return to the site. It replaced both "Ver el video con sonido" and "Ver en Instagram ↗" at the bottom (one way in, at the top). The viewer's "Abrir en Instagram ↗" is the way to the app; the button is a link to the post underneath, for a new tab. Some reels Instagram only plays on Instagram: its own player says so, and the bar's link is there.
- **Stories** (`media_type` `STORY`: a screenshot of a story, [`DATA.md`](DATA.md#stories)) have no post to show, and
  the story itself is gone after 24 hours:
  - On an event's page the flyer is a plain image, not a link. "Historia" (a dashed ring, `ICONS.story`) is a caption
    in its top-left corner, where a story shows its account (`.event-detail__play--story`: white on `--on-image-bg`,
    `--text-xs`, like a card's "Video"), not the action-colored label the others are, since there's nothing to tap.
  - In the details: "De una historia de @cuenta · las historias duran 24 horas" (`.event-detail__source`,
    `--text-sm` in `--text-muted`, with the ring), and the **Instagram** quick action opens the account's profile
    inside the site.
  - In the posts sheet a story is among the Flyers, its thumbnail marked with the ring ("Historia 2 de 2"); chosen, the
    media viewer shows only its flyer with the same line, and its bar says "Ver perfil en Instagram ↗".
  - A low-confidence note says "confírmalos con la cuenta" instead of "en la publicación".
  - A post's media comes before a story's (the data's order), so a post's flyer is the cover once there is one.

## Opening an event

On phones each event is a flyer with text under it. The details used to open as a viewer that showed the same flyer again
over the list, with what was new half a screen down, and it moved sideways between events, so it felt like leaving the
list. Now they open like Instagram's comments: a drawer rises over the list, and the list stays where it was.

- **An action row under each card's flyer, like Instagram's** (`.event-card__actions`, `views/eventCard.ts`):
  **Detalles ›** on the left, then **Compartir** (the share icon in Detalles' ink frame, a 36px square, without the
  colored offset, so it reads as a button too; pressed, it fills like Detalles: the event's link through the phone's
  menu), and **Guardar** (the bookmark) on the right. Each is a 44px target (`--touch-target`) above the card's stretched link, and the gaps
  between them still open the card.
- **"Detalles ›" is a printed label with an offset** (the owner's pick, "G2"): a closed ink frame (`--border-width`,
  `--details-ink`: wine in light, lilac-300 in dark) with no fill, so the page (and the dark theme's grain) shows
  through; the label "Detalles" (`--text-md`, bold, `--text`) and a trailing chevron (no ⓘ). Under it, **one
  offset layer**, `--details-offset` (2px) down and to the right, filled with a smooth left-to-right gradient of the
  period rule's three colors (`--stripe-1..3`: tomato → orange → marigold; in dark magenta → coral → gold), like a
  misregistered print. It's found at a glance without competing with the one primary button.
  - **Built:** the button is the 44px target with no border of its own; the frame is its `::after` (36px,
    `--details-height`, the ink border) and the offset its `::before` (`isolation: isolate`; both behind the label).
    The two are placed the same way inside the button, so they land on the screen's pixels the same way (the browser
    rounds a 1.5px border to whole device pixels, 1px at 1x; a band placed from the button's own border drifted by
    that rounding). The offset is the frame's box with the same corners, 2px further down and right, cut
    (`clip-path`) to an L that starts `--details-tuck` inside the frame's outer edge: the frame's outermost row of ink
    covers the band's edge, so ink and band meet with no line of page between them, and the band stays clear of the
    ink's inner pixels, so the bottom and right lines are as thick as the top and left ones. At the rounded corner the
    cut steps in diagonally, within the ink, so the band fills it. It fits in the gap before Compartir, which doesn't
    move. The keyboard's ring goes around the frame.
  - **Hard edges:** it's placed and moved with insets and `top`/`left`, never a `transform`: layout positions snap to
    the screen's pixels like the frame's border, while a transform drew the band antialiased.
  - **What earlier builds got wrong** (each measured on screenshots at 1x, 2x, 2.625x, 3x and 3.5x, in both themes, at
    rest and pressed): cut at the ink's inner edge and moved with a transform, the band smeared over the line at 3x;
    cut at its outer edge, a thin line of page showed between ink and band (cream in light, blue in dark; the mockup
    has it too); cut in the middle of the line, the band tinted its inner pixels, so the bottom line looked thinner,
    with the band climbing over it. Now: the same number of ink pixels on all four sides, no page between ink and
    band (edges and corner), and no band inside the frame.
  - **Pressed:** the frame sinks 1px onto the offset (half of it still shows) and fills with `--details-pressed`
    (cream-250; indigo-800).
  - **Contrast:** the frame (≥3:1) and the label (≥4.5:1) against the page and a card, and the label on its pressed fill,
    are in `check-contrast.mjs`; the offset is decorative, like the stripes.
- **No line at the card's foot:** a muted "Ver horario, precios y cómo llegar" used to end each card; "Detalles" on
  every card already says it, so the card ends with its price and rhythms.
- **The whole card opens the details**, its photo flyer included: card, flyer and "Detalles" open the same drawer (a
  video's clip too; the posts' badge opens the posts).
- **The date sticker sits inside the flyer's bottom-right corner** on cards too.
- **First visit:** the first card's "Detalles" pulses gently once (its frame: a ring in `--pulse` and a slight swell,
  1.6s; kept with the new button, which is still the way in to learn) when
  its row is fully on screen (`views/detailsHint.ts`), never again in this browser (`details-hint-seen` in
  localStorage, `lib/onceFlag.ts`), and not at all once the visitor has opened any details. No hint bubble over the
  list. Nothing moves with reduced motion.

**The drawer** (phones and tablets, under 900px; `EventDrawer.astro`, `drawer.css`, `scripts/views/eventDrawer.ts`):

- **Over the list:** it rises from the bottom to half height (the lower 55% of the screen) in 320ms (Material's
  emphasized-decelerate curve). The list doesn't change or navigate: it stays visible above, under a light scrim
  (`--scrim` at 32% at half height, 55% at full, following the drawer). It only scrolls when the tapped card would be
  mostly hidden: then its flyer's top goes right under the bar.
- **No flyer, no thumbnail:** the visitor is looking at the card. The head: the date line (`--accent`), the title
  (Shrikhand), the type tag and "@account" (its Instagram profile, opened inside the site like a card's @; in `--accent-text`, bold; its tap area
  44px tall without making the line taller), and × on the right. Then **Instagram** (the post inside the site; a story: the profile) · **Compartir** ·
  **Guardar** ("Guardado", in the accent color, once saved), equal buttons with the icon over the word; the stripes;
  **Cuándo, Lugar** (with its "📍 Cómo llegar" link, the only one since the quick action became Instagram), **Precio** (one line: "Desde $ 25.000 · 3 opciones", "Gratis" or "Por confirmar") and **Organiza**
  (the organizer and the account, said once when they're the same; the @ is the account's link), then Con, Incluye, Contacto (an @handle is an account's link too); the prices when
  there's more than one (a workshop series' **Sesiones** come first: one row each, "Dom 8 nov", with its times when
  they differ between sessions; the next one marked by a 3px `--accent` bar and "PRÓXIMA" ("HOY" on its day) in
  `--accent-text`, those past in `--text-muted` with "YA PASÓ"); the rhythms; "Ver las 3 publicaciones" (an outlined row, when there are several); a story's line; the post's text; "¿Algo está mal? Repórtalo". At half height,
  when, where and the price are on screen.
- **Two heights:** half and full (12px from the top, `--drawer-top-gap`). Pulling it up, or scrolling its content at
  half height (also the wheel, or the keyboard reaching something below), expands it; at full height its content
  scrolls. Pulling down from its bar, or from the top of its content, returns it to half height; another pull closes
  it. The handle is a button: a tap switches heights ("Ver todo el detalle" / "Ver menos"). A mouse can drag it too.
  On release: a flick (>0.5 px/ms) goes the way it moved; otherwise past max(110px, 22% of the screen) below half
  height closes, else the nearer height (300ms).
- **Closing:** a drag down, a tap on the scrim, ×, Escape or the back button, all through the history (back): it
  slides away at the finger's speed (160–280ms, accelerating curve), at once when Safari's edge swipe already animated
  it, and with no motion under reduced motion.
- **Modal:** the page behind doesn't scroll, focus goes to the title and back to what opened it (the card or its
  "Detalles"), and it's announced as a dialog named by the event's title.
- **One event at a time:** no ‹ › between events, no counter, no swipe nudge (Instagram's comments don't move
  between posts).
- **The list's clips** keep playing above the half drawer and pause under the full one.

**The side panel** (900px and wider): the same content, in a panel on the right (`--panel-width`, 420px), not modal, so
the list stays usable next to it: the page leaves room for it, another card shows its event in the panel (the address
changes without adding to the history), and the open event's card is outlined in the accent color. × and Escape close
it; it slides in from the right, and the focus goes back to the last card opened. The list next to it can move to
another screen (a period opened whole, the calendar): another card then gets its own history entry, and closing the panel there
puts the address back to the home page's.

## Event detail: drawer and page

- **Same parts in both** (`scripts/views/eventDetail.ts`): the drawer's content (`eventDrawerHtml`) and each event's own
  page (`pages/evento/[id].astro`, one static page per event, `eventDetailHtml`). The page shows the flyer on top, as on
  its card (with its clip, its posts badge and the label of what's behind it), then the same head and details as the
  drawer.
- **The event's page** is what a shared link points to, for link previews (see "Link previews"), search engines
  (schema.org `Event` data) and browsers without scripts. Its header links "← Ver próximos eventos"; a past event says
  "Este evento ya pasó."
- **Panel sheets** (filters, an event's posts, a post, the install steps) share one base: `.sheet-panel` (`sheet.css`, attached to the bottom on phones, a centered window on wide screens) and `initPanelSheet` / `openPanelSheet` (`lib/sheet.ts`: ×, backdrop, drag down, Escape). Each gets its own history entry, so the phone's back button closes only the sheet on top: a post, then the details, then the list. A sheet opened in another's place (a post chosen among the posts) takes over its entry.
- **Bottom sheets** (the panel sheets; `lib/sheet.ts`, `sheet.css`) behave like native ones, with values from Material/iOS sheets, the same as the drawer:
  - **Opening:** they rise in 320ms (Material's emphasized-decelerate curve) while the backdrop fades in.
  - **Dragging:** dragging down follows the finger 1:1, shrinks the sheet slightly and fades the backdrop. Dragging up past the top rubber-bands.
  - **Release:** a flick down (>0.5 px/ms) closes, as does a drag past max(110px, 22% of the screen) unless flicked back up. Otherwise it springs back (300ms).
  - **Closing:** it continues from where the finger left it, at the finger's speed (160–280ms, accelerating curve). ×, Escape and back slide it away the same way. When Safari's edge swipe already animated the back navigation, it closes at once.
  - **Reduced motion:** no rise and no slide.
- **Back moves between the app's screens** (`screenHistory.ts`): a period opened whole, the calendar and "Guardados" each get a history entry, so the phone's back button returns to the previous screen where it was scrolled, instead of leaving the site (which closes the installed app). Undoing one from the page (the list button, "Guardados" again) steps back, so history never piles up. The app restores scrolling itself (`history.scrollRestoration = "manual"`).
  - **Overlays** (the sheets and the details) get entries on top of the screen's, marked as overlays (`overlayState`). Undoing a move from inside one (the "Filtros" sheet's "Limpiar", the list next to the side panel) can't step back without closing it: the move is undone right there, the overlay stays, and its screen's entry is skipped when back (or closing the overlay) reaches it.
- **The details have a URL:** opening pushes `/evento/<id>/`, so the phone's back button closes them. A copied link opens that event's page.
- **Shared links open the app.** An event's link (`/evento/<id>/`) forwards a browser to the home page (`?evento=<id>`), which shows the list scrolled to that event's card (its period opened whole if it was summarized or past "Ver N más") with its drawer open at half height over it (`main.ts`, `openSharedEvent`): × or back leave the visitor on the list, not off the site. A past event (checked in Bogotá's time when the page opens) or one no longer in the list stays on its page.
- **Missing details say "Por confirmar"** in their own row (hora, lugar, precio), in muted italics. Gemini's free-text doubts are not shown; a low-confidence extraction gets one note asking to confirm in the post.
- **"Cómo llegar"** after the venue opens Google Maps (only when there's a venue or address).
- **Reporting an error:** the detail ends with a small "¿Algo está mal? Repórtalo" link to the Google Form, with the event filled in (`feedbackUrl`: its title, its day or days, its id); the footer has "Escríbenos" for anything else. Out of the way of the actions, because almost everyone just wants the event.
- **The contact is a link** (`lib/contact.ts`): an @username opens its profile inside the site (`lib/accountLink.ts`); a mobile number opens a WhatsApp chat (`wa.me/57…`, with the WhatsApp icon), not a call: that's how people reach academies; a landline (60X) is a call (`tel:`), since it has no WhatsApp; a website opens it. A number that isn't a full Colombian or international one stays plain text.
- **Icons** (`scripts/lib/icons.ts`): Instagram and WhatsApp marks (Simple Icons, CC0) and drawn icons (calendar, a clock, a video camera, pin, ×, an arrow out, a story's dashed ring, and for the install steps Safari's ⋯, Compartir and Agregar a inicio, a link and an arrow), inline SVG in the text color, hidden from screen readers.

## Component rules

- **Naming:** BEM-style. `block`, `block__element`, `block--modifier`, and state classes `is-*` (`is-today`, `is-selected`, `is-past`). The CSS file is named after the block.
- **Only semantic tokens** inside component CSS. If a value is missing, add a token; never hard-code a color, size or spacing in a component.
- **One primary button per view** (`.btn--primary`). Everything else is the outlined `.btn`, including "Compartir" (it opens the phone's share menu, not only WhatsApp, so it no longer wears WhatsApp's green).
- **Event-type color** is applied with a `.t-<type>` class, which exposes `--type` for that element (tags, pills, dots).
- **No emoji in the UI.** Use text or inline SVG icons.
- **No `style=""` attributes** in markup: the Content Security Policy blocks them and the build fails on them. Use a class, or set a value that depends on the data from a script (`element.style.setProperty`), like a card's `--flyer-ratio`.
- **Flyers are never cropped**, on cards or on an event's page (`object-fit: contain`; the drawer shows none). Like Instagram's feed, phones show each flyer at its own shape, from 4:5 (portrait) to 1.91:1 (landscape). The size comes from the file at build time (`src/data.ts`), so the page never jumps as images load. Taller flyers (stories) get a 4:5 frame, and so does every card on wider screens, so rows line up. The space around a flyer of another shape is filled with a blurred copy of itself.
- **Accessibility:**
  - Every interactive element is a real `<button>` or `<a>`.
  - Visible focus ring (`--focus`).
  - Contrast meets WCAG 2.2 AA in both themes: ≥ 4.5:1 for text, ≥ 3:1 for large text and for the outlines and indicators people need to see (borders, focus ring, selected states).
  - `npm run check` runs `scripts/check-contrast.mjs`, which reads `tokens.css` and checks every pair the components use; CI fails if one drops below AA. New color pairs go in its `PAIRS` list.
  - Don't dim text with `opacity`: use `--text-muted`. Colored marks that aren't text (calendar dots) get a `--border` outline.
  - `--divider` and the stripes are decorative and exempt.
  - Motion is respected via `prefers-reduced-motion`.

## Adding something new

1. Need a new color, size or spacing? Add a token in `tokens.css` (semantic colors need both a light and a dark value).
2. Create `styles/components/<block>.css` and import it in `layouts/BaseLayout.astro`, after the other components. Don't chain CSS with `@import`: the dev server doesn't reload imported files.
3. Static markup goes in an Astro component (`src/components/<Block>.astro`); markup rendered from data goes in a view (`src/scripts/views/<block>.ts`).
4. Check both themes and a phone width (375px), and run `npm run check`, before opening the PR.
