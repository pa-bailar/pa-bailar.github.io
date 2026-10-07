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
   ├─ filters.css        ← the filter chips (bar, sheet, toolbar), "Cuándo" and its menu, the rhythms' families, the line;
   │                        wide screens: the toolbar's pills, their panels and the status row
   ├─ bottom-nav.css     ← phones: the bar at the bottom (Eventos, Calendario, Buscar, Guardados, Filtros)
   ├─ posts-sheet.css    ← every post announcing an event
   ├─ post-viewer.css    ← a post with Instagram's player
   ├─ loader.css         ← a ring turning while something loads (the player, a profile, a video)
   ├─ filter-sheet.css
   ├─ site-footer.css
   └─ install.css        ← installing the site: the banner and the steps sheet
```

## Tokens

`tokens.css` has three layers:

1. **Palette:** raw named colors (`--wine-900`, `--tomato-600`, `--marigold-600`…). **Components never use these.**
2. **Semantic colors:** what a color is *for* (`--bg`, `--surface`, `--text-muted`, `--accent`, `--action`…). Each is `light-dark(<Fania de día>, <Luz de escenario>)`. **Components only use these.** Browsers without `light-dark()` (Safari before 17.5: iPhones on iOS 16) would drop them all and show no colors: `tokens-fallback.css`, generated from `tokens.css` by `scripts/light-dark-fallback.mjs` (a test fails while it's stale), gives them the same values inside `@supports not (light-dark())`, which every other browser skips (the owner, 6 Oct 2026).
3. **Scales:** type sizes, spacing, radii, control sizes, motion.

Themes switch through CSS `color-scheme`: `light` at `:root`, `dark` only under `html[data-theme="dark"]`. An inline script in `<head>` (`src/themeScript.ts`, put in every page by `BaseLayout.astro`) sets `data-theme` from the saved choice before first paint, so Oscuro never flashes Claro, and sets the `theme-color` meta. The Content Security Policy allows it by its hash (`ARCHITECTURE.md`, section 3.3). `scripts/theme.ts` runs the switch; its icon and label follow `data-theme` through CSS. Both share their rule (only a saved `dark` is dark) and colors through `scripts/themeConfig.ts`. The installed app's manifest uses the light theme's paper for its splash screen and bar.

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
| `--action` / `--on-action` | deep orange / white | gold / ink `#1c1033` | The primary button |
| `--accent-text` | tomato-700 | pink-400 | The accent as a word on the page (`--accent` is below 4.5:1 on the page in light) |
| `--chip-active-*` | wine / cream | pink-300 `#ff9fcb` / ink | Selected filter chip, an item that's on in the bar at the bottom, the badges |
| `--dimmed` | cocoa-200 | indigo-400 | A filter option with nothing to show (inactive, exempt from contrast) |
| `--details-ink` | wine-900 | lilac-300 `#c3b7db` | The cards' "Detalles ›" frame |
| `--details-pressed` | cream-250 | indigo-800 | "Detalles ›" pressed: the frame's fill |
| `--scrim` | wine-950 | indigo-975 | Under the details drawer |
| `--backdrop` | wine at 60% | indigo-black at 78% | Behind the bottom sheets |
| `--focus` | tomato-600 | gold-300 | The keyboard's focus ring |
| `--stripe-1..3` | tomato, orange, marigold | magenta `#e0438f`, coral `#f2785c`, gold | 70s stripes, the period rule, the offset under "Detalles ›" |
| `--period-title` / `--period-shadow` | deep tomato / sand | pink-200 `#f7b0d4` / indigo-975 | Period headings |
| `--sticker-*` | tomato / cream | gold / ink | Round date sticker |
| `--today-*` | marigold / wine | gold / ink | Today's number in the calendar |
| `--holiday-bg` | a tomato tint | plum-700 `#3e1f4a` | Calendar: public holidays |
| `--pulse` | tomato, translucent | pink, translucent | The first visit's pulse on "Detalles" (decorative) |
| `--type-*` / `--on-type` | per event type | pink (social), mint (party, "Rumba": the one hue no other type uses), gold (workshop), coral (concert), lavender `#c9adf7` (festival, congress, show), lilac (competition, other) / ink | Type tag, calendar pills and dots |

### Luz de escenario: the dark theme's lighting

The dark theme isn't a flat color: the page is lit like the ballroom of a late-night bachata sensual social.
- **The light** (`--stage-light`, painted on `body` by `base.css` under `[data-theme=dark]`): a magenta gel spot from
  above the logo, a violet beam from the right and a faint haze. It scrolls with the page: it lights the header and
  fades before the first cards.
- **The grain** (`--grain`): a fine film noise (an SVG `feTurbulence` as a `data:` image, which the CSP's `img-src`
  allows) over the page, the details drawer and the bottom sheets, so they read as the same air.
- **The bars pinned to the top** (the wide screens' toolbar, the phones' pinned bar): clear while they sit under the header, so the light goes on through them; pinned, solid `--bg` again (the light has scrolled away behind them by then; a frosted bar read muddy over the flyers). A solid `--bg` all along cut the light in a flat band (the owner, 6 Oct 2026). The bar at the bottom keeps `--bg`.
- **The browser bar** (`theme-color`) is the page's indigo (`scripts/themeConfig.ts`, from `lib/brandColors.ts`).

The calendar uses the same theme as the rest of the page: the owner preferred one look throughout over a palette of its own.

**Contrast:** every pair meets WCAG AA in both themes; `npm run check:contrast` (`scripts/check-contrast.mjs`) lists
and checks them. Text over the light (logo, tagline, tabs, the calendar's month and weekdays) was measured on rendered
pixels at 375 and 1280px and also passes.

### Typography

| Token | Font | Use |
|---|---|---|
| `--font-display` | **Shrikhand** | Wordmark, event titles, sticker day number. Echoes 70s salsa lettering without copying the Fania logo. |
| `--font-serif` | **Bodoni Moda Italic** | Tagline, day headings, month title, dialog subheadings: the sensual touch. Always italic, weight 500. |
| `--font-sans` | **Instrument Sans** | Everything else. 400 regular, 600 bold. No other weights. |

Sizes: `--text-2xs` 11 · `xs` 12 · `sm` 13 · `md` 15 (body) · `base` 16 · `lg` 17 · `xl` 21 · `2xl` 26 · `3xl` 36 · `logo` 44–72 (fluid).
`--text-base` is for the search fields (under 16px, iPhones zoom the page in on focus) and the media viewer's title.
`npm run check` fails when a stylesheet reads a custom property nobody defines (`scripts/check-css-vars.mjs`; the
few set from scripts are listed there).

### Spacing, shape and sizes

- Spacing on a 4px base: `--space-1` 4 · `2` 8 · `3` 12 · `4` 16 · `5` 24 · `6` 32 · `7` 48.
- Corners:
  - `--radius-sm` (2px): tags, chips, buttons, like printed labels
  - `--radius-md` (4px): cards, dialog, calendar cells
  - `--radius-round`: **only** the date sticker and calendar day numbers
- `--border-width` 1.5px everywhere.
- Controls: `--control-height` 40px (buttons, toggle), `--chip-height` 32px, `--sticker-size` 60px.
- Touch: `--touch-target` 44px for every control. A control drawn smaller gets an invisible `::after` that makes up the
  difference, so the target is met without making its row taller.
- The phone bars: `--jump-bar-height` 56px, `--filter-line-height` 40px (the line under it while filtering);
  `--bottom-nav-height` 60px (with labels); `--bottom-nav-space` (what that
  bar covers, 0 where it isn't shown); `--nav-indicator-width` 48px; `--pinned-height` (what's pinned to the top, which
  jumps and the keyboard's focus land under); `--menu-width` 304px ("Cuándo"'s menu); `--pill-panel-width` 456px.
- The cards' "Detalles ›": `--details-height` 36px (its frame), `--details-offset` 2px, `--details-tuck` (how far the
  offset reaches under the frame's ink, set per screen density).
- The details: `--drawer-top-gap` 12px (phones: what's left above the drawer at full height), `--panel-width` 420px (wide screens: the side panel).
- Small parts: `--tab-underline` 3px, `--icon-sm` 16px, `--icon-md` 20px, `--icon-lg` 24px, `--handle-width` × `--handle-height` 40×4px (every sheet's grab handle, `.sheet-handle`).
- Over photos: `--on-image` (white) with `--shadow-on-image`, the same in both themes, for marks that sit on any flyer; `--on-image-bg` (black at 60%) behind words on a flyer.

### Motion

Material 3's curves and the sheets' and drawer's durations, in `tokens.css`. Scripts read the ones they need from
`scripts/lib/motion.ts` (`DURATION`, `EASE`); `tests/motion.test.ts` fails if the two disagree, or if a stylesheet
writes a curve itself. With reduced motion nothing animates (`base.css`).

| Token | Value | Use |
|---|---|---|
| `--duration` | 150ms | Hovers, small state changes |
| `--duration-enter` | 320ms | A bottom sheet rising, the details drawer rising to half height |
| `--duration-settle` | 300ms | A sheet or the drawer settling: between heights, springing back after a drag |
| `--duration-panel-in` / `--duration-panel-out` | 280ms / 200ms | The side panel sliding in and out (wide screens) |
| `--duration-loop` | 800ms | A loader's turn (`loader.css`); with reduced motion it stays still |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Settling, springing back, the first visit's pulse on "Detalles" |
| `--ease-emphasized-decelerate` | `cubic-bezier(0.05, 0.7, 0.1, 1)` | Coming in: quick, with a soft landing |
| `--ease-emphasized-accelerate` | `cubic-bezier(0.3, 0, 0.8, 0.15)` | Leaving: it goes and keeps going |

Leaving after a drag takes 160–280ms at the finger's speed (`lib/sheetMotion.ts`), set by the script.

The palette's hex values for what can't read CSS (the link previews, the share card, the app's icons, the favicon,
`theme-color`) are in `scripts/lib/brandColors.ts`, named as their tokens and checked against `tokens.css`
(`tests/brandColors.test.ts`).

## Signature motifs

- **70s stripes** (`<Stripes />`): three bands (tomato, orange, marigold). Used in the page headers (home, event page, 404), the event detail and the footer; the period headings use the same three colors as one thin line. Don't use them anywhere else; they lose meaning if repeated. The one exception: the offset under the cards' "Detalles ›" (the owner's choice; see "Opening an event").
- **Date sticker:** a round "record label" with the day and month, inside the bottom-right corner of each flyer, on cards and in the event detail. Two events sharing one flyer (a monthly schedule) are told apart by it while swiping. An event over several days within one month shows its days ("13–15 / NOV"); across months it keeps the first day ("31 / OCT"), and the card's line gives the range. A workshop series shows its next session ("29 / NOV"), the last once all have passed.
- **Italic headings:** group, day and month headings in Bodoni italic, like a handwritten setlist.

The light theme's creams are the paper of 1970s salsa flyers and sleeves: the page uses an aged tone rather than near-white, so it isn't glaring, and cards sit one step lighter.

## Upcoming list

- **The logo** links home on every page, the home page too, with a page load: the list comes back fresh, at its top, no panel open, nothing selected (the owner, 6 Oct 2026). A plain link, so the page's own click handling leaves it to the browser.
- **Period headers** (Izzy Sanabria's Fania lettering): the title in Shrikhand with an offset shadow, between two thin lines in the three Fania colors, and the event count ("5 eventos"). Page colors only, calmer than the logo, so it never reads as a post.
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
- **Every @account is one link** (`lib/accountLink.ts`; `tests/accountLink.test.ts` fails on any other instagram.com profile link): wherever an account shows (card, details, Contacto, the footer's sources), it opens the profile inside the site, in the media viewer with Instagram's profile embed (`openProfileViewer` in `views/postViewer.ts`); a new tab still gets Instagram. Not a filter to the account: the owner dropped that on 4 October 2026 (an academy rarely has several events at once, and people expected its Instagram); not Instagram's app either, whose back button leaves the site.
- **Free events** show their price as a green "Gratis" label (`--free` / `--on-free`, checked for contrast).
- **Empty results** always offer a way out (see "Filters"): "Limpiar filtros", "Borrar la búsqueda".
- **Dance styles** are one line of text joined by a middle dot glued to the previous word with a no-break space (`stylesLabel`), never separate elements with CSS separators. The dot stays centered between words, and a wrapped line never starts with a dot. Each is named as in the filters (`styleLabel`): "Salsa · Urbano · Otros ritmos", never the data's "otro".

## Info and footer

- **Info** is an (i) in the header, by the theme switch (`.site-header__info`, named "Info: sobre Pa' Bailar"): a link
  to the footer (`#info`), and back returns to where the page was. Not a tab: with the views in the bar at the bottom,
  phones have no tabs (the owner, 5 October 2026).
- **The footer is "Sobre Pa' Bailar"**: a heading in Bodoni italic, a one-line description, the disclaimer, the sources (every Instagram account the sweep reads, from `meta.json`), installing the app, "Escríbenos" (the report form), and at the bottom "Hecho por @jzamora5" (GitHub) with the version.

## Sharing

Everything goes through the phone's own share menu (`lib/share.ts`, Web Share): the visitor picks
WhatsApp, a group, Instagram, Telegram or "copy", as in any app. Where there's no menu (most computers),
WhatsApp opens with the text. What can be shared (`scripts/views/sharing.ts`):
- **An event:** "Compartir" in its details or on its card: its title, date, place and price, and its page's link, whose
  preview shows its own image (see "Link previews").
- **A near period:** a share icon at the end of "Hoy", "Esta semana", "Este fin de semana" and "Próxima
  semana" (`.share-icon`): an image of its events and a list for WhatsApp, as filtered on screen (a
  rhythm, a type or a search go in the subtitle; chosen dates are the periods themselves).
- **My plans:** in Guardados, "Tus 3 eventos guardados" with a small "Compartir" (`.plans-bar`, named "Compartir mis
  planes"; a light row, not a box: the owner, 5 Oct 2026): an image and a list where each event carries its own link.
- **The image** (`lib/shareCard.ts`) is drawn in the browser at share time, so it always matches the day,
  the filters and the saved events: a 1080×1350 portrait (what WhatsApp and Instagram show whole) in the
  light theme, with a title ("Este finde en Bogotá", "Mis planes para bailar"), up to four events and "+ N eventos
  más". It's drawn as soon as its button comes into view, because phones only allow sharing right at the tap; if it
  isn't ready, the text goes alone.
- **The texts** (`lib/shareText.ts`) are written for WhatsApp: the title in *bold*, one line per event
  ("• Sáb 3 · 6:00 p. m. — *Salsa Freestyle* (@madyumdance)"). Shared links carry `utm_source=compartido`.

## Link previews

What a chat shows when an event's link is shared (WhatsApp, Instagram, iMessage, Telegram, Facebook), made at build
time for every event (`src/linkPreviewImage.ts`; how: `ARCHITECTURE.md`, section 3.4).

- **Title and description:** "Intensivo Ritmos Cubanos — dom 4 oct, 9:00 a. m." ("Level Up Bachata Fusion Congress —
  13–15 nov" over several days; a workshop series "… — 4 sesiones desde dom 8 nov, 2:00 p. m.", with its first
  session's sticker on the image: true for as long as a chat keeps it) and "Taller de salsa cubana · Cra 16 #52-46 ·
  Desde $ 35.000 · Pa' Bailar" (`lib/linkPreview.ts`). The date is in the title because descriptions are often cut.
- **The image, 1200×630** (1.91:1, the shape every app shows whole; a vertical flyer alone gets cropped or
  shrunk): the whole flyer on the left (never cropped; without one, the app icon's record) with the date sticker, and
  the event on the right, on the page's paper.
  - **Real dates, never "Hoy" or "Mañana"**, since apps keep previews for days.
  - **Always the day theme's colors:** a preview is seen in apps of either theme, and the paper reads in both.
  - **Under 280 KB** (WhatsApp skips images over about 300 KB).
- **The home page** keeps its own preview (`/og/sitio.jpg`: stripes, "Pa' Bailar", the tagline and the record).

## Not found (404)

- Most missing addresses are old event links (events leave the data 60 days after they end), so the page says
  "Este evento ya pasó o no existe" ("Esta página no existe" for any other address), "…pero la pista sigue
  abierta.", then "Próximos eventos": the first four upcoming events as rows, and "Ver todos los eventos".
- The stripes stretch across the page, like the header's.

## Installing it like an app

- **What makes it installable:** the manifest (`pages/manifest.webmanifest.ts`: name, icons, and the light theme's paper as its background and bar color, `THEME_COLORS.light`) and a
  service worker (`pages/sw.js.ts`). Icons are a record on the logo's tomato red, made at build time
  (`pages/icons/[name].png.ts`), with a "maskable" one for phones that cut icons into circles or squircles.
- **Offline:** the installed app opens without a connection with the events from the last visit (pages
  network first, flyers and the build's files cached).
- **The offer** (`InstallOffer.astro`, `scripts/views/installPrompt.ts`), on every phone from the first
  visit: a banner under the header ("Pa' Bailar en tu celular" · Instalar · ×; × hides it for 30 days) and
  a link in the footer (also on computers whose browser can install). "Instalar" opens the browser's own
  install dialog when it has announced one (Chrome, Edge); otherwise a sheet with the steps for where the
  visitor is (`scripts/lib/installPlace.ts`). Nothing once installed.
- **The steps sheet:** three numbered steps, one short line each, with the browser's buttons drawn as they look on the
  phone. The sheet stays open while the visitor taps the browser's buttons. Where the button is in the browser's bar
  right below the page, an arrow points to it. The texts, with iOS's own Spanish labels:

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
  event ("Tus guardados a un toque: instala Pa' Bailar", `.install-nudge`, just above the bar at the bottom, gone after
  10 seconds). Offering again at a moment the app clearly helps, instead of nagging, is Google's advice.
- **Knowing it's installed:** opened as the app; or this browser saw it installed (on Android the app shares the
  browser's storage); or Chrome on Android says so (`getInstalledRelatedApps`). Chrome offering to install again
  means it was uninstalled, and the offer comes back. iPhone can't be asked: there, ×, the steps or "Ya la agregué"
  hide the banner.

## Saving and searching

- **Saving ("Guardar")** is a bookmark, like Instagram's: on each card, and among the quick actions of the details and
  of an event's page (`scripts/views/saveButton.ts`). Saved events live in this browser (`lib/saved.ts`,
  localStorage): no account, nothing sent anywhere. Events no longer in the data are forgotten.
- **Guardados is a place of its own** (`views/savedView.ts`, `/guardados/`), like Instagram's Saved and Airbnb's
  Wishlists. Not a toggle over the list and the calendar (it read as "the calendar without the calendar", and you could
  be in Eventos and Guardados at once): the owner, 5 October 2026. It's in the bar at the bottom and a third tab on
  wide screens ("Guardados 3").
  - **What it shows:** "Tus 3 eventos guardados [Compartir]", then the saved events to come by period, always whole
    (no summaries, no "Ver N más"), then the past ones folded at the end: **"Ya pasaron (2) ⌄"** (the latest first).
    Saved but none to come: "Ninguno de tus eventos guardados está por venir" and "Ver eventos".
  - **No filters there:** a short, personal list. Filtros is off in the bar (named "Filtros: no se usan en Guardados";
    its badge stays), and the pinned bar and the toolbar's pills are hidden (`body[data-screen="saved"]`). The filters
    stay set for the list. **The search applies**, as in every view: "No encontramos eventos guardados" · "Nada de lo
    que guardaste coincide con «…»." · "Borrar la búsqueda".
  - **Empty:** a big bookmark, "Aún no tienes eventos guardados", "Toca 🔖 en un evento para tenerlo aquí, a la mano. Se
    quedan en este navegador, sin crear cuenta." and "Ver eventos".
  - **Unsaving there** takes the card away at once, the page staying where it was.
  - **The calendar marks the days** holding a saved event (as filtered on screen) with a small bookmark, and says it to
    screen readers ("…, 3 eventos, 1 guardado"); the legend under the grid has "Festivo" and "Guardado".
- **Search** (`lib/search.ts`) runs on the events already in the page: accent- and case-insensitive,
  every word must appear somewhere in the event (title, academy, organizer, venue, area, artists,
  rhythms, activities, type). **"Free" is one word however it's written** (the owner, 7 Oct 2026): "gratis", "gratuito", "sin costo", "entrada libre", "no cover", "free cover"… in the search or in the event (its own words, or "Gratis" on its card) all mean "gratis"; "libre" alone doesn't ("rumba libre"). On phones Buscar turns the bar at the bottom into the field (see "The bar at the
  bottom"); on wide screens the field is in the tabs' row. Results show after a short pause in typing, from the top of
  the list (in the calendar, the day's list).

## Long lists

People look for "tonight, this weekend, next week" (the date buckets Eventbrite's quick filters use), so
the list stays short there and summarizes what's further away (`scripts/views/upcomingView.ts`):
- **Near periods in full:** Hoy, Esta semana, Este fin de semana and Próxima semana show their flyers (and
  any period chosen in the date filter).
- **Far events by year:** months get their own group for the next six months (relative to today, so in December next January is still its own month); beyond that, one group per year: "En 2027", or "Más adelante en 2027" when months of 2027 are already listed.
- **Later periods summarized:** "Más adelante en <mes>" and each later month start as one row with their
  first five flyers as small squares and "Ver los 23 eventos ›" (`.period-summary`); tapping it shows
  them in full. Choosing that period in the date filter opens it too.
- **Busy periods capped:** an open period shows six events, then "Ver 7 más ⌄" (`.period-more`), one row as wide as the grid (the owner, 6 Oct 2026: the small button went unnoticed), printed like the cards' "Detalles ›": the same ink frame and offset in the three colors, sinking onto it when pressed (the owner, 7 Oct: more visible), with the month blocks' fill inside the frame and a little chunkier than a control (52px tall, the body's 15px text: still easy to miss at 44px and 13px). It sits as far from its last card as from the next period, 32px each way (7 Oct: it looked low between them).
- **Short lists whole:** with 12 events or fewer (for example once filtered) nothing is summarized. With
  nothing in the near periods, the first period opens.
- What the visitor opens stays open while filtering or switching views, and focus moves to the first
  newly shown event.

## Phones: feed, jump bar, the bar at the bottom and filter sheet

- **Feed like Instagram:** under 720px each event is a full-width post, the flyer edge to edge at full size and the details right below, separated by space instead of boxed cards. Nothing is shrunk into thumbnails.
- **Jump bar** (`JumpBar.astro`, `scripts/views/jumpBar.ts`): one slim row pinned to the top, modeled on the filter bars of Google Maps and Airbnb: one row of chips that scrolls sideways: **[Social ×] [Sin bares ×] [🕒 ▾] | [Salsa] [Bachata] [Urbano] [Tango]** ("Cuándo" and the chips: see "Filters"). Search, Guardados and Filtros live in the bar at the bottom (the owner, 5 October 2026: in this row the filters' count scrolled sideways with the chips).
  - **The row runs to the screen's edge** and fades there, so the next chip peeks and it reads as a row that scrolls (Material's single-line chip group). It keeps where it was scrolled while choosing, unless a new choice would be out of sight: then it scrolls just enough to show it.
  - **The choices made in the sheet** that have no chip of their own come first, removable ("Social ×", "Sin bares ×"),
    so what's on stays in sight.
  - **The line under it** ("12 eventos · Finde, Salsa" and "× Limpiar"), only while filtering: see "Filters".
  - **Keeping your place:** when a filter changes while you're inside the list, the period you were reading stays right under the bar; if the filter removed it, the next period (else the previous one) takes its place (`captureListPosition`).
  - **Pinned, never hidden:** the filters are at hand anywhere in the list (not hidden while scrolling down: the owner
    found the filters out of reach mid-list). No transform on it and no `overflow: hidden` on html or body (iOS
    Safari's sticky breaks under one). Jumps land below it and its line (`--pinned-height`).
  - **Where it shows:** wherever the full toolbar isn't sticky (phones, short windows), in the list and the calendar
    (not in Guardados, which has no filters). There the toolbar isn't shown at all.
- **The bar at the bottom** (`BottomNav.astro`, `scripts/views/bottomNav.ts`, `bottom-nav.css`), like Instagram's (the
  owner, 5 October 2026; it replaced the floating calendar button and the tabs on phones): **Eventos** (the list, `/`) ·
  **Calendario** (`/calendario/`) · **Buscar** · **Guardados** · **Filtros**, five equal items fixed at the bottom of the
  screen, wherever the jump bar shows (phones, short windows).
  - **It sits above the home indicator** (`env(safe-area-inset-bottom)`); each item's target is its full height.
  - **Icons with their labels** (the owner, 6 Oct 2026, after seeing both): Material 3's advice for five destinations,
    and Buscar and Filtros aren't destinations an icon alone says.
  - **The view on screen** (`aria-current="page"`) is marked; tapping it again goes back to the top of the page, like
    Instagram's tabs. Buscar with a search kept shows it's on; Filtros is off in Guardados (`aria-disabled`, still
    focusable).
  - **Badges:** the number of upcoming saved events on Guardados, and on Filtros every choice in use (two rhythms count
    two, like Airbnb's; hiding the bars counts one). Filtros is named "Filtros, 2 activos"; Guardados "Guardados, 3".
  - **Buscar:** the bar becomes the search field, docked at the bottom (iOS 26's search, Instagram's place), with the
    focus, the keyboard and × (the browser's own clear button is hidden: one way out). It has a history entry, as an
    overlay: **× and back close it and clear the search**; Escape too. **The keyboard's "Buscar" (Enter)** closes the
    keyboard and the field and keeps the search (Buscar is named "Buscar: «salsa»"; a tap opens the field again). A
    field left empty closes when the keyboard does (or when what opened over it closes). **Android's back** with the
    keyboard up only hides the keyboard (the page isn't told), so the search reacts to the keyboard leaving
    (`keyboardJustHid`): empty, it closes; with words, it's kept (the owner, 5 Oct 2026). The bar rides above the
    keyboard (`--keyboard-inset`; `ARCHITECTURE.md`, section 5.7).
  - **Sheets and the details drawer** are modal dialogs in the browser's top layer: they cover the bar, which stays
    put under them. The "Cuándo" menu stops above it.
  - **Room:** the page makes room for it with `--bottom-nav-space` and `scroll-padding-bottom`; the calendar's day list
    counts the screen as ending at it (`revealDay`).
  - **Wide screens** don't show it: the tabs (Próximos, Calendario, Guardados), the search field and the filters' pills
    in the toolbar (see "Filters"), and Info in the header.
  - **Each view has its own address:** the list is `/`, the calendar `/calendario/`, Guardados `/guardados/` (the same
    page opening on that view, `components/HomePage.astro`), so reloading or sharing it keeps it; the bar, the tabs and
    back move between them, the tab's title follows (`lib/viewTitles.ts`), and closing an event goes back to its view's
    address. `/guardados/` isn't indexed (it's each visitor's). Opened straight on `/calendario/` or `/guardados/`, the
    list isn't under it in the history: back leaves, as from any shared link (the owner, 4 October 2026).
  - **The list keeps its place, like Instagram's tabs:** coming back to it lands where it was left. **The calendar
    always opens on its home** instead, with the day's list on screen (its cards look like the list's, and visitors
    coming back deep in them lost track of which view they were in: the owner, 4 October 2026). In it one rule holds
    (`revealDay` in `views/viewNavigation.ts`): **whatever changes the day's list ends with its start on screen** (a
    day, the month's ‹ ›, "Hoy", a filter, a search, back and forward). The page moves only when the list's start is
    below the fold, never when the visitor is reading the cards, so trying days never shakes the grid. Why: on a phone
    the list started below the fold, and a tap seemed to do nothing (the owner, 4 October 2026).
  - **A day tapped in the calendar says so where the list starts:** its heading ("Miércoles, 14 de octubre") has the count under it ("3 eventos"; an empty day says "No hay eventos este día.") and glows briefly when the day changes (not with reduced motion). Screen readers hear "Miércoles, 14 de octubre: 3 eventos" (`#results-status`). If a filter changed meanwhile, the list comes back at the same period instead. The tabs behave the same.
- **Filter sheet** (`FilterSheet.astro`, `filter-sheet.css`), from Filtros in the bar at the bottom:
  - **Head:** "Filtros", "Limpiar" (only enabled with something to clear) and ×.
  - **Groups:** **Fecha** · *elige una o varias* (every period and month), **Ritmo** · *elige uno o varios* (under their families, see "Filters"), **Tipo de evento** (several too). Each option with its count ("Noviembre 2"); the ones with nothing to show dimmed. First, above them, the "Ocultar eventos de bares" switch (see "Filters", "Hiding the bars").
  - **"Ver 12 eventos"** stays at the bottom (the primary button): "Ver 1 evento", or "Sin eventos: cambia los filtros", disabled. It closes the sheet; choices apply at once, there's no apply step.
  - **Closing:** ×, a drag down, the backdrop, Escape, back. The focus goes back to Filtros.
  - **In the calendar:** Fecha says "En el calendario eliges el día en el mes."

## Filters

What narrows the list (`scripts/views/filters.ts`, the model in `lib/filterModel.ts`, the logic in `state.ts`), in the phone bar and its sheet, and on wide
screens in the toolbar's pills and their panels:

| Group | Choices | Options | In the phone bar |
|---|---|---|---|
| Fecha | several (the bar's "Cuándo": one) | each period of the list with something on ("Hoy", "Esta semana", "Este fin de semana", "Próxima semana", "Más adelante en octubre", each month, each year), and "Mañana" right after "Hoy" when something is on tomorrow | "🕒 ▾" (Cuándo): a menu with every one |
| Ritmo | several | each rhythm ("Salsa" includes its variants), under its family | Salsa · Bachata · Urbano · Tango, always (the owner's choice) |
| Tipo de evento | several | each event type | from the sheet |

- **One tap chooses, another unchooses.** A chosen chip takes the selected-chip colors with an ×; tapping it again (or
  its × anywhere) removes it. Choices made in the sheet that have no chip of their own in the bar show first in the row
  as removable chips: "Social ×", "Kizomba ×" (never a date: "Cuándo" shows those).
- **Dates look like what they are: "Cuándo" (`views/whenMenu.ts`).** Not chips like the rhythms (they read as the same
  kind of thing): in the bar dates are one control, the pattern of Google Maps' chips with a ▾:
  - **The chip:** "🕒 ▾", named "Cuándo: Cualquier fecha" (a clock, not a calendar, which is Calendario's icon: the
    owner, 4 October 2026). Chosen, it reads "🕒 Finde" (named "Finde, Cuándo: Este fin de semana"), with **×** beside
    it as a button of its own that takes the date away in one tap. Several dates chosen in the sheet read "🕒 Hoy +1",
    and × takes them all away.
  - **The menu** hangs from the chip, never past the screen's sides nor under the bar at the bottom: "CUÁNDO", then
    **Cualquier fecha** and every period, each with the days it covers ("Hoy dom 4", "Este fin de semana 9–11 oct";
    none for a month or a year) and its count; the date chosen has a check. Touch-sized rows on touch screens, compact
    ones with a mouse (the owner: the tall rows looked odd on desktop).
  - **One tap applies it and closes the menu** (no "Listo"): it replaces whatever dates were chosen, and "Cualquier
    fecha" clears them. Several dates at once are chosen in the sheet.
  - **Closing:** Escape, a tap outside (that tap does nothing else: it could open an event behind it), the chip again,
    Tab, or back (a history entry of its own, as an overlay). The focus goes back to the chip.
  - **Semantics:** a menu button (`aria-haspopup="menu"`, `aria-expanded`, `aria-controls`); `menuitemradio` options
    named with their days and count ("Hoy (dom 4), 3 eventos"); focus starts on the date chosen; arrows, Home and End
    move; ↓ or ↑ on the chip opens it.
- **Rhythms by family** (the owner, 5 October 2026; `lib/styleFamilies.ts`, one list for every place). The sheet's
  Ritmo and the toolbar's Ritmo panel show the rhythms under four small headings, in this order:
  - **Salsa:** salsa, salsa en línea, salsa caleña, salsa cubana, cha cha chá
  - **Bachata:** bachata, bachata sensual, bachata dominicana
  - **Urbanos:** urbano, dancehall, afro, heels
  - **Otros:** merengue, son, champeta, tango, swing, kizomba, zouk, "Otros ritmos"

  Within a family the rhythms keep the filters' order (the bar's four first, then by how many events in view have
  them, "Otros ritmos" last); an empty family isn't shown. Every rhythm of the data contract is in exactly one family
  (`tests/styleFamilies.test.ts`); an unknown one goes with Otros. The owner turned down "Otros de pareja" and
  "Latinos y caribe" (salsa and bachata are Latin too). "Salsa" still includes its variants, and **the phone bar's
  quick chips stay one flat row**.
- **Dimmed, never hidden:** an option that would show nothing with the other filters stays in place, dimmed
  (`aria-disabled`, still focusable, a tap does nothing), so the row never jumps while choosing. A chosen option is
  never dimmed. Each option's count is how many events it would show with the other filters on.
- **Any within a group, all across groups:** two rhythms show events with either; two types, events of either; two
  periods, events on during either; a period and a rhythm, that rhythm in that period. Search narrows further.
  Guardados has no filters (see "Saving and searching").
- **An event over several days counts for every day it runs:** a festival from Sunday to Tuesday is in "Finde" and in
  "Próx. semana"; a congress under way is in "Hoy" and, while it goes on tomorrow, in "Mañana". A workshop series counts
  for every period with a session to come, once each, and not for the days between sessions (the day before a session,
  "Mañana").
- **"Mañana"** overlaps the periods (tomorrow is in "Esta semana", the weekend or next week): it's an extra option,
  shown only when something is on tomorrow and never as a group unless chosen.
- **Choosing a date** shows just those periods, at the top of the list, whole (no summary rows, no "Ver N más").
- **What's chosen, at a glance:** under the bar, only while filtering, "**12 eventos** · Finde, Salsa" (cut with "…"
  when long) and "× Limpiar" (named "Limpiar filtros" for screen readers). The count is also said politely to screen
  readers after each change (`#results-status`). In the calendar it reads "5 eventos en octubre · Salsa".
- **Hiding the bars** (the owner, 5 October 2026). Bars and clubs open every week; the site lists only their special
  nights (`bar: true`, `DATA.md`), and **shows them by default**. Visitors who only want academies' events can hide them:
  - **In the sheet:** a switch **first**, one compact row (the owner: near the top, taking little room): **Ocultar
    eventos de bares**; its hint, *Noches especiales de bares y discotecas: orquestas, invitados, fiestas.*, only for
    screen readers (`barsSwitchHtml`, `role="switch"`).
  - **Wide screens:** "Ocultar bares", a toggle chip at the end of the pills' row.
  - **While on**, the bars' events are gone wherever the filters apply: the list, the calendar, search, every option's
    count and "Ver 12 eventos" (not Guardados, which has no filters). It **counts one** on Filtros' badge, shows as
    **"Sin bares ×"** in the row (a tap shows them again) and in the line under the bar ("37 eventos · Sin bares").
    Off, nothing shows anywhere but the switch.
  - **Remembered** on that device (`localStorage`, key `hide-bars`, `1` while on; nothing while off). Where storage is
    blocked it works for the visit. The only filter that is remembered: it's a preference about what the visitor wants
    to see at all, where dates and rhythms are what they look for today.
  - **A shared link to a bar's event** still opens it while they're hidden: its details over the list (its card isn't
    there), and the switch stays as it was.
- **Clearing:** every "Limpiar" clears the dates, rhythms and types, and **shows the bars again** (and forgets it on the
  device): it counts on the badge, so "Limpiar" leaves nothing counted there. Not the search (it has its own way out).
  Nothing else is remembered between visits, and filters aren't in the address.
- **Dates are the list's:** the calendar has its own days, so there "Cuándo" hides (rhythms stay), the dates chosen
  are ignored (and kept for the list) and the badge doesn't count them.
- **Searching:** the bar at the bottom becomes the search field; the line under the pinned bar stays while filtering.
- **Empty results always offer a way out:** with filters, "No hay eventos con estos filtros" · "Prueba con otras fechas
  o ritmos." · "Limpiar filtros"; with a search, "No encontramos eventos" · "Nada coincide con «…»." · "Borrar la
  búsqueda" (Guardados has its own: see "Saving and searching").
- **Semantics:** filter chips are toggle buttons (`aria-pressed`), short names carry the full one ("Finde": "Este fin de
  semana"); removable chips are named "Quitar Social". Focus stays on the chip chosen; after "Limpiar" (which hides or
  disables itself), focus goes to Filtros (in the sheet, to its first control; on wide screens, the first pill).
- **Wide screens (the toolbar, from 720px wide and 600px tall, tablets included): dropdown pills** (the owner, 5 October
  2026; rows of identical chips made the kinds read as one). As on Meetup, Google Flights and Airbnb, the tabs and the
  search field keep their row, and under it (not in Guardados) **one row of pills**: **[🕒 Cuándo ▾]** (the list only)
  **[Ritmo ▾] [Tipo ▾]** and the toggle chip **"Ocultar bares"** (`views/filters.ts` draws them,
  `views/filterPanels.ts` opens their panels).
  - **A pill** with something chosen says how many: "Ritmo · 2", "Tipo · 1"; Cuándo says the date, as the phone bar's
    ("🕒 Finde", "🕒 Hoy +1").
  - **Its panel** hangs from it, never past the screen's sides nor under the details' side panel, and moves nothing
    when it opens: **Cuándo** is the phone's menu, one date per tap (it closes); **Ritmo** has the rhythms under their
    families, **Tipo** the types, as chips with their counts. Choices apply at once and the panel stays open for more.
  - **One panel at a time.** **Closing:** Escape, the pill again, Tab out of it, a click outside, back (one history
    entry, as an overlay), or the window getting too small for the toolbar (its entry goes too: nothing invisible is
    left to catch taps or back). A click outside the toolbar and the side panel does nothing else (it could open an
    event); inside them it does its job. The focus goes back to the pill.
  - **Under the row, while filtering:** "**12 eventos**" (in the calendar "15 eventos en octubre"), every choice as a
    removable chip ("Finde ×", "Salsa ×") and "× Limpiar". No "Sin bares ×" here: the "Ocultar bares" pill already
    shows it's on and turns it off (the owner, 5 Oct 2026); the count line still says "· Sin bares".
  - **Semantics:** each pill is a button with `aria-haspopup` (`menu` for Cuándo, `dialog` for Ritmo and Tipo), named
    starting with the words shown ("Ritmo, 2 elegidos"). Ritmo's and Tipo's panels are non-modal dialogs, their
    families `role="group"`; the chips are toggle buttons with their counts in their names ("Salsa, 14 eventos").
    Arrows, Home and End move between options; Tab leaves a panel and closes it; ↓ or ↑ on a pill opens it.

## Events with several posts

An event can be announced by several Instagram posts (a flyer, then a video, a reminder). It's still **one** card:
- **Card: a carousel, like Instagram's** (`views/carousel.ts`; the owner, 5 October 2026: one flyer and a "▦ 6" grid
  whose posts opened Instagram's embed left no way to just flip through them). One slide per post with a flyer, the
  main post first; the frame keeps the main flyer's shape and the others fit inside it on their blurred copy.
  - **Phones swipe it** (the browser's own snapping scroll; vertical scrolling over it still scrolls the page).
    **Mice** get ‹ › on the card's hover (Tab reaches them too); trackpads swipe.
  - **"1/6"** at the image's top right, and **dots in the action row** (centered like Instagram's on phones; between
    Compartir and Guardar on wide screens, where the cards are narrow): at most five, the edge ones smaller while
    there are more.
  - **A tap on the image opens the details**, with the slide on screen selected: their Instagram button opens that
    post. Ctrl or middle click opens the event's page in a new tab. A video slide plays its clip while on screen.
  - **A double-tap opens the details and leaves them open** (Instagram's "like", out of habit): the details rise
    under the finger, and the second tap of a double-tap, the same spot within 450 ms, is dropped. Before, it
    landed on them: Compartir, the account's profile, or the dim area that closed them again (20 of 20 emulated
    double-taps, the audit of 7 Oct 2026). A desktop double-click likewise keeps the image and the details open.
    (`lib/secondTap.ts`, `dropSecondTap` in `main.ts`.)
  - Every post is still a link away: the details' "Ver las 6 publicaciones" (the posts sheet).
- **Wide screens with a mouse: a card's image big beside its details**, like Instagram's desktop view of a post
  (`Lightbox.astro`, `views/lightbox.ts`; the owner, 5–6 October 2026: a flyer's fine print is too small on the card,
  and the details must stay usable). A click on a card's image, or Enter, opens the side panel and the flyer whole on a
  dark stage over the list, which stops where the panel starts: Instagram, Compartir and Guardar stay reachable. ‹ › its
  photos, "1/6"; ← → the event before or after (image and panel together). One view with one history entry (the
  event's address): Escape, back, the panel's ×, the stage's × or a click on the dark area close both, and the focus goes
  back to the card. The title and "Detalles" open the panel alone. Phones and tablets: a tap on the image opens the
  details, as before.
- **The keyboard moves through the events** (`views/keyboardNav.ts`; the owner, 5 October 2026: clicking card after
  card was tiresome). A card focused: ↑ ↓ ← → to the card above, below, before or after; Enter opens its details with
  the image big beside them where that works, the details alone elsewhere. The details open: Enter on them shows the
  image beside them (to press Enter an event was almost always just clicked: the owner, 6 Oct 2026). Nothing focused:
  any arrow starts on the first card whose top shows below the pinned bars (Page Up/Down, space and the wheel still
  scroll); with the details open, from their event. A summarized period ("Ver los 23 eventos") and "Ver 7 más" are
  stops in the grid too: Enter opens the period, the focus lands on its first new event, and the arrows go on, so the
  whole list can be walked without the mouse (the owner, 6 Oct 2026). The details open: ← → the event before or after in the
  list, ↑ ↓ the one in the row above or below; with the image beside them, ← → go through its photos first, then on
  to the next event (going back, the previous one's last photo), like one stream; a block on the way opens by itself
  and the details show its first new event (its last, going back), so the image never stays still (the owner, 6 Oct
  2026); the list follows (its card outlined, brought into view); Escape leaves the focus on that card, and back still
  returns to the list (the panel swaps events in place). **Where the side panel fits, it shows the card in focus**,
  like an inbox's reading pane: an arrow onto a card opens it, from a fresh page too (the owner, 6 Oct 2026; not where
  the details are the phones' drawer), and the arrows carry it along (the focus stays in the list, the card whole in
  view); Enter then moves the focus into it, with the image beside it; Escape closes it until the next arrow. Scrolled
  away from its card, an arrow starts from the first card on screen. Closing a
  card's lightbox switches it to that event (the owner, 5 Oct 2026: after a look at another card's image, the arrows
  moved through the list while the panel stayed on the first event). Never while typing, in a menu or under another
  dialog; a card's ‹ › stay the mouse's and Tab's, so ← → never mean two things. **Tab: one stop per event** (the owner, 6 Oct 2026): Tab
  walks the list in its reading order, the same as →, each event once (the card itself), with the periods' Compartir
  and the "Ver N más" / month blocks where they are, then the footer, then out of the page; Shift+Tab goes back like
  ←. An event's own buttons (Detalles, Compartir, Guardar, ‹ ›, the profile) are out of the Tab order: all of them are
  in the details, which Enter opens. The side panel follows the event Tab lands on; in it, Tab goes through its
  controls and past the last one on to the next event, Shift+Tab from its start back to the event it shows; from
  outside, Tab never walks into it (it sits at the page's end). About 41 stops on the page. Dropped on the way: every
  control of every card (about 124 stops, out of step with the arrows) and the list as one stop (a roving tabindex:
  Tab skipped every other event, straight to the footer). Safari's plain Tab skips links (the cards are links) unless
  its "Press Tab to highlight each item" is on: its usual behavior, left as it is. Screen readers' own reading still
  reaches every button. A card's link says its title first, then
  when, what, where and how much (`cardLabel`), since it's the card's only Tab stop. **"Saltar a los eventos"**, the
  page's first stop, shown only while focused, skips the header and the toolbar (11 stops) to the list: `<main>`
  takes the focus only then (a click in the list never gives it the focus), and the arrows start from there as from
  nothing focused. Escape in the toolbar's search ends the search only; a second one closes the side panel.
- **Every post, in a sheet** (`PostsSheet.astro`, `scripts/views/postsSheet.ts`): from the card's "▦ 3", the details' "Ver las 3 publicaciones", or the event page's `.posts-badge`. Tabs Flyers and Videos when the event has both, and square thumbnails like Instagram's grid, made at build time (`pages/thumbs/[name].webp.ts`). Choosing one opens it in the media viewer, which takes over the sheet's history entry (back returns to the list or the details, not to a sheet that's gone); on an event's page it shows that post on the page instead.
- **The media viewer** (`PostViewer.astro`, `scripts/views/postViewer.ts`): the post inside the site, in a sheet over everything, with Instagram's own player (`lib/instagramEmbed.ts`): videos with sound, carousels with all their slides. Opening the Instagram app would leave the site, and the app's back button doesn't come back; the sheet's bar keeps "Abrir en Instagram ↗". Our copy of the flyer shows at once, with a turning ring in its middle and "Cargando la publicación…" under it (the owner, 7 Oct 2026: the words alone didn't say something was coming), and the player replaces it when ready; if it can't load, the ring goes and the flyer stays with "Esta publicación solo se puede ver en Instagram." A profile and a video tapped on an event's page get the same ring before their "Cargando…" (`loader.css`, `lib/loader.ts`). Instagram's script loads on the first tap only, never with the page. Closing it removes the player, so a video stops.
- **Videos play in the feed.** When the backend made a video's clip (`preview`), the card plays it: silent, looping, about 6 seconds, like Instagram's feed (`views/clips.ts`). No sound control: a tap opens the details, where the full video plays with sound (the owner, 4 October 2026, after a "Sin sonido / Con sonido" toggle that did nothing, since the clips have no sound). Only the clip on screen plays; one that leaves the screen unloads. No autoplay with reduced motion or the data saver. The service worker doesn't cache clips.
- **Every video's card says "Video"** (`.video-mark`), whether it plays its clip or not (the owner, 4 October 2026: the label on some videos and not others was confusing). Not a ▶ in the middle: that promised it would play on the card.
- **On an event's page** the flyer's clip plays, a label says what's behind it (`lib/mediaLabel.ts`: "▶ Ver con sonido", "▶ Ver video", "Ver las 4"), and a tapped video plays in place, with sound (`views/inlinePlayer.ts`; removed once it's out of view).
- **Instagram, inside the site:** the details' **Instagram** quick action shows the post in the media viewer, not in Instagram's app (the owner, 4 October 2026: Instagram's back button doesn't return to the site). It's the one way in. The button is a link to the post underneath, for a new tab. Some reels Instagram only plays on Instagram: its own player says so, and the bar's link is there.
- **Stories** (`media_type` `STORY`: a screenshot of a story, [`DATA.md`](DATA.md#stories)) have no post to show, and
  the story itself is gone after 24 hours:
  - On an event's page the flyer is a plain image, not a link, with a "Historia" caption, since there's nothing to tap.
  - In the details: "De una historia de @cuenta · las historias duran 24 horas", and the **Instagram** quick action
    opens the account's profile inside the site.
  - In the posts sheet a story is among the Flyers ("Historia 2 de 2"); chosen, the media viewer shows only its flyer,
    and its bar says "Ver perfil en Instagram ↗".
  - A low-confidence note says "confírmalos con la cuenta" instead of "en la publicación".
  - A post's media comes before a story's (the data's order), so a post's flyer is the cover once there is one.

## Opening an event

On phones the details open like Instagram's comments: a drawer rises over the list, and the list stays where it was.
(Not a viewer showing the flyer again over the list and moving sideways between events: it felt like leaving the list.)

- **An action row under each card's flyer, like Instagram's** (`.event-card__actions`, `views/eventCard.ts`):
  **Detalles ›**, **Compartir** (the event's link through the phone's menu) and **Guardar**. Each is a full touch
  target above the card's stretched link, and the gaps between them still open the card.
- **"Detalles ›" is a printed label with an offset** (the owner's pick, "G2"): an ink frame with no fill, and under it
  an offset in the period rule's three colors (`--stripe-1..3`), like a misregistered print. It's found at a glance
  without competing with the one primary button.
  - **Built:** the frame is the button's `::after` and the offset its `::before`, cut (`clip-path`) to an L that tucks
    `--details-tuck` under the frame's ink, so no line of page shows between ink and band and all four lines look
    equally thick. Placed and moved with insets, never a `transform` (a transform drew the band antialiased, smeared
    over the line). Check any change at several device densities, in both themes, at rest and pressed.
  - **Contrast:** the frame (≥3:1) and the label (≥4.5:1) are in `check-contrast.mjs`; the offset is decorative, like
    the stripes.
- **No line at the card's foot** (such as "Ver horario, precios y cómo llegar"): "Detalles" on every card already says
  it, so the card ends with its price and rhythms.
- **The whole card opens the details**, its flyer and clip included (the posts' badge opens the posts).
- **First visit:** the first card's "Detalles" pulses gently once when its row is fully on screen
  (`views/detailsHint.ts`), never again in this browser (`details-hint-seen` in localStorage, `lib/onceFlag.ts`), and
  not at all once the visitor has opened any details. No hint bubble over the list. Nothing moves with reduced motion.

**The drawer** (phones and tablets, under 900px wide, or under 600px tall: a phone in landscape keeps it, with the bar at the bottom; `EventDrawer.astro`, `drawer.css`, `scripts/views/eventDrawer.ts`):

- **Over the list:** it rises to half height. The list doesn't change or navigate: it stays visible above, under a
  light scrim. It only scrolls when the tapped card would be mostly hidden.
- **No flyer, no thumbnail:** the visitor is looking at the card. The head: the date, the title, the type tag,
  "@account" and ×. Then the quick actions **Instagram** (the post inside the site; a story: the profile) ·
  **Compartir** · **Guardar**; **Cuándo, Lugar** (with "📍 Cómo llegar"), **Precio** (one line: "Desde $ 25.000 · 3
  opciones", "Gratis" or "Por confirmar") and **Organiza** (the organizer and the account, said once when they're the
  same), then Con, Incluye, Contacto; the prices when there's more than one (a workshop series' **Sesiones** first:
  one row each, the next one marked "PRÓXIMA" ("HOY" on its day), those past "YA PASÓ"); the rhythms; "Ver las 3
  publicaciones"; a story's line; the post's text; "¿Algo está mal? Repórtalo". At half height, when, where and the
  price are on screen.
- **Two heights:** half and full. Pulling it up, or scrolling its content at half height (also the wheel or the
  keyboard), expands it; at full height its content scrolls. Pulling down from its bar, or from the top of its
  content, returns it to half height; another pull closes it. The handle is a button: a tap switches heights ("Ver
  todo el detalle" / "Ver menos"). Release follows the bottom sheets' rules (see "Event detail: drawer and page"),
  settling at the nearer height.
- **Closing:** a drag down, a tap on the scrim, ×, Escape or the back button, all through the history (back): it
  slides away at the finger's speed, at once when Safari's edge swipe already animated it.
- **Modal:** the page behind doesn't scroll, focus goes to the title and back to what opened it (the card or its
  "Detalles"), and it's announced as a dialog named by the event's title.
- **One event at a time:** no ‹ › between events, no counter, no swipe nudge (Instagram's comments don't move
  between posts).
- **The list's clips** keep playing above the half drawer and pause under the full one.

**The side panel** (900px and wider, 600px and taller): the same content, in a panel on the right, not modal, so the
list stays usable next to it. **Where it would lie over the page** (windows up to about 1,970 px wide), **the whole
page moves beside it** while it's open: the header, the filters, the list and the footer, against the panel's edge,
moving only as far as they must; the list keeps the columns that still fit (4 → 3 at 1,280–1,440 px, 2 at about
1,000), and the search field narrows. What moved **glides** there in 280 ms with the panel (none with "reduce motion",
nor on a resize or a shared link opening the page), and what the visitor sees keeps its height on screen (the
event's card if it's in sight, else the first piece of the list in sight). Wider screens:
nothing moves. History: on 5 Oct 2026 the owner chose a page that never moves (the list shifting left felt shaky),
the panel over the page's right side; on 6 Oct, after #142 had moved only the list where it hid cards, the owner
chose this instead: covering a whole column, the selected card among them, was worse than things moving (WCAG 2.2,
2.4.11; IBM Carbon, Fluent and Material 3 put a panel beside the content and reflow it, as Gmail, Drive and Spotify
do). Another card shows its
event in the panel (the address changes without adding to the history), and the open event's card is outlined (`--card-current`: amber in light, pink in dark; never the focus ring's color, red in light and gold in dark, so with the keyboard elsewhere both show). × and
Escape close it, and the focus goes back to the last card opened. If the list next to it moves to another view (the
calendar), another card gets its own history entry. A period opened whole meanwhile (a click on "Ver 3 más", or the
arrows from the details) gets its entry when the panel closes, so back then folds it and never reopens an event
already left (the owner's review, 6 Oct 2026). Closing never reopens an earlier event (`historyMove`).

## Event detail: drawer and page

- **Same parts in both** (`scripts/views/eventDetail.ts`): the drawer's content (`eventDrawerHtml`) and each event's own
  page (`pages/evento/[id].astro`, one static page per event, `eventDetailHtml`). The page adds the flyer on top, as on
  its card.
- **The event's page** is what a shared link points to, for link previews (see "Link previews"), search engines
  (schema.org `Event` data) and browsers without scripts. Its header links "← Ver próximos eventos"; a past event says
  "Este evento ya pasó." (a night past midnight only once its end time has passed, the morning after).
- **Panel sheets** (filters, an event's posts, a post, the install steps) share one base: `.sheet-panel` (`sheet.css`, attached to the bottom on phones, a centered window on wide screens) and `initPanelSheet` / `openPanelSheet` (`lib/sheet.ts`: ×, backdrop, drag down, Escape). Each gets its own history entry, so the phone's back button closes only the sheet on top: a post, then the details, then the list; forward never reopens a closed one. A sheet opened in another's place (a post chosen among the posts) takes over its entry, and closing it gives the focus back to what opened the first one.
- **Bottom sheets** behave like native ones, with values from Material/iOS sheets, the same as the drawer: they rise
  while the backdrop fades in; dragging down follows the finger 1:1 and dragging up rubber-bands; on release, a flick
  down (>0.5 px/ms) or a drag past max(110px, 22% of the screen) closes, otherwise it springs back; closing continues
  at the finger's speed, and at once when Safari's edge swipe already animated the back navigation. No rise and no
  slide with reduced motion.
- **Back moves between the app's screens** (`screenHistory.ts`): a period opened whole, the calendar and Guardados each get a history entry, so the phone's back button returns to the previous screen where it was scrolled, instead of leaving the site (which closes the installed app). Undoing one from the page steps back, so history never piles up. Between the calendar and Guardados the entry is replaced (`replaceScreen`): back from either returns to the list, like Instagram's tabs. Back from an in-page jump (Info, `#info`) puts the scroll back where it was. The app restores scrolling itself (`history.scrollRestoration = "manual"`).
  - **Overlays** (the sheets and the details) get entries on top of the screen's (`overlayState`). A move undone from inside one (the sheet's "Limpiar") is undone right there, the overlay stays, and its screen's entry is skipped later.
- **The details have a URL:** opening pushes `/evento/<id>/`, so the phone's back button closes them. A copied link opens that event's page.
- **Shared links open the app.** An event's link (`/evento/<id>/`) forwards a browser to the home page (`?evento=<id>`), which shows the list at that event's card with its drawer open at half height (`main.ts`, `openSharedEvent`): × or back leave the visitor on the list, not off the site. A past event (in Bogotá's time) or one no longer in the list stays on its page.
- **Missing details say "Por confirmar"** in their own row (hora, lugar, precio). Gemini's free-text doubts are not shown; a low-confidence extraction gets one note asking to confirm in the post.
- **"Cómo llegar"** after the venue opens Google Maps (only when there's a venue or address).
- **Reporting an error:** the detail ends with a small "¿Algo está mal? Repórtalo" link to the Google Form, with the event filled in (`feedbackUrl`); the footer has "Escríbenos" for anything else. Out of the way of the actions, because almost everyone just wants the event.
- **The contact is a link** (`lib/contact.ts`): an @username opens its profile inside the site; a mobile number opens a WhatsApp chat (`wa.me/57…`), not a call: that's how people reach academies; a landline (60X) is a call (`tel:`); a website opens it. A number that isn't a full Colombian or international one stays plain text.
- **Icons** (`scripts/lib/icons.ts`): Instagram and WhatsApp marks (Simple Icons, CC0) and drawn icons, inline SVG in the text color, hidden from screen readers.

## Component rules

- **Naming:** BEM-style. `block`, `block__element`, `block--modifier`, and state classes `is-*` (`is-today`, `is-selected`, `is-past`). The CSS file is named after the block.
- **Only semantic tokens** inside component CSS. If a value is missing, add a token; never hard-code a color, size or spacing in a component.
- **One primary button per view** (`.btn--primary`). Everything else is the outlined `.btn`, including "Compartir" (it opens the phone's share menu, not only WhatsApp, so it doesn't wear WhatsApp's green).
- **Event-type color** is applied with a `.t-<type>` class, which exposes `--type` for that element (tags, pills, dots).
- **No emoji in the UI.** Use text or inline SVG icons.
- **No `style=""` attributes** in markup: the Content Security Policy blocks them and the build fails on them. Use a class, or set a value that depends on the data from a script (`element.style.setProperty`), like a card's `--flyer-ratio`.
- **Flyers are never cropped** (`object-fit: contain`). Like Instagram's feed, phones show each flyer at its own shape, from 4:5 (portrait) to 1.91:1 (landscape); taller ones (stories), and every card on wider screens, get a 4:5 frame, filled around the flyer with a blurred copy of itself. The size comes from the file at build time (`src/data.ts`), so the page never jumps as images load.
- **Accessibility:**
  - Every interactive element is a real `<button>` or `<a>`.
  - Visible focus ring (`--focus`).
  - Contrast meets WCAG 2.2 AA in both themes: ≥ 4.5:1 for text, ≥ 3:1 for large text and for the outlines and indicators people need to see (borders, focus ring, selected states).
  - `npm run check` runs `scripts/check-contrast.mjs`, which reads `tokens.css` and checks every pair the components use; CI fails if one drops below AA. New color pairs go in its `PAIRS` list.
  - Don't dim text with `opacity`: use `--text-muted`. Colored marks that aren't text (calendar dots) get a `--border` outline.
  - **Accent words on the page use `--accent-text`**, not `--accent` (below 4.5:1 on the page in light): "× Limpiar",
    and a card's time in the phones' feed, where cards have no fill.
  - **A name starts with the words shown** (WCAG 2.5.3, label in name: a voice command says what it sees): "Finde,
    Cuándo: Este fin de semana". A calendar day is named by what it shows, then, for screen readers only, its date,
    "festivo" and count ("2 Salsa al parque +1, Viernes, 2 de octubre, 4 eventos").
  - Everything is inside a landmark (labelled regions, `main`, the bar at the bottom as `nav`, the footer). The
    drawer's head is a `<div>`, not a second banner.
  - **A calendar day never grows its week:** on phones at most two rows of dots, then a muted "+N" (`dotsHtml` and
    `MAX_DOTS_PER_DAY` in `views/calendarView.ts`); on wide screens three names and "+N". The exact count is in the
    day's label and the heading over its list (the owner, 4 October 2026).
  - `--divider` and the stripes are decorative and exempt.
  - Motion is respected via `prefers-reduced-motion`.

## Adding something new

1. Need a new color, size or spacing? Add a token in `tokens.css` (semantic colors need both a light and a dark value).
2. Create `styles/components/<block>.css` and import it in `layouts/BaseLayout.astro`, after the other components. Don't chain CSS with `@import`: the dev server doesn't reload imported files.
3. Static markup goes in an Astro component (`src/components/<Block>.astro`); markup rendered from data goes in a view (`src/scripts/views/<block>.ts`).
4. Check both themes and a phone width (375px), and run `npm run check`, before opening the PR.
