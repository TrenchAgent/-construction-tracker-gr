# Διαχείριση Έργου — Construction Site Manager (GR)

A mobile-first, Greek-language expense tracker for construction projects.
Track income (Είσπραξη) and expenses (Έξοδο) per project, split expenses
into three categories (Υλικά / Εργατικά / Λοιπά), optionally add 24% VAT,
and see profit/loss at a glance. Built as an installable web app (PWA) —
no app store needed. Live at unique-douhua-1e8149.netlify.app.

This README assumes you've never used git/npm before. Read it top to
bottom the first time; after that you'll only need the "Everyday commands"
section.

## Data lives in Supabase now, behind a login

Data used to live only in the browser (`localStorage`) — fine for trying
the app on one device, but it didn't sync and could vanish if you cleared
your browser. It now lives in a real [Supabase](https://supabase.com)
Postgres database, behind a simple email sign-in, so the same data shows
up on your phone and your laptop.

Because that's a shared database reachable from any browser, it needs to
know who's asking — that's what the sign-in screen is for. There's still
no password to remember: type your email, then open the email and tap the
sign-in link it contains — that brings you back here, signed in. See
**Setting up Supabase** below to create your own free project — this app
does not come with one already configured.

One known edge case worth knowing about: if the app is installed to an
iPhone/iPad home screen, tapping that email link can sometimes open Safari
instead of the installed app, leaving the installed app itself still
signed out. If that happens, sign in once directly in Safari at the live
URL — Android and desktop aren't affected.

Sign-in emails are sent via [Resend](https://resend.com) (custom SMTP
connected to Supabase — see **Authentication → Emails** in the Supabase
dashboard for that config), not Supabase's own default sender: the
built-in one is capped at a very low rate limit meant only for quick
testing, which is worth knowing if sign-in suddenly starts failing with
"email rate limit exceeded" — that means something's reverted to it.
Since the sending address (`onboarding@resend.dev`) isn't a verified
domain, first-time emails can land in spam — mark them "not spam" once
and it settles down.

All the database code lives in one file, `src/lib/storage.js` — components
never talk to Supabase directly.

## What's in v1 (and what's deliberately left out)

**Included:** an all-projects overview as the home screen (every project
as a card — profit/loss and outstanding amount at a glance — see below),
projects (name + optional location, editable, deletable — deleting a
project deletes its entries too), quick-add entries (income or expense,
amount, optional VAT 24%, optional vendor, required note, date, payment
status, optional payment method), editable and deletable individual
entries, a dashboard with income/expense/profit totals, an
outstanding-amounts card, a Today/This week/This month breakdown, a
reverse-chronological entry list, CSV export per project, and inviting a
collaborator (viewer or editor) to a specific project by email. Sign-in
is by emailed link, no password.

One real limitation in entry editing, not hidden: the database only
stores the final amount (VAT already applied, if it was on) — not the
pre-VAT number you originally typed. So editing an entry lets you correct
the final amount, but doesn't let you flip its VAT flag or recompute from
a new pre-VAT number; to change whether VAT applies, delete the entry and
add it again.

**Deliberately cut** (don't add back without checking this is still
wanted): tax ID (ΑΦΜ) capture, a transportation cost field, rate
analysis, business overheads, work-area tagging, labour attendance, and
finer-grained material categories.

## All-projects overview

Signing in lands on an overview screen — one card per project (name,
location, profit/loss, outstanding amount), before picking any single
one — for someone running several projects at once who wants to see
what needs attention without opening each one in turn. Tap a card to go
into that project's dashboard; tap the crane icon in the header (now a
button, not just a logo) to come back. Card totals refresh every time you
return to the overview, so they don't go stale mid-session.

The per-project totals come from a small database view
(`project_summaries` in `supabase/schema.sql`) rather than fetching every
entry of every project just to add them up — it inherits the same
RLS-based access control entries already have (`security_invoker`, see
the comment above it in schema.sql), so it needs no policy of its own and
can't leak totals from a project you're not on.

## Archiving a project

A finished project shouldn't have to be deleted just to get it out of the
way, and shouldn't clutter the overview forever either — "Αρχειοθέτηση
έργου" in a project's settings (owner only) moves it out of the active
list and the all-projects overview, into a separate "Αρχειοθετημένα
έργα" section linked from the bottom of the overview (only shown when
there's at least one). Nothing about the project changes except where it
shows up: entries, totals, collaborator access, editing — all exactly as
they were. Restoring it (from the archived list, or from that same
project's own settings once you're viewing it) is the same one-field
update in reverse, and needs no confirmation dialog either way — unlike
delete, this doesn't touch any data, so there's nothing an undo window
would need to protect.

Schema-wise this is one nullable `archived_at` column on `projects` (null
= active). Deliberately not a second RLS policy or a new table: every
existing policy on projects/entries/collaborators is keyed on ownership
or collaborator role, never on archive state, so an archived project
stays exactly as visible — and exactly as editable — to its owner and
collaborators as it always was. That's not just reasoned about: verified
by loading the real, unmodified `schema.sql` into a disposable local
Postgres database (no production credentials in this session) with a
stand-in for Supabase's `auth.uid()`/`auth.email()`, and running the
actual policies as the `authenticated` role — an owner archiving a
project, an editor-collaborator still reading and writing its entries
after that, a viewer-collaborator still seeing it but correctly denied
edit, an unrelated third user still seeing nothing at all, and the
project's data surviving an archive→restore round trip intact.

## First-run experience

Zero projects means one of two different things, and they get different
copy. A true first-time visitor sees a brief explanation of what the app
actually does (track income/expenses per construction project, what's
still outstanding, works with no signal on-site) above the "Νέο έργο"
button — not a multi-screen tour, just a few sentences once. A returning
user who happens to have zero projects right now (deleted their only
one — having every project archived is a different, separate message,
see Archiving above) just gets a short "you don't have a project right
now" prompt instead, since they already know what the app is.

Telling those apart needs a signal that survives past the moment
projects hits zero, since by then both cases look identical. That's a
one-way, per-user flag in localStorage (`lib/onboarding.js`, same
pattern as the offline outbox) — set the first time we ever see this
user with at least one project, on initial load or right after they
create their first one. It's per-browser, not tied to the account
server-side, which is a real limitation (a different device won't know)
— an accepted trade for staying this lightweight; getting it wrong
either way only costs a few lines of text, never a functional problem.

## Outdoor readability

Amounts and category/status badges use darker text than Tailwind's
usual defaults on purpose (900-level instead of 700/800 in most places)
— these are the numbers someone reads on a phone screen outdoors, often
in direct sunlight, where ordinary on-screen contrast washes out badly.
Verified with the actual WCAG contrast formula against the exact
background each one sits on, not eyeballed — every pair here clears 7:1
(WCAG AAA), well past the usual 4.5:1 minimum. Amount text is also bold
instead of semi-bold, and a size step up where there was room for it.

Tap targets on the icon buttons used constantly during real work (the
crane icon → overview, project settings, account, the entry list's
Αντιγραφή/Διαγραφή, every modal's close button) are bigger than the icon
itself, not just the icon's own bounding box — sized for a thumb, not a
mouse pointer, and workable with a glove on. A few (the header's
settings/account icons specifically) land in the high-30s of pixels
rather than the ideal 44 — the header has to fit a project name plus
several icons on one line, and further padding there would come at the
truncated name's expense; still a real improvement over what was there
before, just not maxed out everywhere for its own sake.

## Faster repeat entry

Opening **+ Νέα καταχώρηση** for a brand new entry pre-fills the category
and vendor from the most recently added expense in that project, instead
of always resetting to Υλικά / blank — logging a run of similar entries
(same supplier, several days running) doesn't mean re-picking and
re-typing the same two fields every time. Everything else still starts
empty, and both fields stay fully editable — it's a starting point, not
a lock.

Each entry also has an **Αντιγραφή** (duplicate) action: opens a new
entry pre-filled with that entry's values, except the date (today, not
the original's). If the original had VAT applied, the amount shown is
the same pre-VAT figure it was originally created from (reverse-computed
from the stored final amount), not the final total — saving re-applies
VAT through the normal create-time math instead of compounding it on an
already-final number.

## Deleting things: confirm, then a real undo window

Deleting an entry or a project always asks for confirmation first
(`window.confirm`, naming what you're about to delete). After confirming,
it disappears immediately and a toast at the bottom offers **Αναίρεση**
(Undo) for 5 seconds.

This is a genuine undo, not a visual trick: the actual delete request to
the database isn't sent until that window expires. "Undo" just means
"never mind, don't send it" — there's nothing to restore because nothing
was ever deleted, which is also why it's safe against things like
switching away and back to the project mid-window (nothing re-fetches a
row that's still there). Deleting a second thing while one delete is
still pending finalizes the first one for real right away, rather than
stacking multiple undo windows.

The one extra wrinkle: deleting an entry that's still offline-queued
(added with no connection, not yet synced — see below) starts the same
undo window, but the sync engine is taught to leave that specific item
alone while it's pending — otherwise a connection returning mid-undo
could sync the entry instant before the delete finalizes, deleting a
now-different (real id) row than the one "Undo" thinks it's holding.

## Consistent action feedback

Every save/create/archive action — new entry, edited entry, renaming a
project, archiving or restoring one, creating a new project — now
confirms itself the same way: a brief toast at the bottom (2.5 seconds,
auto-dismissing), not just a modal quietly closing behind it. It shares
its exact visual shell with the delete-undo toast above (same position,
same dark card, same shrinking progress bar) on purpose — one consistent
"something just happened" language across the app, whether or not
there's an action to take on it. Only one shows at a time: a delete's
undo window always wins the spot over a plain confirmation if both would
apply at once, and neither renders while a modal is open — in both
cases the confirmation is deferred, not lost, and appears the moment
the modal closes or the undo window clears.

Not every action got this treatment — two, on purpose, don't: attaching
or removing a receipt photo, and inviting or removing a collaborator.
Both happen while their modal stays open, with their own immediate,
in-context feedback already (the receipt thumbnail itself appearing;
the collaborator row appearing in the list right there). Tried adding a
toast to both anyway, for uniformity, and caught two real problems by
actually attempting it rather than assuming it'd be fine: a toast
landing on top of a still-open modal visually sits against its own
content and can cover whatever's below it (here, the collaborators
list's own Delete-project button as the list grows) — confirmed by
tapping where a button should be and checking what element the tap
actually landed on, not by eyeballing a screenshot. Left those two
actions with their existing feedback rather than force a pattern that
doesn't fit.

That same investigation surfaced a real, pre-existing bug, unrelated to
whether an action gets a toast at all: while any toast is showing, it
sits at z-40 — above absolutely everything, undo toast included, on
purpose — including the "add entry" button in that same bottom corner,
which is solid, not translucent, so it wasn't just covered, taps there
were landing on the toast's own Undo button instead. Fixed two ways:
the add-entry button shifts up out of the way while a toast with no
modal open is showing, and neither toast renders at all while any modal
is open (its underlying timer, for an undo window, keeps running
regardless — nothing about the delete itself changes).

## Filtering the entry list

A project's entry list has a search box (matches note or vendor) plus a
filter panel (tap the icon next to search) for category, payment status,
and a date range — all client-side over whatever's already loaded for
that project, no extra database query. Filters reset when you switch
projects. The dashboard totals above the list (income/expense/profit,
outstanding, time breakdown) always reflect the whole project, not just
what's currently filtered into view — filtering narrows the list you're
looking at, it doesn't recompute what the project actually adds up to.

## Payment tracking and time breakdown

Every entry has a payment status — **Εκκρεμεί** (pending), **Μερική
εξόφληση** (partial), or **Εξοφλήθηκε** (paid) — shown as a colored badge,
and defaults to "pending" on a new entry (unlike VAT, this is meant to
change later — e.g. mark it paid once it's settled — so editing an entry
always lets you update it). An optional payment method (Μετρητά /
Κατάθεση / Κάρτα / Επιταγή) can be tagged too. The dashboard shows an
**Εκκρεμή ποσά** card totaling everything not yet fully paid (pending +
partial, across both income and expenses), and a Σήμερα / Αυτή την
εβδομάδα / Αυτόν τον μήνα breakdown of income and expenses (Monday-start
week, matching the usual Greek convention).

## Monthly trend chart

A per-project bar chart, income vs. expense by calendar month, sitting
between the time breakdown and the entry list. Shows the last 6 months,
or fewer if the project itself is younger than that — a 2-month-old
project gets 2 bars, not 6 with 4 empty ones — but never fewer months
than actually exist since the project's own creation date. It's always
a fixed calendar window, not "months that happen to have entries," so a
gap in the middle (a month with no activity) shows as a real gap, on
purpose — that's glance-value information too, not noise to filter out.

Deliberately just the two totals per month, nothing computed on top —
no averages, no month-over-month change, no projected rate. That
matches an earlier, explicit scope decision to leave that kind of
analysis out of this app entirely (see "What's in v1" below); this
chart doesn't quietly reintroduce it through the back door. No new
charting library either — hand-rolled with plain divs sized by
percentage of the tallest bar in view, keeping the bundle-size
discipline from earlier work in this project.

## Working with no signal (offline entries)

Construction sites often have bad or no signal. Adding a new expense or
income entry works even with no connection: it appears in the list
immediately, tagged **θα συγχρονιστεί όταν επανέλθει το δίκτυο** ("will
sync when the connection returns"), and a small banner at the top shows
how many entries are waiting. The moment the device gets a connection
back, those entries are sent to the database automatically — no "retry"
button anywhere, nothing to remember to do.

This is deliberately narrow in scope — **only adding a new entry** works
offline. Editing or deleting an entry, creating/renaming/deleting a
project, and managing collaborators all still need a live connection,
because those act on a row that (from the device's point of view) may or
may not still exist or look the way it did last time it had a connection;
reconciling that safely is a meaningfully harder problem than "here's one
new line item to add" and wasn't attempted. A queued entry itself *can*
still be deleted before it syncs (e.g. you made a mistake) — that just
drops it from the local queue, nothing to undo server-side.

Mechanically: queued entries live in the browser's local storage (see
`src/lib/outbox.js`), scoped to your account, so they survive a page
reload or the tab being closed while still offline. The app retries the
queue when the browser reports the connection came back, and once more
immediately on load in case there was already a leftover queue from a
previous offline session. If a queued entry is ever rejected by the
server for a real reason (not just "no connection") — e.g. access to that
project was revoked while the device was offline — it's flagged
**απέτυχε η αποστολή** ("failed to send") instead of retried forever, so it
stays visibly unsaved rather than quietly vanishing.

## Receipt photos

Each entry can have one optional photo — a shortcut to attaching a photo
of the actual paper receipt/invoice. Available once an entry has already
been saved (open it to edit, then attach) — a brand new entry doesn't
have a real id yet to attach a photo to, and neither does one still
queued offline (see **Working with no signal** above), so the photo
control only shows up once there's a real, synced entry to attach it to.
A small thumbnail shows on the entry row itself; tap it to see the full
size photo.

Files live in Supabase Storage, in a private `receipts` bucket — not a
database table, and not public. Access is enforced by Storage's own Row
Level Security, using the exact same owner/editor/viewer rules as
entries themselves (see `supabase/schema.sql`): any project member can
view a receipt, only the owner or an editor can upload or remove one.
Capped at 8 MB and image files only (`allowed_mime_types` on the
bucket), so it can't become a dumping ground for arbitrary large files.

Deleting an entry or a project also deletes its receipt file(s) from
Storage — those aren't reachable by the "on delete cascade" that cleans
up database rows, since a Storage object isn't a foreign-keyed row, so
this is done explicitly in `src/lib/storage.js` (best-effort: a failed
cleanup doesn't block the actual delete, since a stray orphaned file is
a nit, not a correctness problem for the user).

## Sharing a project (collaborators)

A project owner can share a project with someone else's email, at either
**Προβολή** (view-only) or **Επεξεργασία** (can add/edit/delete entries,
including entries someone else added — same model as an editor on a
shared document, not "only their own additions"). Neither role can
rename/delete the project or manage who else has access — that stays
owner-only.

No separate invite flow: the collaborator just needs to sign in with that
exact email (case-insensitive) at some point — the existing magic-link
sign-in *is* the acceptance step, automatically, the next time they load
the app. This is enforced by the database (Row Level Security), not the
app's JavaScript, and was adversarially tested with three real accounts
before being considered done: a collaborator genuinely cannot see or
touch any other project, an editor cannot rename the project or add
other collaborators, a viewer cannot write anything, and removing a
collaborator revokes their access on their very next request — not just
in their UI, and not only after they next log in.

## Billing (Stripe — TEST MODE ONLY right now)

Paying accounts get a single flat monthly subscription with a 14-day free
trial, via Stripe Checkout. There are no tiers.

**This is wired to Stripe in test mode only.** No real card can be charged
right now — that's enforced in code, not just by convention. See
`netlify/functions/lib/stripeClient.js`: it refuses to even start if
`STRIPE_SECRET_KEY` isn't a `sk_test_...` key. When you're ready to accept
real payments (after business registration is finished), the whole switch
is: delete that guard block, and put a real `sk_live_...` key in Netlify's
`STRIPE_SECRET_KEY` env var. Nothing else about the code changes.

How it works:
- **Λογαριασμός** (the 👤 icon in the header) shows your subscription
  status: no subscription yet → a pricing card with an upgrade button;
  trialing/active → days left or renewal date; past due/unpaid → a warning.
- Clicking upgrade calls a Netlify Function (`create-checkout-session.js`)
  that creates a Stripe Checkout session for your account and redirects you
  to Stripe's hosted payment page.
- After payment (or during the trial, since Stripe still collects a card
  up front), Stripe calls a webhook (`stripe-webhook.js`) which verifies
  the request really came from Stripe (signature check, not just trusting
  whoever calls the URL) and writes the subscription status into a
  `subscriptions` table — one row per account, readable only by that
  account (Row Level Security again, same pattern as everything else).

Env vars this feature needs, all in Netlify (**Site configuration →
Environment variables**), none of them safe to put in frontend code:
- `STRIPE_SECRET_KEY` — must start with `sk_test_` right now.
- `STRIPE_PRICE_ID` — the Stripe Price object for the monthly subscription.
- `STRIPE_WEBHOOK_SECRET` — from the webhook endpoint's settings in the
  Stripe dashboard, used to verify incoming webhook calls are genuinely
  from Stripe.
- `SUPABASE_SERVICE_ROLE_KEY` — the *secret* key from Supabase's API
  settings (not the publishable one used elsewhere in this app). Needed
  because these two functions run on the server and must look up/write
  subscription rows for the signed-in user directly, bypassing RLS the
  same way Supabase's own dashboard does. Never put this in a frontend
  env var (i.e. nothing prefixed `VITE_`).

One outstanding cleanup item: when these four secret-ish values were
first added in the Netlify dashboard, checking "contains secret values"
on `STRIPE_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY` split them across
multiple deploy contexts instead of "same value in all contexts". It's
currently working because the values happen to be correct in whichever
context Netlify uses for a production deploy, but it's fragile — worth
going back into each variable's settings and re-saving it as one value
for all contexts, so a future deploy from a different context (e.g. a
branch deploy or PR preview) doesn't silently read a blank value.

**Verification note:** the Checkout-session creation, the webhook's
signature verification, and the full webhook processing logic (including
writing correct data to the database) were all tested end-to-end using
Stripe's own test-mode API tooling — a real test customer, subscription,
and a genuinely Stripe-signed webhook event, not fakes. The one thing not
automated was clicking through Stripe's own hosted Checkout page with a
test card, because headless-browser automation against
`checkout.stripe.com` was consistently blocked, almost certainly by
Stripe's own fraud detection — not something worth trying to defeat, even
in test mode. Do that one manual click-through yourself at some point
(`4242 4242 4242 4242`, any future expiry, any CVC) as the final sanity
check of Stripe's side of the flow.

## Public landing page

`public/landing.html` is a plain static page (no React, no build step of
its own — Vite just copies it as-is) explaining what the app is, aimed at
someone who's never seen it before, with a sign-up call to action. Live at
**unique-douhua-1e8149.netlify.app/landing** (the `/landing` →
`/landing.html` redirect is in `netlify.toml`).

Deliberately kept separate from `/`, which still is (and stays) the app
itself, unchanged — sign in, dashboard, everything. This was a deliberate
choice, not an oversight: making the landing page the new root would also
mean moving the app to some other path, which touches the PWA's
`start_url` (what opens when someone taps the already-installed home
screen icon), the Stripe Checkout success/cancel URLs, and anyone's
existing bookmark to the bare domain — a bigger, riskier change than "a
page exists that explains the product," and not something to do as a side
effect. If you'd rather the marketing page be the front door at `/` with
the app moved to e.g. `/app`, that's a reasonable next step, just a
deliberate one — ask for it explicitly.

## Typography

Headings and every monetary amount use **Fira Sans Condensed** (700/800
weight) — condensed and heavy on purpose, so a number reads as the
headline it is, not body text that happens to be a number. Everything
else (labels, buttons, form fields, entry notes) uses **Inter**
(400/500/600). Both are self-hosted via `@fontsource`, not a Google
Fonts CDN `<link>` — this is a PWA that has to keep working with no
signal on a jobsite, so fonts are bundled and precached exactly like
the app's own JS/CSS (see `vite.config.js`'s `workbox.globPatterns`,
which now includes `woff2`), not fetched from an external host at
request time.

Both were chosen only after actually checking their font files for
real Greek glyph coverage — most condensed/display Google Fonts don't
have one at all. Checked roughly 15 candidates (Oswald, Barlow
Condensed, Archivo Narrow, Saira Condensed, Roboto Condensed, and
others) by inspecting each package's shipped `@font-face` subsets
directly, not by assuming a popular font "probably" supports Greek:
most had none. Fira Sans Condensed and Inter both genuinely do (real
`greek`/`greek-ext` subset files, confirmed at the byte level, not just
listed in metadata). Only those two subsets plus `latin`/`latin-ext`
are imported — not fontsource's combined "every script" CSS file, which
would have doubled the offline precache with cyrillic/vietnamese font
files this Greek/English app will never render (caught by checking the
actual built precache size before and after, not assumed fine).

Verified with the actual browser, not just eyeballing a screenshot:
`document.fonts.check()` confirms the real fonts (not a silent
system-font fallback) are loaded and match Greek text at the exact
weights used, and a close-up render of every accented Greek vowel (ά έ
ή ί ό ύ ώ) plus final sigma (ς), uppercase included, in both faces at
their real in-app sizes, confirms they render correctly and look
good — not just technically present. This is a purely visual change:
no color value anywhere was touched, only font-family/weight/size — so
the outdoor-readability contrast ratios from that earlier pass are
provably unaffected, not just assumed fine.

## Color system

The primary accent is a real, developed rust/terracotta scale
(`--color-rust-50` through `--color-rust-950` in `src/index.css`),
replacing Tailwind's stock orange everywhere it was used (`bg-orange-700`
etc. — literally the built-in palette, not a brand color). Still in the
same rust/brick family a construction app should be, but deliberately
less saturated than Tailwind's orange-600 (which reads as "traffic
cone"); this reads closer to oxidized iron or fired clay. The PWA's own
`theme_color` (manifest + `<meta>` tag — the color a phone tints its
status bar/app-switcher card with) was updated to match.

Income and expense now get their own tinted surface — a soft colored
background plus a matching border — on the dashboard's stat cards and
the overview's per-project chips, not just colored text on a plain
white card. Κέρδος/Ζημία (profit/loss) goes a step further: a visibly
"hero" treatment — thicker colored border, a bigger figure, its own
icon — so it reads as the headline stat of the dashboard, not just a
third card in the row underneath the first two.

This explicitly could have regressed the outdoor-readability pass's
contrast numbers (new backgrounds sitting behind mostly-unchanged text
colors), so every foreground/background pair actually touched here was
re-measured with the exact WCAG formula against the real rendered
pixels (not eyeballed, not assumed from the color names) — including a
few new caption labels this pass introduced, held to the same 7:1
(AAA) bar the amounts already cleared, not just the 4.5:1 minimum.
Every one of them clears 7:1. Two labels (`amber-700`, one case of
`amber-800`) needed bumping a step darker to actually clear it —
caught by the measurement, not before it.

## Selectable options (kind, category, payment status, method, role)

Every pill/toggle in the app — Έξοδο/Είσπραξη, the category picker,
payment status, payment method, the collaborator role picker — used to
be a plain bordered rectangle with a border-color change on selection.
They're all built on one shared component now (`OptionPill.jsx`): icon
above label, comfortable padding, and a real filled background on
selection instead of just a border swap. Unselected stays a plain
neutral fill on purpose — the point is for the selected option to
visibly pop against uniform siblings, not for every option to carry
its own color all the time, which would compete with "scannable at a
glance" rather than support it.

Category and payment-status icons/colors aren't a new, separate color
system: they reuse the exact hues `CATEGORY_BADGE_STYLES` and
`PAYMENT_STATUS_BADGE_STYLES` already used for badges elsewhere (see
`constants.js`) — picking "Υλικά" here and seeing its amber badge on
the entry right after is the same color on purpose, not a coincidence.
Payment method and the collaborator role have no such pre-existing
color of their own, so their selected state uses the app's primary
rust accent instead of inventing a fourth unrelated hue. One
deliberate icon choice: labor's category icon is a Hammer, not the
obvious HardHat — that's already the app's own logo everywhere else,
and reusing it here would read as "this is the app," not "this entry
is labor."

Every selected fill was checked against the same 7:1 (AAA) bar as
everything else read outdoors — a first pass had two categories'
colors (a rose and an amber) land at 5–6:1, comfortably WCAG AA but
short of this app's own bar, caught by measuring each option's
contrast the instant it becomes selected (not, as a first version of
the check did, after clicking through several options and only
checking at the end — that measures whichever one you last clicked
away from, not the one you meant to). Darkened one step each
(`-700` → `-800`) and re-measured clean.

## Icon audit

Every icon in the app was checked against two things: does it actually
mean something specific (not generic filler), and is it consistent
with every other icon doing the same conceptual job elsewhere. Two
real findings, both fixed:

- Income/expense had **three different icon languages** for the same
  up/down concept scattered across the app — plain `ArrowUp`/`ArrowDown`
  on the dashboard's stat-card captions, `ArrowUpCircle`/`ArrowDownCircle`
  on the kind toggle (Part 3), `TrendingUp`/`TrendingDown` on the
  profit/loss hero card. The hero card's Trending pair stays — it's a
  genuinely different concept (the *direction* of profit, not "is this
  row income or expense") — but the stat-card captions switched to the
  same Circle pair the kind toggle uses, since they're the exact same
  concept and were the odd one out.
- Category, payment-status, income, VAT, and payment-method badges on
  every entry had **no icons at all** — plain colored text, while the
  two sync-state badges right next to them (offline-queued, sync
  failed) already did. All five now carry one, reusing the exact icon
  set the pickers already established in Part 3 (so picking "Υλικά" in
  Quick Add and seeing its badge afterward is the same icon, not just
  the same color) — plus a new `Percent` icon for the VAT flag.
  Every badge icon uses the same 11px size, matching the two that
  already existed there, so the new ones don't read as a slightly
  different icon set sitting right next to the old ones. Since only
  icons were added — no background or text color changed — this
  couldn't have regressed the outdoor-readability contrast numbers,
  but re-measured every affected badge anyway rather than assuming;
  all still clear 7:1 (AAA), most comfortably above it.

One thing deliberately left alone: the app's own HardHat logo uses a
heavier stroke at its small size (header, ~20px) than at its large,
decorative size (empty state, login screen, 40px) — checked whether
that was a real inconsistency or a deliberate size correction, and it
turned out to be applied with zero exceptions across every use at each
size. Left it as-is rather than "fixing" something that already works
the way it should.

Also picked up along the way, one level up from icons specifically:
the subscription-status cards in the account modal (trial/active/
payment problem) had zero icons on what's the most content-heavy
screen in the app after the dashboard — added one per state (`Gift`,
`CheckCircle2`, `TriangleAlert`), reusing icons already established
elsewhere for the same meaning rather than introducing new ones.

## Moments of personality

Every "there's nothing here" screen used to be its own one-off — some a
bare centered icon, some just a plain sentence, none sharing a visual
language with the others. They're all built on one shared component now
(`EmptyMoment.jsx`): the icon sits inside a soft circular badge, followed
by a bold title and a shorter explanatory line, with an optional action
button underneath. Six spots use it: the true first-run and
returning-but-empty states (`EmptyState.jsx`), an empty entry list split
into two genuinely different messages (`EntryList.jsx` — see below), no
archived projects yet and everything-is-archived (`ArchivedProjects.jsx`,
`ProjectsOverview.jsx`).

The entry list's empty state deliberately isn't one message: "you have no
entries yet" (an invitation — tap "+" to add the first one) and "no entry
matches your filters" (a search came up empty) are different situations,
so they get different icons (`Receipt` vs. `SearchX`) and different copy,
not one generic "nothing here" line stretched to cover both. One spot
was deliberately *not* switched to `EmptyMoment` — the "no collaborators
invited yet" line inside the project settings form. It's a small,
secondary line in an already-busy form, not a whole screen's worth of
"there's nothing here," so it kept a light one-line treatment (a small
icon plus text) instead of a full icon-badge moment that would compete
with the form around it for attention.

Two real bugs came out of verifying this, not just eyeballing it:

- The badge's default text colors, measured against the WCAG formula
  the same way every other color in this app has been, came out at
  6.37:1 and **3.81:1** — the second one below even the 4.5:1 WCAG AA
  minimum, not just short of this app's own stricter 7:1 bar. A real
  accessibility bug, caught before shipping rather than after. Darkened
  both a step; re-measured at 8.28:1 and 8.19:1.
- At the new bolder title size, a long "no filter matches" message could
  render as a single line landing directly under the fixed "add entry"
  button (bottom-right, always on top) — confirmed by bounding-box
  overlap, not just a glance at a screenshot: the button was genuinely
  covering part of the text. A first attempt at a width limit didn't
  fix it; fixed properly by measuring the actual widest realistic phrase
  in the app at the real font/weight/size and setting a width that
  forces a guaranteed two-line wrap, then re-verified there's no overlap.

## Security audit

A full pass against a checklist covering rate limiting, access control,
password/API-key handling, dependencies, form input, XSS, debug mode,
env vars, exposed files, admin/API endpoint protection, CORS, security
headers, and database access. Checked each one against this app's actual
code rather than assuming a generic answer — several items below don't
apply the way they would to a typical app, because of choices already
made earlier (Supabase Auth, Row Level Security, no server of this app's
own beyond two small functions). Two real, fixed issues came out of it;
everything else was either already correct (with the reason why) or is
an action only doable from a dashboard this app's code can't reach.

**Fixed:**

- **CSV export (formula injection).** `entriesToCsv` (`src/lib/csv.js`)
  escaped the delimiter, quotes, and newlines, but not a field that
  *starts with* `=`, `+`, `-`, or `@` — which Excel/LibreOffice/Google
  Sheets read as a live formula, not text. A vendor name or note typed
  as `=cmd|'/c calc'!A1` would come back out of the export as an
  executable formula the moment anyone opened it (CSV/formula injection,
  a known category of real-world attack — this is exactly how it works).
  Fixed by prefixing any such field with a plain apostrophe, the standard
  fix every one of those programs already understands as "this is text."
  Verified with the actual payloads above plus normal Greek text through
  the real function, not just read — all come out correct.
- **Security headers, including a real Content-Security-Policy.** None
  were set at all before this pass — added in `netlify.toml`, applied to
  everything Netlify serves: CSP, `X-Frame-Options: DENY` (clickjacking),
  `X-Content-Type-Options: nosniff`, `Referrer-Policy`, a `Permissions-Policy`
  that turns off geolocation/microphone this app never uses, and HSTS.
  The CSP is worked out from what this app actually calls — itself, plus
  Supabase (`*.supabase.co`, both its API and the signed URLs receipt
  photos load from) — not a copy-pasted generic policy; no `*` wildcard
  anywhere in it. **Verified against a real served build in headless
  Chromium** (same standard as the rest of this project): built the app,
  served `dist/` with these exact headers, loaded the real login screen,
  submitted the real sign-in form (which fires the app's actual Supabase
  request), and watched the console — zero CSP violations; fonts,
  Tailwind's compiled styles, and the PWA's service worker all still
  loaded and ran. One known trade-off, not hidden: `style-src` needed
  `'unsafe-inline'` because a few spots (e.g. `ReceiptThumbnail.jsx`
  sizing its thumbnail) use a plain inline `style=""` attribute — a
  strict CSP blocks that the same as an unrecognized `<script>`.
  Rewriting every one of those to a class was out of scope for this
  pass; `script-src` has no such exception and stays fully locked to
  `'self'` — the actually dangerous half of what CSP defends against.
- **Collaborator email matching (defense in depth).** The RLS policy
  that lets an invited collaborator see their own invite compares
  `lower(auth.email())` to the stored email — which only works if the
  stored value is already lowercase. The app's own insert path already
  lowercases it (`src/lib/storage.js`), so this wasn't failing in
  practice, but the database itself didn't require it — a future
  direct insert (bypassing the app's own UI) with a mixed-case email
  would have silently gone invisible to the very person it was meant to
  share access with. Added a `check (email = lower(email))` constraint
  in `supabase/schema.sql` so the database enforces its own assumption
  instead of trusting every future caller to remember it. **This one
  needs a manual step from you**: like every `schema.sql` change, it
  only takes effect once you re-run the file in the Supabase SQL Editor
  — see "Setting up Supabase" above, step 3 (safe to re-run any time).
- **Login screen: a resend cooldown.** Added a 30-second cooldown and an
  actual "Αποστολή ξανά" (resend) control — there wasn't one before, so
  a mistyped email had no way back except reloading the page. This is a
  courtesy on the client, not the real control: it's a plain timer,
  trivially bypassed from devtools. The real rate limit on how many
  sign-in emails an address can be sent lives in Supabase itself —
  dashboard → **Authentication → Rate Limits** — worth a look if you
  haven't checked it.
- **Dependencies updated**, within their existing version ranges (no
  major-version jumps bundled into a security pass — those need their
  own testing, not a drive-by): `@supabase/supabase-js`, `lucide-react`,
  `stripe`, `oxlint`, `tailwindcss`. `npm audit` found **0 known
  vulnerabilities both before and after** — this was a hygiene update,
  not a CVE fix. One deliberate exception: `react`/`react-dom` 19.3.0 is
  available and in-range, but measured (clean before/after production
  builds, not guessed) at **+9 kB gzipped** over 19.2.8 for a PWA that
  has cared about its precached bundle size through every one of the
  five redesign parts above — for zero feature this app uses. Pinned
  both at `19.2.8` rather than taking that for free. `vite` (7→8) and
  `@vitejs/plugin-react` (5→6) are both a major version behind and
  intentionally untouched here for the same "not in a security pass"
  reason.

**Checked, already correct — with why:**

- **Passwords.** There are none to hash — sign-in is Supabase's
  passwordless email link (see "Data lives in Supabase now" above).
  Nothing in this app ever sees, stores, or checks a password.
- **API keys / secrets.** The Supabase `anon` key is meant to be public
  (that's what Row Level Security is for) and is the only credential
  the browser ever receives. The Stripe secret key and Supabase
  `service_role` key live only in Netlify's server-side function
  environment (`netlify/functions/lib/`), never in a `VITE_`-prefixed
  variable (which Vite bundles straight into the client JS) — confirmed
  by reading exactly how each is referenced, not assumed from the
  variable name. Scanned every tracked file *and* this repo's entire
  git history for committed key patterns (`sk_live_`, `sk_test_`,
  `service_role` JWTs, etc.) — nothing found. One thing only you can
  verify, since it lives in Netlify's dashboard, not this repo: that
  `SUPABASE_SERVICE_ROLE_KEY` / `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`
  are set as plain env vars there, **not** prefixed with `VITE_`.
- **Authentication and per-user access control.** Every table has Row
  Level Security enabled, and — this is the part that actually matters
  — the policies were written and already tested to key off the
  database's own `auth.uid()`/`auth.email()`, not anything the client
  sends (see "Sharing a project" above for the collaborator-role
  design). A user's own JavaScript, browser devtools, or a hand-crafted
  request can't see or change data RLS doesn't already allow — that's
  the actual trust boundary, confirmed by re-reading every policy in
  `supabase/schema.sql` line by line during this pass, not re-explained
  from memory.
- **"Admin routes."** There isn't a separate admin panel or route to
  protect — the closest equivalent is project-owner-only actions
  (rename/delete a project, manage collaborators), and those are
  enforced the same way as everything else: by RLS at the database, not
  by which buttons the UI happens to show. Confirmed by reading the
  `"owner manages collaborators"` and owner-only policies directly, not
  inferred from the client-side `isOwner` checks (which exist too, but
  only for a good UI — not the actual security boundary).
- **API endpoints.** The two Netlify functions were re-read end to end:
  `create-checkout-session.js` requires a real, verified Supabase
  session token before doing anything; `stripe-webhook.js` verifies
  Stripe's cryptographic signature on every request and rejects
  anything that doesn't match — the correct control for "how do I know
  this request really came from Stripe," which rate limiting wouldn't
  add anything to. Neither reads anything attacker-controlled into a
  database query or shell call.
- **CORS.** Neither function sets any CORS headers, which means the
  secure default applies: only this app's own origin can call them from
  a browser. No wildcard `Access-Control-Allow-Origin` anywhere.
- **XSS.** Grepped the whole app for `dangerouslySetInnerHTML`,
  `innerHTML`, and `eval`/`new Function` — none exist. Every piece of
  user-entered text (notes, vendor names, project names) only ever
  reaches the screen through plain React JSX (`{value}`), which escapes
  it automatically; there's no path where user text becomes real HTML
  or executable script.
- **Debug mode.** No `console.log` of any request/response data anywhere
  in the app; the only logging at all is `console.error` in the two
  Netlify functions (server-side only, visible in Netlify's own function
  logs, never sent to a browser). No debug flag, no sourcemaps shipped
  in the production build.
- **Exposed files.** Checked `public/` (just the app icons and the
  static landing page — nothing sensitive), confirmed `.env*` has never
  once been committed in this repo's history, and confirmed no stray
  key/credential files sit anywhere in the working tree.
- **SQL injection / DB access.** Every database call goes through
  Supabase's own query builder (parameterized under the hood) — grepped
  the entire `lib/storage.js` for any place a query gets built by
  string-concatenating user input, and found none. The one place a
  storage *path* is built from user input (a receipt photo's file
  extension) is regex-validated to alphanumeric-only first, so it can't
  be used for path traversal either.
- **Unused packages.** Checked every production dependency against
  actual imports in the code — all seven are genuinely used, nothing to
  remove.

## Project structure

```
src/
  App.jsx                    top-level state (projects, entries) and layout
  constants.js                expense categories, VAT rate, collaborator
                               role labels
  lib/format.js                € currency formatting (el-GR locale)
  lib/csv.js                   builds the CSV export (Greek headers, BOM,
                                semicolon delimiter for Excel)
  lib/supabaseClient.js        creates the Supabase client from env vars
  lib/storage.js               ALL database access goes through here —
                                components never import supabaseClient
                                directly
  lib/outbox.js                 the offline queue for "add entry" writes
                                 made with no connection (see Offline
                                 support above)
  lib/entryFilters.js            pure filtering logic for the entry list
                                  (see EntryFilterBar.jsx above), kept
                                  separate so that component stays a
                                  component (Fast Refresh needs that)
  lib/onboarding.js               the "has this user ever had a project"
                                   flag behind the first-run message (see
                                   First-run experience above)
  lib/dates.js                    plain "YYYY-MM-DD" date parsing shared
                                   by TimeBreakdown.jsx and
                                   MonthlyTrendChart.jsx
  components/
    AuthGate.jsx                shows LoginScreen or the app, based on
                                 whether there's a signed-in session
    LoginScreen.jsx              email sign-in form (sends the link)
    Header.jsx                   top bar, project switcher, sign-out,
                                  "Συνεργασία" badge on shared projects
    EmptyState.jsx                "no project yet" screen (zero projects
                                   at all — different from the overview
                                   below, which needs at least one) —
                                   true-first-run vs. returning-but-empty
                                   copy, see First-run experience above
    ProjectsOverview.jsx           home screen — a card per project,
                                    tap one to open it; link to the
                                    archived section when any exist
    ArchivedProjects.jsx           archived projects list — tap to open
                                    one normally, or restore it
    DashboardSummary.jsx          income/expense/profit/outstanding cards
    TimeBreakdown.jsx              Σήμερα / Αυτή την εβδομάδα / Αυτόν τον
                                    μήνα income+expense breakdown
    MonthlyTrendChart.jsx           income vs. expense bar chart by
                                     month, see Monthly trend chart above
    EntryFilterBar.jsx              search + category/status/date-range
                                     filter panel above the entry list
    EntryList.jsx                  the entry list — tap a row to edit,
                                    "Διαγραφή" to delete (hidden entirely
                                    for viewer-role collaborators)
    NewProjectModal.jsx            "create project" bottom sheet
    ProjectSettingsModal.jsx        owner: rename/relocate, archive/
                                     restore, delete, CSV export, manage
                                     collaborators. non-owner: CSV export
                                     + role info only (gear icon in header)
    QuickAddModal.jsx              "add entry" bottom sheet — also handles
                                    editing an existing entry and
                                    attaching/removing its receipt photo
    OptionPill.jsx                  shared filled icon+label pill for
                                     every picker (kind, category,
                                     status, method, collaborator role)
                                     — see Selectable options above
    EmptyMoment.jsx                  shared icon-badge + title + message
                                      for every "nothing here" screen —
                                      see Moments of personality above
    ReceiptThumbnail.jsx            small clickable receipt photo →
                                     full-size lightbox on tap. Used by
                                     both EntryList.jsx and QuickAddModal.jsx
    AccountModal.jsx                subscription status + upgrade button
                                     (person icon in the header)
    UndoToast.jsx                    the "Undo" bar after a delete — see
                                      Deleting things above
    StatusToast.jsx                  the plain auto-dismissing "that
                                      worked" toast, same shell as
                                      UndoToast — see Consistent action
                                      feedback above
public/
  icon.svg, icon-192.png, icon-512.png   app icons (used by the PWA manifest)
netlify/functions/
  create-checkout-session.js  starts a Stripe Checkout session for the
                               signed-in user
  stripe-webhook.js            receives Stripe's webhook calls, verifies
                                their signature, updates `subscriptions`
  lib/stripeClient.js           the Stripe SDK client — refuses to start
                                 unless the key is a test key (see Billing)
  lib/supabaseAdmin.js          server-side Supabase client using the
                                 secret key, for the two functions above
supabase/
  schema.sql                  run once in the Supabase SQL Editor — creates
                               the projects/entries/project_collaborators/
                               subscriptions tables, their Row Level
                               Security policies, and the two SECURITY
                               DEFINER helper functions those policies
                               rely on
vite.config.js                Vite + Tailwind + PWA plugin configuration
.env.example                  which env vars the app needs (copy to
                               .env.local and fill in real values — never
                               committed, see .gitignore)
```

## Setting up Supabase (do this once)

You need your own Supabase project — the code doesn't include one. This
takes about 10 minutes the first time.

**1. Create a free account.** Go to
[supabase.com](https://supabase.com) → **Start your project** → sign in
with GitHub (simplest, reuses the account you already have).

**2. Create a new project.** Click **New project**, pick any organization
it offers, and fill in:
   - **Name**: anything, e.g. `diaxeirisi-ergou`
   - **Database Password**: click "Generate a password" and **save it
     somewhere** (a password manager, or a note) even though this app
     never uses it directly — it's your master key to the database itself
     if you ever need it.
   - **Region**: pick one close to Greece (e.g. an EU region) for faster
     loading.

   Click **Create new project** and wait 1-2 minutes while it provisions.

**3. Create the tables.** In the left sidebar, open **SQL Editor** → **New
query**. Open `supabase/schema.sql` from this repo, copy its entire
contents, paste into the editor, and click **Run**. You should see
"Success. No rows returned." This created the tables and locked them down
with Row Level Security so each account can only ever see its own data
(and whatever's been explicitly shared with it — see **Sharing a
project** above). Safe to re-run any time `schema.sql` changes — it's
idempotent, so re-running an old copy or the current one both just
converge on the same state.

**4. Allow the app's URLs to receive the sign-in link.** In the left
sidebar: **Authentication → URL Configuration**. Under **Redirect URLs**,
add both of these (one per line, click **Add URL** for each):

```
https://unique-douhua-1e8149.netlify.app/**
http://localhost:5173/**
```

Click **Save**. Without this, Supabase will refuse to send you back to the
app after you click the sign-in link (it only redirects to URLs you've
explicitly allowed — a real security check, not red tape).

**5. Get your API keys.** Left sidebar: **Project Settings → API Keys**.
You need two values from this page:
   - **Project URL** — under General settings, or derived from your
     project ref: `https://<project-ref>.supabase.co`
   - **Publishable key** (starts with `sb_publishable_...` — older
     projects instead show a legacy **anon / public** key starting with
     `eyJ`; either works the same way) — this one is safe to use in
     frontend code, it's meant to be public. **Never** copy a **Secret
     key** (`sb_secret_...`) or the legacy `service_role` key anywhere in
     this app — those bypass all the access rules `schema.sql` set up.

Keep this browser tab open — you'll paste both values into two places
next: your own machine (to run it locally) and Netlify (where it's
already deployed).

## Running it on your own machine

You'll need [Node.js](https://nodejs.org) installed (the LTS version).
Then, in a terminal, from this folder:

```bash
npm install                    # downloads dependencies — only needed once
cp .env.example .env.local     # your personal, un-committed config file
```

Open `.env.local` in a text editor and replace the two placeholder values
with your real Project URL and anon key from step 5 above. Then:

```bash
npm run dev   # starts a local dev server with live-reload
```

`npm run dev` will print a URL like `http://localhost:5173` — open that in
your browser. Leave the terminal window running; closing it (or pressing
`Ctrl+C` in it) stops the server.

## Everyday commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the local dev server (auto-reloads as you edit) |
| `npm run build` | Build the production version into `dist/` |
| `npm run preview` | Serve the production build locally, to sanity-check it |
| `npm run lint` | Check the code for common mistakes |

## Installing it like an app (PWA)

Open the live site on your phone in Chrome (Android) or Safari (iOS) and
use "Add to Home Screen" from the browser menu. It'll then open
full-screen, without browser address bars, like a regular app icon.

## Deployment (Netlify)

This app is already deployed to Netlify at
**unique-douhua-1e8149.netlify.app**, connected to this GitHub repo, so it
rebuilds automatically on every push to this branch. The one thing that
deploy is still missing is the same two Supabase values from step 5 above
— without them the live site can't reach the database.

In the Netlify dashboard for this site: **Site configuration → Environment
variables → Add a variable**, and add both:

| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | your Project URL |
| `VITE_SUPABASE_ANON_KEY` | your anon/public key |

Then **Deploys → Trigger deploy → Deploy site** (env var changes don't
apply until the next build). After that finishes, the live site is fully
wired up — sign in with your email there and it's the same data you see
locally.

## Roadmap notes

- Everything in "deliberately cut for v1" above, only if actually needed.
- Verifying a real domain in Resend would fix sign-in emails landing in
  spam and lift the "only delivers to your own signup address" limit on
  the shared `onboarding@resend.dev` sender — not needed for a single
  user, worth doing before other people sign in.
