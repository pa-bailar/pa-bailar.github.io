# Pa' Bailar design system

Two themes, one system:

| Theme | Name | Mood | Source |
|---|---|---|---|
| Light | **Fania de día** | A 1970s salsa flyer: cream offset paper, tomato red and marigold ink | New York salsa graphics (Izzy Sanabria, Fania Records), 1968–88 |
| Dark | **Noche Fania** | A dance floor at night: wine-dark, candlelit cream, gold accents | Spanish *bachata sensual* events (Korke & Judith era), 2010s–2020s |

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
| `--bg` | cream-150 (aged offset paper) | wine-900 | Page background |
| `--surface` | cream-75 | wine-800 | Cards, dialog, buttons |
| `--surface-sunken` | cream-250 | wine-950 | Image wells, callouts |
| `--border` | wine-900 | wine-400 | Outlines of cards, chips, buttons |
| `--divider` | cream-300 | wine-600 | Lines between sections and rows |
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

## Signature motifs

- **70s stripes** (`<Stripes />`): three bands (tomato, orange, marigold). Used in the page headers (home, event page, 404), the event detail and the footer; the period headings use the same three colors as one thin line. Don't use them anywhere else; they lose meaning if repeated.
- **Date sticker:** a round "record label" with the day and month, overlapping the bottom-right of each flyer.
- **Italic headings:** group, day and month headings in Bodoni italic, like a handwritten setlist.

The light theme's creams are the paper of 1970s salsa flyers and sleeves. The page uses the slightly darker, aged tone (`#ECDDC6`) rather than near-white, so it isn't glaring. Cards sit one step lighter so they still lift off the page.

## Upcoming list

- **Period headers** (Izzy Sanabria's Fania lettering): the title in the display face (Shrikhand) in `--period-title` (deeper tomato in light, soft gold in dark: calmer than the logo, no glare) with a 2px offset shadow (`--period-shadow`: sand in light, deep wine in dark), between two thin lines made of the three Fania colors side by side and the event count ("5 eventos"), with generous space above. Page colors only, so it never reads as a post. Title contrast 4.93:1 (light) and 9.47:1 (dark): it passes even the normal-text 4.5:1.
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
- **Free events** show their price as a green "Gratis" label (WhatsApp green pair, already checked for contrast).
- **Empty results** always offer a way out: "Quitar filtros" when filters are active.
- **Dance styles** are one line of text joined by a middle dot glued to the previous word with a no-break space (`stylesLabel`), never separate elements with CSS separators. The dot stays centered between words, and a wrapped line never starts with a dot.

## Phones: feed, jump bar, view switch and filter sheet

- **Feed like Instagram:** under 720px each event is a full-width post, the flyer edge to edge at full size and the details right below, separated by space instead of boxed cards. Nothing is shrunk into thumbnails.
- **Jump bar** (`JumpBar.astro`, `scripts/views/jumpBar.ts`): one slim row (`--jump-bar-height`, 56px) stuck to the top, modeled on the filter bars of Google Maps and Airbnb: **[⚙ 2] [Finde ▾] [Salsa ▾]**. Two compact dropdowns instead of a row of chips, so nothing scrolls sideways or gets cut off.
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
- **Dialog and event page:** `.post-thumbs`, square thumbnails of every post under the flyer, like Instagram's grid: crops, with ▶ on videos and stacked squares on carousels, white with a shadow. Flyers (photos and carousels) and videos are separated by two small tabs, "Flyers 9" and "Videos 7" (`.post-tabs`, the main tabs' underline at the label's size); the tab shown is the selected post's kind, and choosing a tab shows its first post. With only one kind there are no tabs, just a label ("3 publicaciones sobre este evento"). Each kind sits in one row of five; with more posts, the fifth place is "+N" (like WhatsApp's media grid) and shows them all, wrapping. The selected post has an accent ring. Tapping a thumbnail changes the image, the "Ver en Instagram" link and the caption.
- **Never a sideways scroll inside the viewer:** the viewer already swipes sideways between events, so nothing inside a slide may scroll sideways (`.viewer-slide { overflow-x: hidden }`; the thumbnails wrap instead). Tabs were replaced for this reason: 16 of them overflowed and made the slide scroll.
- **Videos:** the dialog shows the video's preview frame with a "Ver video en Instagram" label (`.event-dialog__play`). Videos play on Instagram, never embedded.

## Event detail: dialog and page

- **Same markup in both** (`scripts/views/eventDetail.ts`): the home page's dialog and each event's own page (`pages/evento/[id].astro`, one static page per event).
- **The viewer swipes between events** (`EventDialog.astro`, `scripts/views/eventDialog.ts`):
  - **What's in it:** one full-width slide per event on screen, in list order (or the selected calendar day's). Swipe sideways (or ‹ ›, or the arrow keys) to change event; scroll up and down to read.
  - **No peeking neighbors:** like Instagram posts, each event fills the width.
  - **Signaling the swipe:** the "3 de 9" counter with ‹ › (dots fail past ~10 items), a seam between events while swiping, and a one-time nudge. The nudge plays after opening: about a fifth of the next event shows, holds, and slides back. It stops at the first touch and isn't repeated after the first swipe.
- **Bottom sheets** (the viewer on phones and the filter sheet; `lib/sheet.ts`, `sheet.css`) behave like native ones, with values from Material/iOS sheets:
  - **Opening:** they rise in 320ms (Material's emphasized-decelerate curve) while the backdrop fades in.
  - **Dragging:** dragging down follows the finger 1:1, shrinks the sheet slightly and fades the backdrop. Dragging up past the top rubber-bands.
  - **Release:** a flick down (>0.5 px/ms) closes, as does a drag past max(110px, 22% of the screen) unless flicked back up. Otherwise it springs back (300ms).
  - **Closing:** it continues from where the finger left it, at the finger's speed (160–280ms, accelerating curve). ×, Escape and back slide it away the same way. When Safari's edge swipe already animated the back navigation, it closes at once.
  - **Reduced motion:** no rise and no slide.
- **The viewer has a URL:** opening pushes `/evento/<id>/`, so the phone's back button closes it; swiping replaces it, so back still closes instead of stepping through events. A copied link opens that event's page.
- **Shared links open the event page.** Its preview (WhatsApp, Instagram) shows the flyer as a small JPEG made at build time (`pages/og/[id].jpg.ts`), and search engines get schema.org `Event` data.
- **Missing details say "Por confirmar"** in their own row (hora, lugar, precio), in muted italics. Gemini's free-text doubts are not shown; a low-confidence extraction gets one note asking to confirm in the post.
- **"Cómo llegar"** after the venue opens Google Maps (only when there's a venue or address).
- **Icons** (`scripts/lib/icons.ts`): Instagram and WhatsApp marks (Simple Icons, CC0) and drawn calendar and pin icons, inline SVG in the text color, hidden from screen readers.

## Component rules

- **Naming:** BEM-style. `block`, `block__element`, `block--modifier`, and state classes `is-*` (`is-today`, `is-selected`, `is-past`). The CSS file is named after the block.
- **Only semantic tokens** inside component CSS. If a value is missing, add a token; never hard-code a color, size or spacing in a component.
- **One primary button per view** (`.btn--primary`). Everything else is the outlined `.btn`. WhatsApp keeps its own green (`.btn--whatsapp`) because people recognize it.
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
