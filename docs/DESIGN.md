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
   ├─ event-dialog.css
   ├─ sheet.css          ← bottom sheets: rise, drag to dismiss (with scripts/lib/sheet.ts)
   ├─ jump-bar.css       ← phones: the sticky filter bar and its dropdown checklists
   ├─ view-switch.css    ← phones: the floating calendar / list button
   ├─ posts-sheet.css    ← every post announcing an event
   ├─ post-viewer.css    ← a post with Instagram's player
   ├─ filter-sheet.css
   ├─ site-footer.css
   └─ install.css        ← installing the site: the banner and the steps sheet
```

## Tokens

`tokens.css` has three layers:

1. **Palette:** raw named colors (`--wine-900`, `--tomato-600`, `--marigold-400`…). **Components never use these.**
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
| `--action` / `--on-action` | deep orange / white | gold / ink `#1c1033` | The single primary button ("Ver en Instagram"), shaped like the WhatsApp one |
| `--chip-active-*` | wine / cream | pink-300 `#ff9fcb` / ink | Selected filter chip, checked box in the bar's menus |
| `--stripe-1..3` | tomato, orange, marigold | magenta `#e0438f`, coral `#f2785c`, gold | 70s stripes |
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
  `img-src` allows) at 5%, over the page, the viewer's sheet and the bottom sheets, so they read as the same air.
- **Phones:** the toolbar (tabs and chips) isn't sticky there, so it's transparent in dark and lets the light
  through instead of cutting it with a flat band. The sticky jump bar keeps `--bg`.
- **The browser bar** (`theme-color`) is the page's indigo, `#16122B` (`scripts/themeConfig.ts`).

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

Sizes: `--text-2xs` 11 · `xs` 12 · `sm` 13 · `md` 15 (body) · `lg` 17 · `xl` 21 · `2xl` 26 · `3xl` 36 · `logo` 44–72 (fluid).

### Spacing, shape and sizes

- Spacing on a 4px base: `--space-1` 4 · `2` 8 · `3` 12 · `4` 16 · `5` 24 · `6` 32 · `7` 48.
- Corners:
  - `--radius-sm` (2px): tags, chips, buttons, like printed labels
  - `--radius-md` (4px): cards, dialog, calendar cells
  - `--radius-round`: **only** the date sticker and calendar day numbers
- `--border-width` 1.5px everywhere.
- Controls: `--control-height` 40px (buttons, toggle), `--chip-height` 32px, `--sticker-size` 60px.
- Touch: `--touch-target` 44px (rows of the bar's menus, chips in the filter sheet on touch screens, the cards' action row), `--checkbox-size` 18px (the menus' boxes).
- The viewer: `--viewer-peek` 42dvh (phones: the flyer's area above the half sheet), `--panel-width` 420px (wide screens: the side panel), `--thumb-width` × `--thumb-height` 56×70px (the sheet's thumbnail), `--border-width-thin` 1px (the cards' "Detalles").
- Small parts: `--tab-underline` 3px (the selected tab's line), `--icon-sm` 16px (marks over thumbnails), `--icon-md` 20px (the cards' "Detalles"), `--icon-lg` 24px (the floating button), `--handle-width` × `--handle-height` 40×4px (every sheet's grab handle, `.sheet-handle`), `--fab-size` 44px.
- Over photos: `--on-image` (white) with `--shadow-on-image`, the same in both themes, for marks that sit on any flyer (▶, stacked squares).

## Signature motifs

- **70s stripes** (`<Stripes />`): three bands (tomato, orange, marigold). Used in the page headers (home, event page, 404), the event detail and the footer; the period headings use the same three colors as one thin line. Don't use them anywhere else; they lose meaning if repeated.
- **Date sticker:** a round "record label" with the day and month, inside the bottom-right corner of each flyer, on cards and in the event detail. Two events sharing one flyer (a monthly schedule) are told apart by it while swiping. An event over several days within one month shows its days, "13–15 / NOV", a size smaller (`--text-sm`, `.date-sticker--range`) to fit the 60 px circle; across months it keeps the first day ("31 / OCT"), and the card's line gives the range.
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
- **The academy on each card** is a button: it filters the list to that academy and shows "Solo eventos de @academia · Ver todas las academias" under the chips. It sits above the card's stretched click area.
- **Free events** show their price as a green "Gratis" label (`--free` / `--on-free`, checked for contrast).
- **Empty results** always offer a way out: "Quitar filtros" when filters are active ("No hay eventos en esas fechas
  con estos filtros." when dates are chosen).
- **Dance styles** are one line of text joined by a middle dot glued to the previous word with a no-break space (`stylesLabel`), never separate elements with CSS separators. The dot stays centered between words, and a wrapped line never starts with a dot.

## Info and footer

- **"Info"** sits after the view tabs and looks like one, but it's a link to the footer (`#info`), never selected and outside the tab list for screen readers.
- **The footer is "Sobre Pa' Bailar"**: a heading in Bodoni italic, a one-line description, the disclaimer, the sources (every Instagram account the sweep reads, from `meta.json`), installing the app, "Escríbenos" (the report form), and at the bottom "Hecho por @jzamora5" (GitHub) with the version on the right. Each line has its icon.

## Sharing

Everything goes through the phone's own share menu (`lib/share.ts`, Web Share): the visitor picks
WhatsApp, a group, Instagram, Telegram or "copy", as in any app. Where there's no menu (most computers),
WhatsApp opens with the text. What can be shared (`scripts/views/sharing.ts`):
- **An event:** "Compartir" in its detail (WhatsApp green): its title, date, place and price, and its
  page's link, whose preview shows its own image (see "Link previews").
- **A near period:** a share icon at the end of "Hoy", "Esta semana", "Este fin de semana" and "Próxima
  semana" (`.share-icon`): an image of its events and a list for WhatsApp, as filtered on screen (a
  rhythms, a type, an academy or a search go in the subtitle; chosen dates are the periods themselves).
- **My plans:** in Guardados, "Tus 3 eventos guardados · Compartir mis planes" (`.plans-bar`): an image
  and a list where each event carries its own link.
- **The image** (`lib/shareCard.ts`) is drawn in the browser at share time, so it always matches the day,
  the filters and the saved events: a 1080×1350 portrait (what WhatsApp and Instagram show whole) in the
  light theme's colors and the page's fonts. Stripes, "Pa' Bailar", the title in Bodoni italic ("Este
  finde en Bogotá", "Mis planes para bailar"), the dates, up to five events (flyer thumbnail, day and time
  in tomato, title, academy and venue), "+ N eventos más" and the site's address. It's drawn as soon as
  its button comes into view, because phones only allow sharing right at the tap; if it isn't ready, the
  text goes alone.
- **The texts** (`lib/shareText.ts`) are written for WhatsApp: the title in *bold*, one line per event
  ("• Sáb 3 · 6:00 p. m. — *Salsa Freestyle* (@madyumdance)"). Shared links carry `utm_source=compartido`.

## Link previews

What a chat shows when an event's link is shared (WhatsApp, Instagram, iMessage, Telegram, Facebook), made at build
time for every event (`src/linkPreviewImage.ts`; how: `ARCHITECTURE.md`, section 3.4).

- **Title and description:** "Intensivo Ritmos Cubanos — dom 4 oct, 9:00 a. m." ("Level Up Bachata Fusion Congress —
  13–15 nov" over several days) and "Taller de salsa cubana · Cra 16 #52-46 · Desde $ 35.000 · Pa' Bailar"
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

- **What makes it installable:** the manifest (`pages/manifest.webmanifest.ts`: name, wine colors, icons) and a
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
  an event"), among the viewer's quick actions (with its word: "Guardar" / "Guardado") and next to the date on an
  event's page (`.save-button`, `scripts/views/saveButton.ts`). Filled in the accent color
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
- **Jump bar** (`JumpBar.astro`, `scripts/views/jumpBar.ts`): one slim row (`--jump-bar-height`, 56px) stuck to the top, modeled on the filter bars of Google Maps and Airbnb: **[🔍] [🔖 3] [⚙ 2] [Finde ▾] [Salsa ▾]** (search and "Guardados": see "Saving and searching"). Two compact dropdowns instead of a row of chips, so nothing scrolls sideways or gets cut off.
  - **⚙** opens the filter sheet; the badge counts the filter groups in use (two rhythms count once).
  - **Date dropdown:** filters by date (see "Filters"). With no date chosen it names the period on screen (scroll-spy), as a plain button; with dates chosen it's in the selected-chip style and names them: "Finde", "Hoy + finde", or "2 fechas" / "3 fechas" when the names don't fit. Always shown in the list (disabled, "Fechas", when there's nothing to choose); hidden in Calendario.
  - **Rhythm dropdown:** reads "Ritmo", the chosen rhythm, or "2 ritmos", in the selected-chip style when any is chosen; its menu lists "Todos los ritmos" and each rhythm with its number of events, most frequent first.
  - **Fixed shape:** ⚙ has a fixed size with its badge on the corner, and the two dropdowns split the rest equally (max 220px each), cutting long names with "…". The bar never changes size as filters change.
  - **Menus** are checklists in popovers under their button: aligned to its left edge (right edge for a button on the right half), never wider than the screen or taller than the space below; long names wrap. Each option is a row of `--touch-target` height: a box (checked: the selected-chip colors with a check), the label, and its count. The first one ("Todas las fechas", "Todos los ritmos") is checked when nothing is chosen and clears the group. Choosing keeps the menu open, to choose several; "Listo" (always in view at the bottom), a tap outside, Escape, scrolling or resizing close it.
  - **Keeping your place:** when a filter changes while you're inside the list, the period you were reading stays right under the bar; if the filter removed it, the next period (else the previous one) takes its place.
  - **Hides like Instagram's header:** it hides while scrolling down and returns on any scroll up. It never hides near the top of the page, while it holds focus, or during a jump.
  - **Where it shows:** wherever the full toolbar isn't sticky (phones, short windows), in both views.
- **View switch** (`ViewSwitch.astro`, `scripts/views/viewSwitch.ts`): the tabs scroll away on phones, so an icon button (`--fab-size`, 44px) floats at the bottom right. It offers the other view: a calendar icon in the list, a list icon in the calendar (named for screen readers).
  - **Look:** the action color (`--action` / `--on-action`), ringed with the page color and a shadow, so it stands out even over a flyer of the same colors.
  - **Each view keeps its place, like Instagram's tabs:** coming back to a view lands exactly where it was left. The calendar's first visit starts at its top (back up to the tabs if the page was past them). If a filter changed meanwhile, the list comes back at the same period instead, as with any filter change. The tabs behave the same.
  - **Room:** the footer gets extra bottom padding so the button never covers its last line. Hidden wherever the toolbar is sticky.
- **Filter sheet** (`FilterSheet.astro`):
  - **Opening:** "Filtros" opens the date, type and style chips in a sheet that slides up from the bottom, so the list stays where it was. Chips wrap, so every option is visible; on touch screens they're `--touch-target` tall.
  - **Results:** "Ver N eventos" closes it. The bar's ⚙ button shows how many filters are active, as a badge on its corner.
  - **Phones only:** the toolbar's chip rows are hidden, so filters are only in the sheet; no rows scroll sideways cutting chips.
  - **Dismissing:** drag it down like the viewer (see Bottom sheets).
  - **One renderer:** the same chips render into the toolbar and the sheet (`[data-filter-row]`).

## Filters

What narrows the list, in the toolbar on wide screens (chip rows) and on phones in the jump bar's dropdowns and
the filter sheet (`scripts/views/filters.ts`, `jumpBar.ts`; the logic in `state.ts`):

| Group | Choices | Options |
|---|---|---|
| Fechas | several | "Todas las fechas", then each period of the list with something on ("Hoy", "Esta semana", "Finde", "Próx. semana", "Resto de octubre", each month, each year), and "Mañana" right after "Hoy" when something is on tomorrow |
| Tipo | one | "Todo", then each event type |
| Ritmo | several | "Todos los ritmos", then each rhythm ("Salsa" includes its variants) |
| Academia | one | Set by tapping an academy on a card |

- **Any within a group, all across groups:** two rhythms show events with either; two periods show events on during
  either; a period and a rhythm show that rhythm in that period. Search and "Guardados" narrow further.
- **An event over several days counts for every day it runs:** a festival from Sunday to Tuesday is in "Finde" and in
  "Próx. semana"; a congress under way is in "Hoy" and, while it goes on tomorrow, in "Mañana".
- **"Mañana"** overlaps the periods (tomorrow is in "Esta semana", the weekend or next week): it's an extra option,
  shown only when something is on tomorrow (with the other filters) and never as a group unless chosen.
- **Counts and options follow the other groups:** each option's number is how many events it would add with the other
  filters on, and options that would add nothing are left out, so a choice never leads to an empty list. A chosen
  option stays (with 0) so it can be unchosen.
- **Chosen looks chosen:** chips in the selected-chip colors with a check (`.chip--check`), boxes checked in the
  menus, and the dropdown buttons in the selected-chip style with a summary. Chips are toggle buttons (`aria-pressed`),
  menu rows checkboxes (`role="checkbox"`, `aria-checked`, named with their count); focus stays on the option chosen.
- **Clearing:** the first option of each group clears it; "Quitar filtros" (the sheet, and any empty result) clears
  all. Nothing is remembered between visits, and filters aren't in the address, as before.
- **Dates are the list's:** the calendar has its own days, so there the date row and dropdown are hidden and the dates
  chosen are ignored (and kept for the list).
- **Choosing a date instead of jumping:** the date dropdown used to jump to a period. Choosing one period now shows
  just that period, at the top of the list, which is what jumping gave, and several can be combined. When you're
  inside the list, the period you were reading stays under the bar if it's still there; otherwise the next one chosen
  takes its place ("Keeping your place"). With no date chosen the button still names the period on screen.
- **Wide screens:** the date row uses the bar's short names ("Finde", "Próx. semana"), with the full name for screen
  readers, so it fits one line; any row that doesn't fit wraps instead of cutting a chip.

## Events with several posts

An event can be announced by several Instagram posts (a flyer, then a video, a reminder). It's still **one** card:
- **Card:** shows the main post's flyer (images come before videos). A `.media-count` label ("2 publicaciones") sits in the flyer's top-right corner.
- **Dialog and event page:** a `.posts-badge` ("▦ 16") in the flyer's top-right corner opens every post in a sheet (`PostsSheet.astro`, `scripts/views/postsSheet.ts`), like Airbnb's photo count: the gallery takes no room in the detail, so the date and title stay in view under the flyer. The sheet rises from the bottom on phones and is a centered window on wide screens. It has two tabs, Flyers (photos and carousels) and Videos, when the event has both, and square thumbnails like Instagram's grid (▶ on videos, stacked squares on carousels, white with a shadow) that wrap. Thumbnails are 160 px files made at build time (`pages/thumbs/[name].webp.ts`), a few KB each. Choosing one shows it in the detail (image, "Ver en Instagram" link, caption) and closes the sheet; the detail keeps its scroll position.
- **Never a sideways scroll inside the viewer:** the viewer already swipes sideways between events, so nothing inside a slide may scroll sideways (`.viewer-slide { overflow-x: hidden }`).
- **Watching a post here:** tapping the flyer opens the post inside the site, in a sheet (`PostViewer.astro`, `scripts/views/postViewer.ts`), with Instagram's own player (`lib/instagramEmbed.ts`). Videos play there and carousels swipe through all their slides. Opening the Instagram app would leave the site, and the app's back button doesn't come back. The sheet's bar keeps "Abrir en Instagram ↗". Our copy of the flyer shows at once and the player replaces it when ready; if it can't load, the flyer stays with "Esta publicación solo se puede ver en Instagram." Instagram's script loads on the first tap only, never with the page. Closing the sheet removes the player, so a video stops. A label over the image says what's behind it (`lib/mediaLabel.ts`, `.event-dialog__play`): "▶ Ver con sonido" when its clip already plays, "▶ Ver video" for a video without a clip, "Ver las 4" (carousel icon) for a carousel; none for a single photo.
- **A video plays in place** (`views/inlinePlayer.ts`): tapping a video (a reel, or a carousel shown with its clip) turns the image itself into Instagram's player, full length and with sound, without a second sheet on top; the details stay below. Our caption is already in the detail, so the player comes without Instagram's (shorter). While it loads the image stays ("Cargando el video…"); if it can't load, the image comes back with a note. Swiping to another event or closing the viewer removes the player, so no sound plays off screen; the clip comes back. Photos and carousels still open the post sheet. Instagram's player catches touches, so while it's open, swiping on it doesn't move to the next event (the arrows and the area below do).
- **Videos move by themselves.** When the image is a video's frame and the backend made its clip (`preview`), the detail plays it: silent, looping, about 6 seconds, like a feed (`views/clips.ts`). Only the clip on screen plays, one at a time; swiping away pauses it, and a clip whose slide is emptied (the viewer renders only the current event and its neighbors) or whose viewer closed is released, so phones don't run out of memory. It doesn't autoplay with reduced motion or the browser's data saver: the still frame stays. Tapping opens the post with sound, as any image. The service worker doesn't cache clips.
- **Video events are marked in the list:** a ▶ in a dark circle in the middle of the card's image (`.play-mark`), like any video thumbnail, so it's clear before opening it.
- **"Ver en Instagram ↗"** in the actions is the explicit way to the app; the ↗ says it leaves the site.

## Opening an event

On phones each event is a flyer with text under it, and nothing said it opens; the bookmark and the underlined
@academia looked tappable but did other things. And a tap showed the same flyer again, full screen, with the new
information below the fold, so it could feel like nothing happened. So:

- **An action row under each card's flyer, like Instagram's** (`.event-card__actions`, `views/eventCard.ts`):
  **ⓘ Detalles** on the left (an icon and the word, outlined thin: `--border-width-thin`, 1px, in `--border`; a quiet
  label, not a second primary button), **Compartir** (the share icon: the event's link through the phone's menu) and
  **Guardar** (the bookmark) on the right. Each is a 44px target (`--touch-target`) above the card's stretched link,
  and the gaps between them still open the card.
- **A quiet line at the card's foot** (`.event-card__more`), like "Ver los 12 comentarios", naming what the details
  add for this event (`detailsTeaser`): "Ver horario, precios y cómo llegar", only with what it has ("Ver horario y
  precios", "Ver cómo llegar"), else "Ver todos los detalles". `--text-muted`.
- **The whole card still opens the details.** Card, "Detalles" and the line open the same viewer.
- **The date sticker sits inside the flyer's bottom-right corner** on cards too (it used to hang below it, where
  Guardar now is). The title no longer keeps room for it.
- **First visit:** the first card's "Detalles" pulses gently once (a ring in `--pulse` and a slight swell, 1.6s) when
  its row is fully on screen (`views/detailsHint.ts`), never again in this browser (`details-hint-seen` in
  localStorage, `lib/onceFlag.ts`), and not at all once the visitor has opened any details. No hint bubble over the
  list. Nothing moves with reduced motion.

**The viewer as a sheet** (phones and tablets, under 900px):

- **It opens at half height:** the sheet covers the lower 58% of the screen and the event's flyer stays above it
  (`--viewer-peek`, 42% of the screen, or the flyer's own height when it's shorter), like a post under Instagram's
  comments. What's new is on screen at once.
- **The sheet:** its bar (handle, ‹ "3 de 9" ›, ×); a small thumbnail of the flyer (`--thumb-width` ×
  `--thumb-height`, 56×70) with when and the title and the type tag; three quick actions as equal buttons with the
  icon over the word: **Cómo llegar** (only with a place) · **Compartir** · **Guardar** ("Guardado", in the accent
  color, once saved); the stripes; then **Cuándo, Lugar, Precio** (one line: "Desde $ 25.000 · 3 opciones", "Gratis"
  or "Por confirmar") and **Organiza**, then the rest (Con, Incluye, Contacto), the prices when there's more than
  one, the rhythms; at the end "Ver en Instagram ↗", the post's text and "¿Algo está mal? Repórtalo".
- **Expanding:** pulling the sheet up, or just scrolling it, slides it over the flyer to the whole screen; scroll
  snapping settles it at one of the two heights, and further down it scrolls freely. Pulling it down returns to half
  height, and once more closes it. The handle is a button: a tap switches between the two heights ("Ver todo el
  detalle" / "Ver menos"). A mouse can drag the bar too.
- **Swiping keeps the height:** the next event opens at the height the sheet had.
- **The flyer above the sheet** is the detail's own: a video's clip plays there (and stops while the full sheet
  covers it), "Ver con sonido" / "Ver las 4" sit in its top-left corner, the posts badge in its top-right corner, and
  a video tapped plays in place, whole, with the sheet waiting below it.

**The viewer as a side panel** (900px and wider): a panel on the right (`--panel-width`, 420px), not modal, so the
list stays usable next to it: the page leaves room for it, another card opens its event in the panel (the address
changes without adding to the history), and the open event's card is outlined in the accent color. Details first,
then the flyer, then "Ver en Instagram". × and Escape close it; it slides in from the right.

## Event detail: dialog and page

- **Same parts in both** (`scripts/views/eventDetail.ts`): each event's own page (`pages/evento/[id].astro`, one static page per event, `eventDetailHtml`) shows the flyer, then the date line (`.event-dialog__when`, the cards' "Domingo · 8:00 p. m." in the accent color), the title, the type tag, the stripes and the details. The home page's viewer lays the same parts out as a sheet (`eventSheetHtml`, "Opening an event" below).
- **The viewer swipes between events** (`EventDialog.astro`, `scripts/views/eventDialog.ts`):
  - **What's in it:** one full-width slide per event on screen, in list order (or the selected calendar day's). Swipe sideways (or ‹ ›, or the arrow keys) to change event; scroll up and down to read.
  - **No peeking neighbors:** like Instagram posts, each event fills the width.
  - **Each slide has its bar:** "3 de 9" with ‹ › and ×, at the top of its sheet, so the counter moves with the event while swiping.
  - **Opening it** focuses the viewer itself, not its first button (no outlined ‹ when it opens from a shared link); a shared link opens it once the page has settled, and it stays on the same event when the screen changes size.
  - **Signaling the swipe:** the "3 de 9" counter with ‹ › (dots fail past ~10 items), a seam between events while swiping, and a one-time nudge. The nudge plays after opening: about a fifth of the next event shows, holds, and slides back. It stops at the first touch and isn't repeated after the first swipe.
- **Panel sheets** (filters, an event's posts, a post) share one base: `.sheet-panel` (`sheet.css`, attached to the bottom on phones, a centered window on wide screens) and `initPanelSheet` / `openPanelSheet` (`lib/sheet.ts`: ×, backdrop, drag down, Escape). Each gets its own history entry, so the phone's back button closes only the sheet on top: a post, then the event viewer, then the list.
- **Bottom sheets** (the viewer on phones and the panel sheets; `lib/sheet.ts`, `sheet.css`) behave like native ones, with values from Material/iOS sheets (the viewer drags down to close from its half height):
  - **Opening:** they rise in 320ms (Material's emphasized-decelerate curve) while the backdrop fades in.
  - **Dragging:** dragging down follows the finger 1:1, shrinks the sheet slightly and fades the backdrop. Dragging up past the top rubber-bands.
  - **Release:** a flick down (>0.5 px/ms) closes, as does a drag past max(110px, 22% of the screen) unless flicked back up. Otherwise it springs back (300ms).
  - **Closing:** it continues from where the finger left it, at the finger's speed (160–280ms, accelerating curve). ×, Escape and back slide it away the same way. When Safari's edge swipe already animated the back navigation, it closes at once.
  - **Reduced motion:** no rise and no slide.
- **Back moves between the app's screens** (`screenHistory.ts`): an academy's events, a period opened whole, the calendar and "Guardados" each get a history entry, so the phone's back button returns to the previous screen where it was scrolled, instead of leaving the site (which closes the installed app). Undoing one from the page ("Ver todas las academias", the list button, "Guardados" again) steps back, so history never piles up. The app restores scrolling itself (`history.scrollRestoration = "manual"`).
- **The viewer has a URL:** opening pushes `/evento/<id>/`, so the phone's back button closes it; swiping replaces it, so back still closes instead of stepping through events. A copied link opens that event's page.
- **Shared links open the app.** An event's link (`/evento/<id>/`) forwards a browser to the home page with that event already in the viewer (`main.ts`, `openSharedEvent`): the visitor sees it as from the list, can swipe to the others, and "back" closes it onto the list instead of leaving the site. The page itself stays for link previews (WhatsApp, Instagram: see "Link previews"), for search engines (schema.org `Event` data) and for browsers without scripts.
- **Missing details say "Por confirmar"** in their own row (hora, lugar, precio), in muted italics. Gemini's free-text doubts are not shown; a low-confidence extraction gets one note asking to confirm in the post.
- **"Cómo llegar"** after the venue opens Google Maps (only when there's a venue or address).
- **Reporting an error:** the detail ends with a small "¿Algo está mal? Repórtalo" link to the Google Form, with the event filled in (`feedbackUrl`); the footer has "Escríbenos" for anything else. Out of the way of the actions, because almost everyone just wants the event.
- **The contact is a link** (`lib/contact.ts`): an @username opens its Instagram; a mobile number opens a WhatsApp chat (`wa.me/57…`, with the WhatsApp icon), not a call: that's how people reach academies; a landline (60X) is a call (`tel:`), since it has no WhatsApp; a website opens it. A number that isn't a full Colombian or international one stays plain text.
- **Icons** (`scripts/lib/icons.ts`): Instagram and WhatsApp marks (Simple Icons, CC0) and drawn icons (calendar, pin, and for the install steps Safari's ⋯, Compartir and Agregar a inicio, a link and an arrow), inline SVG in the text color, hidden from screen readers.

## Component rules

- **Naming:** BEM-style. `block`, `block__element`, `block--modifier`, and state classes `is-*` (`is-today`, `is-selected`, `is-past`). The CSS file is named after the block.
- **Only semantic tokens** inside component CSS. If a value is missing, add a token; never hard-code a color, size or spacing in a component.
- **One primary button per view** (`.btn--primary`). Everything else is the outlined `.btn`, including "Compartir" (it opens the phone's share menu, not only WhatsApp, so it no longer wears WhatsApp's green).
- **Event-type color** is applied with a `.t-<type>` class, which exposes `--type` for that element (tags, pills, dots).
- **No emoji in the UI.** Use text or inline SVG icons.
- **No `style=""` attributes** in markup: the Content Security Policy blocks them and the build fails on them. Use a class, or set a value that depends on the data from a script (`element.style.setProperty`), like a card's `--flyer-ratio`.
- **Flyers are never cropped**, in cards or the dialog (`object-fit: contain`). Like Instagram's feed, phones show each flyer at its own shape, from 4:5 (portrait) to 1.91:1 (landscape). The size comes from the file at build time (`src/data.ts`), so the page never jumps as images load. Taller flyers (stories) get a 4:5 frame, and so does every card on wider screens, so rows line up. The space around a flyer of another shape is filled with a blurred copy of itself.
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
