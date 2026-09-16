# KRI Планер — README

Two-in-one Ukrainian planner web app built on Perchance. One page that behaves like **two separate
sites** — **КАЛЕНДАР** and **ЩОДЕННИК** — each with its own bottom navigation bar, own ШІ chat and
own «Редагування» section. A floating circular button overlaps the nav bar and jumps to the *other*
site.

Live: `https://perchance.org/calendar-diary-ai` (name can change — always read `window.generatorName`
at runtime and link to the **top-level** page, never to the `*.perchance.org` subdomain).

The user's full specification lives in **`SPEC.md`** — read it before changing behaviour.
Open work items are in **`TODO.md`**.

---

## Architecture

Plain ES modules under `src/`, loaded by one `<script type="module" src="src/app.js">`.
No build step, no framework, no bundler. Everything is created with the tiny `h()` hyperscript in
`ui.js` and styled by CSS custom properties from `themes.js`.

```
index.html          body contents only: #app, #toastLayer, #modalLayer, Inter font, styles.css, app.js
main.pjs            $meta + {import:ai-text-plugin} + {import:kv-plugin} + tunable globals
src/
  app.js            boot, state machine (onboarding → auth → app), PANELS config, navigate(), shell + nav
  store.js          kv-backed singleton: auth (PBKDF2), data model, CRUD, day/week queries, save/subscribe
  util.js           date/time helpers, repeat-pattern expansion, plural(), escapeHtml(), url helpers
                    + trip helpers (tripCovers/tripDuration/tripDayIndex/tripRangeLabel/tripReminder)
  schedule.js       itemStatus() → allday|upcoming|soon|live|ending|past, countdown text, next item
  nextcard.js       shared "Найближче / Зараз" card + trip-notice card
                    (the card is used by Графік дня only — the Календар shows just trip notices, per SPEC §2.1)
  themes.js         PALETTES (4 accents × light/dark) + applyTheme()
  icons.js          inline SVG icon set (stroke icons, width/height=100%)
  ui.js             h/append/clear, toast(), openSheet(), confirmDialog(), form fields, btn(), scrambleText()
                    (legacy helper, currently unused), confetti, kriTitle() — the Календар → КRалендар →
                    КRIалендар title animation (added letters = accent, `.kri-pop` pop-in, ~1.6 s total).
                    Only `screens/week.js` (Календар) calls it; the Щоденник title never animates.
  ai.js             static prompts, state snapshots, cache-friendly prompt builder, action-block
                    parser/applier (calendar + diary), ChatSession (streaming + persistence + compaction)
  forms.js          event form (repeat rules; 4th arg `preset` = prefilled date/start/end, used by the
                    «Графік дня» tap-on-empty-hour shortcut), timetable editor + lesson form, task form
                    (task form: «Найближче заняття» pill chip = nearest upcoming lesson of the chosen subject;
                     width: fit-content, 28px gradient calendar badge, bold label + muted date line, and a
                     round «+» / «✓» badge on the right — `.next-lesson-chip` in styles.css. NOTE:
                     `.next-check > svg` is sized in the global bare-svg list near the top of styles.css,
                     otherwise the un-wrapped iconMarkup svg falls back to the 300×150 default and the chip
                     blows up into a giant rounded blob)
  itemdetail.js     item detail sheet (edit / delete); also the trip detail sheet
                    (Виїзд / Повернення / Тривалість / опис / посилання + Редагувати / Видалити)
  scheduler.js      25 s tick: exercise reminder, event reminders, homework reminder (deduped)
  styles.css        all styling, incl. the ≥1180px desktop media queries
  screens/          one module per page: onboarding, auth, week, day, chat, calendar-edit,
                    diary-edit, tasks, exercise
```

### Data model (`store.data`)

```js
{
  version: 1,
  createdAt: <ts>,
  settings: {
    theme: "teal" | "violet" | "ember" | "sunset",
    mode:  "light" | "dark",
    language: "uk",
    exercise:  { enabled, time:"09:00", duration:20, level, lastDone, streak, best },
    reminders: { events, eventsMinutes, homework, homeworkTime },
    diary:     { showDone, hideEmptyDays, defaultNextLesson, rollOver },
  },
  timetable: { "1".."7": [ { id, time, end, title, room, teacher } ] },  // 1 = Monday
  events:    [ { id, title, date, endDate?, time?, endTime?, allDay, desc, link, repeat, annual? } ],
  trips:     [ { id, title, startDate, endDate, desc, link, createdAt } ],  // endDate === startDate → one-day trip
  tasks:     [ { id, subject, title, desc, link, dueDate, done, createdAt } ],
  exerciseLog: { "YYYY-MM-DD": true },
}
```

Persistence: `kv-plugin` folders `accounts` (profile name → `{ salt, hash, createdAt, displayName, avatar }`)
and `appData` (profile name → data). The logged-in profile name is mirrored in
`localStorage[kri.planner.session.v1]` so the app stays signed in on the device. Reminder dedupe keys live
in `localStorage[kri.planner.notified.v1]`.

`store.dayItems(date)` tags every returned item with a `category`:

* `"timed"` — has a start time (lessons, timed events, the daily exercise) → shown **only in Графік дня**
* `"allday"` — an all-day event → shown **only in the Календар**
* `"holiday"` — an annual event (`annual:true`, i.e. «свято») → shown **only in the Календар**
* `"trip"` — a trip day; carries `trip` + `reminder` (the «Завтра подорож» / «Сьогодні у вас подорож» /
  «Подорож триває» / «Сьогодні повернення» wording) → shown **only in the Календар**; the day screen
  never renders it.

`store.timedItems(date)` / `store.calendarItems(date)` are the filtered views the two screens use — keep
the day/calendar split here (single source of truth), not in the screens.

The daily exercise is injected by `dayItems()` as a timed pseudo-item with `source:"exercise"` and
`short:"Зарядка"`, so it appears on today's timeline like any other event; `done` comes from
`exerciseLog`. Its «Почати» button lives on that card — there is no global reminder toast for it.

### Scheduling semantics (important)

* **Timetable lessons** are the weekly recurring grid; they are expanded per date and are what makes
  the calendar fill up automatically.
* **Events** carry an optional `repeat` rule, expanded by `occurrencesOfRepeatPattern()` in `util.js`.
* `store.dayItems(dateStr)` merges lessons + one-off events + trips + the exercise for a day and tags
  each with a `category` (see above); `weekItems()` does 7 days.
* **Графік дня renders `timedItems()`, the Календар renders `calendarItems()`** — never mix the two
  sets in a screen.
* `schedule.itemStatus()` is the single source of truth for the visual states: a block goes accent +
  wiggle `soonMinutes` (=5) before it starts, and grey + still 5 minutes *after it ends*. An **undone
  exercise** is the one exception: it never becomes "past", it stays actionable for the rest of the day.
* `schedule.nextItem(filter)` picks the "Найбліжче / Зараз" card. An exercise is only returned when it is
  *live* or when nothing else is left today, so it never shadows a real upcoming event.

### Day-timeline sizing (`screens/day.js`)

`HOUR_H` = 72 px per hour, `CARD_MIN_H` = 62 px. Cards are **compact stickers**:
`.eb-title` = badge + `item.short || item.title` + link chip, `.eb-meta-row` = `start–end` (+ `· meta`) +
«Почати» / «Виконано» / status badge. **The full description, link and start/end live in the detail
sheet** (`itemdetail.js`), opened by tapping the card — that is the point of the redesign, so do not put
the description back on the card.

`layoutTimed()` packs overlapping items into lanes/clusters; each cluster reserves
`effE = max(item duration, CARD_MIN_H expressed as a duration)` so cards with their *fixed* 62 px height
can never overlap a neighbour. Cards are absolutely positioned inside `.tl-area` (`left`/`width` =
`lane/lanes` %) inside `.tl-scroll`; the hour labels live *outside* `.tl-area`, so a card can never sit
on top of them. Verify `max(hour-label.right) < min(.eb.left)` **per `.day-block`** — the desktop
`.day-list` is a 2-column grid, so a global min/max comparison produces false positives.

The «зараз» marker is `.now-line` (red line) + `.now-label` (red pill in the hour-label gutter). The pill
can sit on top of an hour label, so `dayBlock()` **nudges the one hour label whose centre is within 22 px
of the pill** (`nowTop`) to `nowTop ± 22 px` (the side away from the pill) and never hides it — 22 px is
the smallest centre distance that keeps a ≥4 px visual gap between the 18 px pill and the 16.5 px label.
The pill itself shows the time there. Keep that pairing in mind if you move or resize either.

**The hourly ruler is always the full 24 h** (`DAY_FROM = 0`, `DAY_TO = 24`) for *every* day block,
whether or not the day has timed items — an empty day still renders the complete grid plus a
`.day-free-note` hint instead of an `empty-state` block. `isNightHour()` (before 07:00 / from 22:00) adds
`.night-band` overlays and dims `.hour-line.is-night` / `.hour-label.is-night`. Tapping anywhere in
`.tl-scroll` that is not a card/link/button opens `openEventForm(ctx, null, "once", {date, start, end})`
snapped to `SNAP_MIN` = 30 min — that is what the `.day-free-note` hint promises, so keep the handler.

The «Найближче / Зараз» banner on «Графік дня» is a direct child of `.page-day`, so
`.page-day > .gradient-note { margin-bottom: 22px }` is what keeps it from touching the day columns below
(without it the gap collapses to 0). Keep that rule if you restructure the day screen.

When the lane width is narrow (`width <= 70%`, i.e. 2+ lanes) the exercise card drops its `–end · meta`
part so «Зарядка» + «Почати» always fit; other titles get an ellipsis (`.eb-name` is
`nowrap / overflow:hidden / text-overflow:ellipsis`). If you change font sizes or `.eb` padding, re-check
`scrollHeight - clientHeight` on every `.eb` **and** `scrollWidth - clientWidth` on every `.eb-name` —
clipping here is silent.

### The AI

`ai.js` builds prompts cache-friendly: static instructions first, append-only history in the middle,
volatile state + the concrete task last. The model replies with a normal answer plus an optional
`<<<ДІЇ>>>` block of JSON actions which `applyActions()` validates and writes to the store, so the
AI can both *answer* and *modify* the schedule/diary.

### Профіль (акаунт)

An account is identified by its **назва профілю** (the login key, `store.user`) and separately carries an
optional **ім'я** (`displayName`) that is only used for display (greeting in `week.js`, the profile sheet,
`calendar-edit.js`). `store.displayName()` falls back to the profile name. The avatar is a **data URL**
(a 192×192 centre-cropped JPEG produced by `shrinkImage()` in `app.js`) stored as `avatar` on the same
account record — so it travels with the account, not with the app data.

The floating avatar button (`renderShell()`) shows `store.avatar()` in an `<img>` when set, otherwise the
first letter of the display name. It is repainted by `paintAvatar()` from the `store.subscribe` callback,
so name/photo changes appear immediately.

The same photo is used for the **user's own rows in the ШІ chat** (`chat.js`): each message row starts with
a 32px `.chat-avatar` tile — the user's photo (`.chat-avatar.has-photo` + `<img>`) when one is set,
otherwise the `user` icon, exactly as before. The assistant's rows keep the `sparkles` tile.
`renderChat()` returns an `update()` that repaints those tiles (`paintUserAvatars()`), so changing the
photo in the profile sheet updates the open chat without a reload.

On narrow layouts the floating profile button sits in the same top-right corner as the page-head's
right-hand controls, so `@media (max-width: 1069px) { .page-head .row-between { padding-right: 56px } }`
reserves its 48px + 14px band (the ШІ head's «Очистити чат» button otherwise sat under it).

`openProfileSheet()` (in `app.js`) is the profile UI:

* big avatar — **double tap** (>2 taps within 460 ms, tracked by hand because `dblclick` is unreliable on
  touch) or a tap on the pencil opens the file picker; `«Прибрати фото»` clears it;
* three `editableRow()`s — **Ім'я** (`saveProfile`), **Назва профілю** (`renameProfile`), **Пароль**
  (masked `••••••••`, `changePassword` with current + new + repeat). Each row also opens on a single tap on
  its pencil; otherwise two taps within 460 ms unlock it. Rows read their value through a getter, so they
  stay correct after a rename;
* the theme swatches / light-dark switch / streak card moved down below the account rows.

`store.renameProfile()` must keep the account record **and** the data under the new kv key (and delete the
old ones) and update `localStorage` — the login key and the app-data key are the same string.

The register form (`screens/auth.js`) asks for «Назва профілю» (login key) + optional «Ім'я» + password;
the login form asks for «Назва профілю» + password. Text is deliberately **not school-specific** — the
planner is equally for work, meetings and tasks (see SPEC §1).

### Завдання (Tasks) — «сьогодні / завтра / післязавтра»

`screens/tasks.js` renders **three** date buckets — `На сьогодні`, `На завтра`, `На післязавтра`
(`todayStr()` / `+1` / `+2`) — each via `store.tasksFor(date)`. Only tasks whose `due` is **today or
later** ever appear: past-due tasks are deliberately not rendered in any bucket (the user explicitly asked
that «на вчора» tasks never show), and because `due` is a single date a task can appear in exactly one
bucket, so nothing is duplicated. The **«Виконані»** section (`doneSection()`) lists **every** `t.done`
task (newest `due` first, tie-broken by `doneAt`), each card carrying a `Виконано · …` line
(`doneWhenLabel()`: relative word for today/yesterday, else `fmtDateShort`), and its header row has a
separate trash `.ds-clear` button (`clearDone()` → `confirmDialog` → `store.clearDoneTasks()`) that
deletes them all in one go — since the admin lives in that header, the section must not be date-windowed,
otherwise completed tasks whose `due` has passed would be invisible *and* unremovable. `showDone` still
hides the whole section.

The Редагування screens are **decluttered**: they only carry the «Додати …» tiles + settings. The old
«Мої завдання» list (diary-edit) and «Мої події» list (calendar-edit) were removed on the user's request
(`tasksSection()` / `eventsSection()` are gone). Management now happens in place:
* tasks — checkbox / edit / delete on each card in `tasks.js`;
* events — tap a chip in the week list or an `.eb` card in the day timeline → `openItemSheet()`, which
  offers «Редагувати» / «Видалити»; trips keep their own «Мої подорожі» list in calendar-edit.
* The escape hatch for old overdue tasks is the diary setting «Переносити прострочені на сьогодні»
  (toggling it on runs `rollOver()`, which moves `due < today` tasks to today).

---

## Conventions / gotchas

* Read config and globals through `root.*` in module code (`root.weekLookahead`), never a bare name.
* `kv` may not exist until `store.init()` — everything goes through `store`, which reads
  `window.root.kv` lazily.
* Never inject unescaped user/AI text into `innerHTML`; use `escapeHtml()` from `util.js`.
* Keep chat text plain (`textContent`) streams; markup only after escaping.
* **Form controls need the `html body .x` prefix to set `color`.** The platform loads
  `normalize.css` *before* us, and its `button:not([disabled]), input:not([disabled]), … { color: inherit }`
  (specificity 0,1,1) silently beat our plain `.btn-primary { color: #fff }` — filled buttons rendered with
  inherited dark text and the send/check icons went dark too. Every rule in `styles.css` that sets `color`
  on a button/input (`.btn-*`, `.chat-send`, `.check-btn`, `.chip`, `.tab-btn`, `.icon-btn`, `.seg-btn`,
  `.eb-start`, `.trip-chip`, `.trip-note`, `.next-lesson-chip`, `.floating-avatar`, `.onboard-skip`,
  `.input`) therefore carries an `html body` prefix (0,1,2). Don't "tidy" those prefixes away; if a new
  element gets the wrong text colour, `getComputedStyle` vs. the declared rule is the quick check.
* Desktop layout keys off a **≥1180px** media query (2-column week card, 2×2 day grid, 2-col tiles).
  Test both `390x844` and `1440x900` before calling layout work done.
* When snapshotting for review, capture `.app-root` (desktop) or `#viewRoot` (mobile). The tab bar is
  `position: absolute` over `.app-main` (which keeps `padding-bottom: 96px` for it), so a `#viewRoot`
  snapshot always shows ~96 px of empty space at the bottom — that is the tab bar's slot, not a layout bug.
* Don't name a `$meta.image` if the screenshotter is fine; there is currently no canvas in this app.

## How to verify a change

1. `page_refresh` (applies files + reloads, reports `perchanceErrors` / `syntaxErrors`).
2. `page_eval` to drive the UI (`document.querySelector('.tab-btn')…click()`) and inspect the DOM.
3. For anything visual, snapshot the specific element and `vision` it against a described checklist —
   full-page snapshots are unreliable here (the app is a `100dvh` scroll container).
4. Clean test data out of kv/localStorage before finishing (see TODO.md).
