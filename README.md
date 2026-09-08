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
  components/
    AuthGate.jsx                shows LoginScreen or the app, based on
                                 whether there's a signed-in session
    LoginScreen.jsx              email sign-in form (sends the link)
    Header.jsx                   top bar, project switcher, sign-out,
                                  "Συνεργασία" badge on shared projects
    EmptyState.jsx                "no project yet" screen (zero projects
                                   at all — different from the overview
                                   below, which needs at least one)
    ProjectsOverview.jsx           home screen — a card per project,
                                    tap one to open it
    DashboardSummary.jsx          income/expense/profit/outstanding cards
    TimeBreakdown.jsx              Σήμερα / Αυτή την εβδομάδα / Αυτόν τον
                                    μήνα income+expense breakdown
    EntryList.jsx                  the entry list — tap a row to edit,
                                    "Διαγραφή" to delete (hidden entirely
                                    for viewer-role collaborators)
    NewProjectModal.jsx            "create project" bottom sheet
    ProjectSettingsModal.jsx        owner: rename/relocate, delete, CSV
                                     export, manage collaborators.
                                     non-owner: CSV export + role info
                                     only (gear icon in the header)
    QuickAddModal.jsx              "add entry" bottom sheet — also handles
                                    editing an existing entry and
                                    attaching/removing its receipt photo
    ReceiptThumbnail.jsx            small clickable receipt photo →
                                     full-size lightbox on tap. Used by
                                     both EntryList.jsx and QuickAddModal.jsx
    AccountModal.jsx                subscription status + upgrade button
                                     (person icon in the header)
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
