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

**Included:** projects (name + optional location, editable, deletable —
deleting a project deletes its entries too), quick-add entries (income or
expense, amount, optional VAT 24%, optional vendor, required note, date),
editable and deletable individual entries, a dashboard with
income/expense/profit totals, a reverse-chronological entry list, CSV
export per project, and inviting a collaborator (viewer or editor) to a
specific project by email. Sign-in is by emailed link, no password.

One real limitation in entry editing, not hidden: the database only
stores the final amount (VAT already applied, if it was on) — not the
pre-VAT number you originally typed. So editing an entry lets you correct
the final amount, but doesn't let you flip its VAT flag or recompute from
a new pre-VAT number; to change whether VAT applies, delete the entry and
add it again.

**Deliberately cut for v1** (don't add back without checking this is
still wanted): tax ID (ΑΦΜ) capture, receipt photos, payment
method/status tracking, a transportation cost field, rate analysis,
overheads, work-area tagging, and finer-grained material categories.

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
  components/
    AuthGate.jsx                shows LoginScreen or the app, based on
                                 whether there's a signed-in session
    LoginScreen.jsx              email sign-in form (sends the link)
    Header.jsx                   top bar, project switcher, sign-out,
                                  "Συνεργασία" badge on shared projects
    EmptyState.jsx                "no project yet" screen
    DashboardSummary.jsx          income/expense/profit cards
    EntryList.jsx                  the entry list — tap a row to edit,
                                    "Διαγραφή" to delete (hidden entirely
                                    for viewer-role collaborators)
    NewProjectModal.jsx            "create project" bottom sheet
    ProjectSettingsModal.jsx        owner: rename/relocate, delete, CSV
                                     export, manage collaborators.
                                     non-owner: CSV export + role info
                                     only (✎ icon in the header)
    QuickAddModal.jsx              "add entry" bottom sheet — also handles
                                    editing an existing entry
public/
  icon.svg, icon-192.png, icon-512.png   app icons (used by the PWA manifest)
supabase/
  schema.sql                  run once in the Supabase SQL Editor — creates
                               the projects/entries/project_collaborators
                               tables, their Row Level Security policies,
                               and the two SECURITY DEFINER helper
                               functions those policies rely on
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
