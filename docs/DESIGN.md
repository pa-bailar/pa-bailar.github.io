# Pa' Bailar design system

Two themes, one system:

| Theme | Name | Mood | Source |
|---|---|---|---|
| Light | **Fania de día** | A 1970s salsa flyer: cream offset paper, tomato red and marigold ink | New York salsa graphics (Izzy Sanabria, Fania Records), 1968–88 |
| Dark | **Noche Fania** | A dance floor at night: record black (a warm near-black), candlelit cream, gold accents | Spanish *bachata sensual* events (Korke & Judith era), 2010s–2020s |

The **structure** (type, motifs, components) comes from Fania. The **mood** of the dark theme comes from bachata sensual. Both themes share every component; only the color values change.

**Theme modes**, like macOS "Auto". The toggle in the top right cycles **Auto → Día → Noche**, and the choice is remembered:
- **Auto** (default): Fania de día from 6:00 to 17:59 and Noche Fania the rest of the day, by the visitor's clock. It switches on its own while the page is open. Bogotá is near the equator, so sunrise and sunset stay close to 6:00 and 18:00 all year.
- **Día / Noche:** always that theme.
- **Without JavaScript:** the device's light/dark setting.

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
   ├─ jump-bar.css       ← phones: the sticky filter bar and its dropdown menus
   ├─ view-switch.css    ← phones: the floating calendar / list button
   ├─ filter-sheet.css
   └─ site-footer.css
```

## Tokens

`tokens.css` has three layers:

1. **Palette:** raw named colors (`--wine-900`, `--tomato-600`, `--marigold-400`…). **Components never use these.**
2. **Semantic colors:** what a color is *for* (`--bg`, `--surface`, `--text-muted`, `--accent`, `--action`…). Each is `light-dark(<Fania de día>, <Noche Fania>)`. **Components only use these.**
3. **Scales:** type sizes, spacing, radii, control sizes, motion.

Themes switch through CSS `color-scheme`: `light dark` (follow the device) when no theme is set, or forced by `html[data-theme="light" | "dark"]`. `scripts/theme.ts` sets `data-theme` (the theme in use) and `data-theme-mode` (auto/light/dark, which picks the toggle's icon). An inline copy of its logic in `BaseLayout.astro` applies the theme before first paint (no flash) and sets the `theme-color` meta for the phone's address bar.

### Semantic colors

| Token | Fania de día | Noche Fania | Use |
|---|---|---|---|
| `--bg` | cream-150 (aged offset paper) | vinyl-900 (the record: warm near-black) | Page background |
| `--surface` | cream-75 | vinyl-800 | Cards, dialog, buttons |
| `--surface-sunken` | cream-250 | vinyl-950 | Image wells, callouts |
| `--border` | wine-900 | vinyl-400 | Outlines of cards, chips, buttons |
| `--divider` | cream-300 | vinyl-600 | Lines between sections and rows |
| `--text` | wine-900 | cream-100 | Body text |
| `--text-muted` | cocoa-500 | cocoa-300 | Metadata, captions |
| `--text-italic` | wine-500 | rose-300 | Bodoni italic accents |
| `--logo` | tomato-600 | marigold-400 | The wordmark |
| `--accent` | tomato-600 | orange-400 | Event time, active tab, selected day |
| `--action` / `--on-action` | deep orange / white | marigold / wine | The single primary button ("Ver en Instagram"), shaped like the WhatsApp one |
| `--chip-active-*` | wine / cream | marigold / wine | Selected filter chip |
| `--stripe-1..3` | tomato, orange, marigold | brighter tomato, orange, marigold | 70s stripes |
| `--sticker-*` | tomato / cream | marigold / wine | Round date sticker |
| `--type-*` / `--on-type` | per event type | per event type | Type tag, calendar pills and dots |

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
- Small parts: `--tab-underline` 3px (the selected tab's line), `--icon-sm` 16px (marks over thumbnails), `--icon-lg` 24px (the floating button), `--handle-width` × `--handle-height` 40×4px (every sheet's grab handle, `.sheet-handle`), `--fab-size` 44px.
- Over photos: `--on-image` (white) with `--shadow-on-image`, the same in both themes, for marks that sit on any flyer (▶, stacked squares).

## Signature motifs

- **70s stripes** (`<Stripes />`): three bands (tomato, orange, marigold). Used in the page headers (home, event page, 404), the event detail and the footer; the period headings use the same three colors as one thin line. Don't use them anywhere else; they lose meaning if repeated.
- **Date sticker:** a round "record label" with the day and month, overlapping the bottom-right of each flyer: hanging below it on cards, inside its corner in the event detail. Two events sharing one flyer (a festival's Sunday and Monday) are told apart by it while swiping.
- **Italic headings:** group, day and month headings in Bodoni italic, like a handwritten setlist.

The light theme's creams are the paper of 1970s salsa flyers and sleeves. The page uses the slightly darker, aged tone (`#ECDDC6`) rather than near-white, so it isn't glaring. Cards sit one step lighter so they still lift off the page.

## Upcoming list

- **Period headers** (Izzy Sanabria's Fania lettering): the title in the display face (Shrikhand) in `--period-title` (deeper tomato in light, soft gold in dark: calmer than the logo, no glare) with a 2px offset shadow (`--period-shadow`: sand in light, the deepest black in dark), between two thin lines made of the three Fania colors side by side and the event count ("5 eventos"), with generous space above. Page colors only, so it never reads as a post. Title contrast 4.93:1 (light) and 9.47:1 (dark): it passes even the normal-text 4.5:1.
- **Grouped by period, not by day** (`groupByPeriod` in `scripts/state.ts`). Days with one or two events share rows instead of each leaving a mostly empty row. The buckets don't overlap, follow the usual calendar "date range" grouping, and split out the weekend because that's when most socials happen:

  | Group | Range |
  |---|---|
  | Hoy | today, always first: what most visitors come for |
  | Esta semana | tomorrow … Thursday of this week (only Monday–Wednesday) |
  | Este fin de semana | Friday … Sunday of this week (Friday night counts as weekend) |
  | Próxima semana | next Monday … Sunday |
  | Más adelante en *mes* | rest of the current month |
  | *Mes* / *Mes de año* | one group per later month (year shown outside the current year) |

  Weeks run Monday to Sunday.
- **Each card says when:** "Hoy / Mañana · 8:00 p. m.", the weekday within a week ("Domingo · 6:00 p. m."), or weekday and date further away ("Martes 20 oct."). The sticker keeps the date number.
- **The academy on each card** is a button: it filters the list to that academy and shows "Solo eventos de @academia · Ver todas las academias" under the chips. It sits above the card's stretched click area.
- **Free events** show their price as a green "Gratis" label (`--free` / `--on-free`, checked for contrast).
- **Empty results** always offer a way out: "Quitar filtros" when filters are active.
- **Dance styles** are one line of text joined by a middle dot glued to the previous word with a no-break space (`stylesLabel`), never separate elements with CSS separators. The dot stays centered between words, and a wrapped line never starts with a dot.

## Info and footer

- **"Info"** sits after the view tabs and looks like one, but it's a link to the footer (`#info`), never selected and outside the tab list for screen readers.
- **The footer is "Sobre Pa' Bailar"**: a heading in Bodoni italic, a one-line description, the disclaimer, the sources (every Instagram account the sweep reads, from `meta.json`), installing the app, "Escríbenos" (the report form), and at the bottom "Hecho por @jzamora5" (GitHub) with the version on the right. Each line has its icon.

## Sharing

Everything goes through the phone's own share menu (`lib/share.ts`, Web Share): the visitor picks
WhatsApp, a group, Instagram, Telegram or "copy", as in any app. Where there's no menu (most computers),
WhatsApp opens with the text. What can be shared (`scripts/views/sharing.ts`):
- **An event:** "Compartir" in its detail (WhatsApp green): its title, date, place and price, and its
  page's link, whose preview shows the flyer.
- **A near period:** a share icon at the end of "Hoy", "Esta semana", "Este fin de semana" and "Próxima
  semana" (`.share-icon`): an image of its events and a list for WhatsApp, as filtered on screen (a
  rhythm, a type, an academy or a search goes in the subtitle).
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
  visitor is: iPhone (Compartir → Agregar a inicio), Android (menú ⋮ → Instalar aplicación), or inside
  Instagram, WhatsApp or Facebook, which can't install (open it in the browser first). Nothing once
  installed.
- **A reminder:** whoever dismissed the banner gets one small reminder, once, when they save their second
  event ("Tus guardados a un toque: instala Pa' Bailar", `.install-nudge`, at the bottom to the left of the floating button, gone after
  10 seconds). Offering again at a moment the app clearly helps, instead of nagging, is Google's advice.
- **Knowing it's installed:** opened as the app; or this browser saw it installed (on Android the app shares the
  browser's storage, so opening the app once is enough); or Chrome on Android says so (`getInstalledRelatedApps`,
  the manifest lists the app as related to itself). Chrome offering to install again means it was uninstalled,
  and the offer comes back. iPhone keeps the home-screen app apart from Safari and can't be asked: there,
  only × hides the banner.

## Saving and searching

- **Saving ("Guardar")** is a bookmark, like Instagram's: at the end of each card's last line (price and rhythms;
  the date sticker takes the top-right corner) and in the detail, next to the date (`.save-button`, `scripts/views/saveButton.ts`). Filled in the accent color
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
- **Near periods in full:** Hoy, Esta semana, Este fin de semana and Próxima semana show their flyers.
- **Far events by year:** months get their own group for the next six months (relative to today, so in December next January is still its own month); beyond that, one group per year: "En 2027", or "Más adelante en 2027" when months of 2027 are already listed.
- **Later periods summarized:** "Más adelante en <mes>" and each later month start as one row with their
  first five flyers as small squares and "Ver los 23 eventos ›" (`.period-summary`); tapping it shows
  them in full. Choosing that period in the bar's menu opens it too.
- **Busy periods capped:** an open period shows six events, then "Ver 7 más" (`.period-more`).
- **Short lists whole:** with 12 events or fewer (for example once filtered) nothing is summarized. With
  nothing in the near periods, the first period opens.
- What the visitor opens stays open while filtering or switching views, and focus moves to the first
  newly shown event.

## Phones: feed, jump bar, view switch and filter sheet

- **Feed like Instagram:** under 720px each event is a full-width post, the flyer edge to edge at full size and the details right below, separated by space instead of boxed cards. Nothing is shrunk into thumbnails.
- **Jump bar** (`JumpBar.astro`, `scripts/views/jumpBar.ts`): one slim row (`--jump-bar-height`, 56px) stuck to the top, modeled on the filter bars of Google Maps and Airbnb: **[🔍] [🔖 3] [⚙ 2] [Finde ▾] [Salsa ▾]** (search and "Guardados": see "Saving and searching"). Two compact dropdowns instead of a row of chips, so nothing scrolls sideways or gets cut off.
  - **⚙** opens the filter sheet; the badge counts active filters.
  - **Period dropdown:** names the period on screen (scroll-spy); its menu lists each period with its number of events, and picking one jumps there. Always shown in the list (disabled, "Fechas", when nothing matches); hidden in Calendario.
  - **Rhythm dropdown:** reads "Ritmo", or the selected rhythm in the selected-chip style; its menu lists "Todos los ritmos" and each rhythm with its number of events, most frequent first.
  - **Fixed shape:** ⚙ has a fixed size with its badge on the corner, and the two dropdowns split the rest equally (max 220px each), cutting long names with "…". The bar never changes size as filters change.
  - **Menus** are popovers under their button: aligned to its left edge (right edge for a button on the right half), never wider than the screen or taller than the space below; long names wrap. Options are radio items, label and count centered vertically. Scrolling or resizing closes them.
  - **Keeping your place:** when a filter changes while you're inside the list, the period you were reading stays right under the bar; if the filter removed it, the next period (else the previous one) takes its place.
  - **Hides like Instagram's header:** it hides while scrolling down and returns on any scroll up. It never hides near the top of the page, while it holds focus, or during a jump.
  - **Where it shows:** wherever the full toolbar isn't sticky (phones, short windows), in both views.
- **View switch** (`ViewSwitch.astro`, `scripts/views/viewSwitch.ts`): the tabs scroll away on phones, so an icon button (`--fab-size`, 44px) floats at the bottom right. It offers the other view: a calendar icon in the list, a list icon in the calendar (named for screen readers).
  - **Look:** the action color (`--action` / `--on-action`), ringed with the page color and a shadow, so it stands out even over a flyer of the same colors.
  - **Each view keeps its place, like Instagram's tabs:** coming back to a view lands exactly where it was left. The calendar's first visit starts at its top (back up to the tabs if the page was past them). If a filter changed meanwhile, the list comes back at the same period instead, as with any filter change. The tabs behave the same.
  - **Room:** the footer gets extra bottom padding so the button never covers its last line. Hidden wherever the toolbar is sticky.
- **Filter sheet** (`FilterSheet.astro`):
  - **Opening:** "Filtros" opens the type and style chips in a sheet that slides up from the bottom, so the list stays where it was. Chips wrap, so every option is visible.
  - **Results:** "Ver N eventos" closes it. The bar's ⚙ button shows how many filters are active, as a badge on its corner.
  - **Phones only:** the toolbar's chip rows are hidden, so filters are only in the sheet; no rows scroll sideways cutting chips.
  - **Dismissing:** drag it down like the viewer (see Bottom sheets).
  - **One renderer:** the same chips render into the toolbar and the sheet (`[data-filter-row]`).

## Events with several posts

An event can be announced by several Instagram posts (a flyer, then a video, a reminder). It's still **one** card:
- **Card:** shows the main post's flyer (images come before videos). A `.media-count` label ("2 publicaciones") sits in the flyer's top-right corner.
- **Dialog and event page:** a `.posts-badge` ("▦ 16") in the flyer's top-right corner opens every post in a sheet (`PostsSheet.astro`, `scripts/views/postsSheet.ts`), like Airbnb's photo count: the gallery takes no room in the detail, so the date and title stay in view under the flyer. The sheet rises from the bottom on phones and is a centered window on wide screens. It has two tabs, Flyers (photos and carousels) and Videos, when the event has both, and square thumbnails like Instagram's grid (▶ on videos, stacked squares on carousels, white with a shadow) that wrap. Thumbnails are 160 px files made at build time (`pages/thumbs/[name].webp.ts`), a few KB each. Choosing one shows it in the detail (image, "Ver en Instagram" link, caption) and closes the sheet; the detail keeps its scroll position.
- **Never a sideways scroll inside the viewer:** the viewer already swipes sideways between events, so nothing inside a slide may scroll sideways (`.viewer-slide { overflow-x: hidden }`).
- **Watching a post here:** tapping the flyer opens the post inside the site, in a sheet (`PostViewer.astro`, `scripts/views/postViewer.ts`), with Instagram's own player (`lib/instagramEmbed.ts`). Videos play there and carousels swipe through all their slides. Opening the Instagram app would leave the site, and the app's back button doesn't come back. The sheet's bar keeps "Abrir en Instagram ↗". Our copy of the flyer shows at once and the player replaces it when ready; if it can't load, the flyer stays with "Esta publicación solo se puede ver en Instagram." Instagram's script loads on the first tap only, never with the page. Closing the sheet removes the player, so a video stops. A label over the image says what's behind it (`lib/mediaLabel.ts`, `.event-dialog__play`): "▶ Ver con sonido" when its clip already plays, "▶ Ver video" for a video without a clip, "Ver las 4" (carousel icon) for a carousel; none for a single photo.
- **A video plays in place** (`views/inlinePlayer.ts`): tapping a video (a reel, or a carousel shown with its clip) turns the image itself into Instagram's player, full length and with sound, without a second sheet on top; the details stay below. Our caption is already in the detail, so the player comes without Instagram's (shorter). While it loads the image stays ("Cargando el video…"); if it can't load, the image comes back with a note. Swiping to another event or closing the viewer removes the player, so no sound plays off screen; the clip comes back. Photos and carousels still open the post sheet. Instagram's player catches touches, so while it's open, swiping on it doesn't move to the next event (the arrows and the area below do).
- **Videos move by themselves.** When the image is a video's frame and the backend made its clip (`preview`), the detail plays it: silent, looping, about 6 seconds, like a feed (`views/clips.ts`). Only the clip on screen plays (the viewer holds every event as a slide); swiping away pauses it, closing the viewer stops it. It doesn't autoplay with reduced motion or the browser's data saver: the still frame stays. Tapping opens the post with sound, as any image. The service worker doesn't cache clips.
- **Video events are marked in the list:** a ▶ in a dark circle in the middle of the card's image (`.play-mark`), like any video thumbnail, so it's clear before opening it.
- **"Ver en Instagram ↗"** in the actions is the explicit way to the app; the ↗ says it leaves the site.

## Event detail: dialog and page

- **Same markup in both** (`scripts/views/eventDetail.ts`): the home page's dialog and each event's own page (`pages/evento/[id].astro`, one static page per event).
- **When and what first:** right under the flyer, the date line (`.event-dialog__when`, the cards' "Domingo · 8:00 p. m." in the accent color) and the title, then the type tag, the stripes and the details. On a phone (390×700) both are on screen without scrolling.
- **The viewer swipes between events** (`EventDialog.astro`, `scripts/views/eventDialog.ts`):
  - **What's in it:** one full-width slide per event on screen, in list order (or the selected calendar day's). Swipe sideways (or ‹ ›, or the arrow keys) to change event; scroll up and down to read.
  - **No peeking neighbors:** like Instagram posts, each event fills the width.
  - **The counter follows the finger:** "3 de 9" changes as soon as the next event passes the middle, not when the swipe stops.
  - **Opening it** focuses the viewer itself, not its first button (no outlined ‹ when it opens from a shared link); a shared link opens it once the page has settled, and it stays on the same event when the screen changes size.
  - **Signaling the swipe:** the "3 de 9" counter with ‹ › (dots fail past ~10 items), a seam between events while swiping, and a one-time nudge. The nudge plays after opening: about a fifth of the next event shows, holds, and slides back. It stops at the first touch and isn't repeated after the first swipe.
- **Panel sheets** (filters, an event's posts, a post) share one base: `.sheet-panel` (`sheet.css`, attached to the bottom on phones, a centered window on wide screens) and `initPanelSheet` / `openPanelSheet` (`lib/sheet.ts`: ×, backdrop, drag down, Escape). Each gets its own history entry, so the phone's back button closes only the sheet on top: a post, then the event viewer, then the list.
- **Bottom sheets** (the viewer on phones and the panel sheets; `lib/sheet.ts`, `sheet.css`) behave like native ones, with values from Material/iOS sheets:
  - **Opening:** they rise in 320ms (Material's emphasized-decelerate curve) while the backdrop fades in.
  - **Dragging:** dragging down follows the finger 1:1, shrinks the sheet slightly and fades the backdrop. Dragging up past the top rubber-bands.
  - **Release:** a flick down (>0.5 px/ms) closes, as does a drag past max(110px, 22% of the screen) unless flicked back up. Otherwise it springs back (300ms).
  - **Closing:** it continues from where the finger left it, at the finger's speed (160–280ms, accelerating curve). ×, Escape and back slide it away the same way. When Safari's edge swipe already animated the back navigation, it closes at once.
  - **Reduced motion:** no rise and no slide.
- **Back moves between the app's screens** (`screenHistory.ts`): an academy's events, a period opened whole, the calendar and "Guardados" each get a history entry, so the phone's back button returns to the previous screen where it was scrolled, instead of leaving the site (which closes the installed app). Undoing one from the page ("Ver todas las academias", the list button, "Guardados" again) steps back, so history never piles up. The app restores scrolling itself (`history.scrollRestoration = "manual"`).
- **The viewer has a URL:** opening pushes `/evento/<id>/`, so the phone's back button closes it; swiping replaces it, so back still closes instead of stepping through events. A copied link opens that event's page.
- **Shared links open the app.** An event's link (`/evento/<id>/`) forwards a browser to the home page with that event already in the viewer (`main.ts`, `openSharedEvent`): the visitor sees it as from the list, can swipe to the others, and "back" closes it onto the list instead of leaving the site. The page itself stays for link previews (WhatsApp, Instagram: its flyer as a small JPEG made at build time, `pages/og/[id].jpg.ts`), for search engines (schema.org `Event` data) and for browsers without scripts.
- **Missing details say "Por confirmar"** in their own row (hora, lugar, precio), in muted italics. Gemini's free-text doubts are not shown; a low-confidence extraction gets one note asking to confirm in the post.
- **"Cómo llegar"** after the venue opens Google Maps (only when there's a venue or address).
- **Reporting an error:** the detail ends with a small "¿Algo está mal? Repórtalo" link to the Google Form, with the event filled in (`feedbackUrl`); the footer has "Escríbenos" for anything else. Out of the way of the actions, because almost everyone just wants the event.
- **The contact is a link** (`lib/contact.ts`): an @username opens its Instagram; a mobile number opens a WhatsApp chat (`wa.me/57…`, with the WhatsApp icon), not a call: that's how people reach academies; a landline (60X) is a call (`tel:`), since it has no WhatsApp; a website opens it. A number that isn't a full Colombian or international one stays plain text.
- **Icons** (`scripts/lib/icons.ts`): Instagram and WhatsApp marks (Simple Icons, CC0) and drawn calendar and pin icons, inline SVG in the text color, hidden from screen readers.

## Component rules

- **Naming:** BEM-style. `block`, `block__element`, `block--modifier`, and state classes `is-*` (`is-today`, `is-selected`, `is-past`). The CSS file is named after the block.
- **Only semantic tokens** inside component CSS. If a value is missing, add a token; never hard-code a color, size or spacing in a component.
- **One primary button per view** (`.btn--primary`). Everything else is the outlined `.btn`, including "Compartir" (it opens the phone's share menu, not only WhatsApp, so it no longer wears WhatsApp's green).
- **Event-type color** is applied with a `.t-<type>` class, which exposes `--type` for that element (tags, pills, dots).
- **No emoji in the UI.** Use text or inline SVG icons.
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
