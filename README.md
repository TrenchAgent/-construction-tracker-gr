# Διαχείριση Έργου — Construction Site Manager (GR)

A mobile-first, Greek-language expense tracker for construction projects.
Track income (Είσπραξη) and expenses (Έξοδο) per project, split expenses
into three categories (Υλικά / Εργατικά / Λοιπά), optionally add 24% VAT,
and see profit/loss at a glance. Built as an installable web app (PWA) —
no app store needed.

This README assumes you've never used git/npm before. Read it top to
bottom the first time; after that you'll only need the "Everyday commands"
section.

## ⚠️ Before you show this to anyone else: read this

**This app currently stores all data in the browser (`localStorage`).**
That means:

- Data does **not** sync between devices — your phone and your laptop will
  each have their own separate data.
- If you clear your browser's site data, or in some cases free up phone
  storage, **the data is gone**. There is no backup anywhere else.
- This is fine for trying the app out on one device. It is **not** fine
  once you're tracking real projects and real money on more than one
  device.

Before that point, this needs a real backend — [Supabase](https://supabase.com)
is a good, low-cost fit for a project this size. All the storage code is
isolated in one file (`src/lib/storage.js`) specifically so that swap is a
contained piece of work later, not a rewrite. Don't let anyone treat this
as "done" for real business use until that's in place.

## What's in v1 (and what's deliberately left out)

**Included:** projects (name + optional location), quick-add entries
(income or expense, amount, optional VAT 24%, optional vendor, required
note, date), a dashboard with income/expense/profit totals, and a
reverse-chronological entry list with delete.

**Deliberately cut for v1** (don't add back without checking this is
still wanted): tax ID (ΑΦΜ) capture, receipt photos, payment
method/status tracking, a transportation cost field, rate analysis,
overheads, work-area tagging, finer-grained material categories, and
labour headcount/day-rate tracking.

## Project structure

```
src/
  App.jsx                    top-level state (projects, entries) and layout
  constants.js                expense categories, VAT rate
  lib/format.js                € currency formatting (el-GR locale)
  lib/storage.js               ALL localStorage access goes through here —
                                this is the file to change when adding a
                                real backend
  components/
    Header.jsx                 top bar + project switcher
    EmptyState.jsx              "no project yet" screen
    DashboardSummary.jsx        income/expense/profit cards
    EntryList.jsx                the list of entries with delete
    NewProjectModal.jsx          "create project" bottom sheet
    QuickAddModal.jsx            "add entry" bottom sheet
public/
  icon.svg, icon-192.png, icon-512.png   app icons (used by the PWA manifest)
vite.config.js                Vite + Tailwind + PWA plugin configuration
```

## Running it on your own machine

You'll need [Node.js](https://nodejs.org) installed (the LTS version).
Then, in a terminal, from this folder:

```bash
npm install   # downloads the project's dependencies — only needed once,
              # or again after pulling changes that add new dependencies
npm run dev   # starts a local dev server with live-reload
```

`npm run dev` will print a URL like `http://localhost:5173` — open that in
your browser. Leave the terminal window running; closing it (or pressing
`Ctrl+C` in it) stops the server. On your phone, if it's on the same
Wi-Fi, you can usually reach it at your computer's local IP address on the
same port — ask if you want help with that.

## Everyday commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the local dev server (auto-reloads as you edit) |
| `npm run build` | Build the production version into `dist/` |
| `npm run preview` | Serve the production build locally, to sanity-check it |
| `npm run lint` | Check the code for common mistakes |

## Installing it like an app (PWA)

Once it's deployed (see below), open the site on your phone in Chrome
(Android) or Safari (iOS) and use "Add to Home Screen" from the browser
menu. It'll then open full-screen, without browser address bars, like a
regular app icon.

## Deploying with Vercel

[Vercel](https://vercel.com) is a hosting service with a generous free
tier that's a natural fit for a Vite/React project — connect it to the
GitHub repo and it rebuilds and redeploys automatically on every push.

1. Push this repo to GitHub (if you're reading this from the repo, that
   part's already done).
2. Go to [vercel.com](https://vercel.com) and sign up/log in — "Continue
   with GitHub" is the simplest option, it reuses your GitHub account.
3. Click **Add New → Project**, then **Import** this GitHub repository.
4. Vercel auto-detects a Vite project. Leave the defaults (build command
   `npm run build`, output directory `dist`) and click **Deploy**.
5. After a minute or two you'll get a live URL like
   `your-project.vercel.app` — that's the app, live on the internet.
6. Every time new work is pushed to the branch Vercel is watching, it
   redeploys automatically — no extra steps.

Remember the localStorage caveat above: this deploy step makes the app
*reachable*, but it doesn't change where the data lives. Each person's
data stays local to whatever browser/device they used it on until a real
backend is added.

## Roadmap notes

- Real backend (Supabase) for cross-device sync — see the warning above.
  This is the next big piece of work, not an optional nice-to-have.
- Everything else in "out of scope for v1" above, only if actually needed.
