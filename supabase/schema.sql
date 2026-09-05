-- Διαχείριση Έργου — database schema
--
-- Run this once, in the Supabase dashboard: SQL Editor → New query → paste
-- this whole file → Run. It creates the tables the app needs and locks
-- them down with Row Level Security so that each signed-in user can only
-- ever see and edit what they're supposed to — the database enforces
-- this itself, not the app's JavaScript, which matters because the app's
-- code (and its Supabase key) is publicly visible in the browser.
--
-- Safe to re-run: table creation is guarded with "if not exists" and every
-- policy/function is dropped and recreated, so running this again (e.g.
-- after a schema.sql update) just applies whatever changed.

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  location text,
  created_at timestamptz not null default now()
);

create table if not exists entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid not null references projects (id) on delete cascade,
  kind text not null check (kind in ('income', 'expense')),
  category text not null,
  vendor text,
  note text not null,
  amount numeric(12, 2) not null check (amount > 0),
  vat boolean not null default false,
  date date not null,
  created_at timestamptz not null default now()
);

create index if not exists entries_project_id_idx on entries (project_id);

-- A project owner can share view or edit access to a specific project with
-- someone else by email — no separate invite/accept flow, no new auth
-- system. The collaborator gets access automatically the next time they
-- sign in with that exact email (matched case-insensitively), because
-- access is checked live via RLS on every request, not granted at
-- "invite time" and not baked into a login token.
create table if not exists project_collaborators (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  email text not null,
  role text not null check (role in ('viewer', 'editor')),
  invited_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (project_id, email)
);

create index if not exists project_collaborators_project_id_idx on project_collaborators (project_id);
create index if not exists project_collaborators_email_idx on project_collaborators (email);

-- Row Level Security: without this, the tables are only as private as the
-- app's own code makes them — with it, the database refuses any query that
-- isn't scoped to the requesting user, no matter what the client asks for.
alter table projects enable row level security;
alter table entries enable row level security;
alter table project_collaborators enable row level security;

-- ---------------------------------------------------------------------
-- Helper functions — SECURITY DEFINER, so they bypass RLS *internally*
-- for this one lookup, running as the function's owner rather than the
-- calling user.
--
-- Why these exist at all: projects' policy needs to check
-- project_collaborators (is this user a collaborator?), and
-- project_collaborators' policy needs to check projects (is this user
-- the owner?). Written as plain subqueries directly inside each policy,
-- that's a cycle — evaluating one triggers the other, which triggers the
-- first again — and Postgres's own recursion guard rejects every query
-- on either table with "infinite recursion detected in policy" (caught
-- this via the adversarial test itself: it failed loudly, not subtly).
-- Routing the cross-table check through a SECURITY DEFINER function
-- breaks the cycle, since the function's internal query isn't subject to
-- the RLS that's currently being evaluated on the caller's behalf.
-- ---------------------------------------------------------------------

create or replace function is_project_owner(target_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from projects p
    where p.id = target_project_id
    and p.user_id = auth.uid()
  );
$$;

create or replace function my_project_role(target_project_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from project_collaborators pc
  where pc.project_id = target_project_id
  and lower(auth.email()) = pc.email
  limit 1;
$$;

-- ---------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------

-- Owner: full control (select/insert/update/delete) over their own
-- projects — unchanged from before collaborators existed.
drop policy if exists "own projects only" on projects;
create policy "own projects only" on projects
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Collaborators (any role) can VIEW a project they've been added to, but
-- this is a select-only policy — renaming/deleting the project itself, and
-- managing who else has access, stays owner-only regardless of role.
drop policy if exists "collaborators can view project" on projects;
create policy "collaborators can view project" on projects
  for select
  using (my_project_role(id) is not null);

-- ---------------------------------------------------------------------
-- entries — authorization here is entirely project-based (owner, or a
-- collaborator on that project), not tied to entries.user_id. That column
-- still records who created a given entry (useful metadata), but an
-- editor can manage every entry in a shared project, not just their own
-- additions — the same way any editor on a shared document can edit any
-- part of it, not just the parts they personally typed.
-- ---------------------------------------------------------------------

drop policy if exists "own entries only" on entries;

drop policy if exists "entries visible to project members" on entries;
create policy "entries visible to project members" on entries
  for select
  using (
    is_project_owner(project_id)
    or my_project_role(project_id) is not null
  );

-- Covers insert/update/delete. Note this also re-checks project_id on
-- UPDATE via WITH CHECK — so re-pointing an entry's project_id at a
-- project you don't have edit access to (to "steal" it into your own
-- project, or move it somewhere you can hide it) is rejected, since the
-- new row's project_id has to pass this same check too.
drop policy if exists "entries editable by owner and editors" on entries;
create policy "entries editable by owner and editors" on entries
  for all
  using (
    is_project_owner(project_id)
    or my_project_role(project_id) = 'editor'
  )
  with check (
    is_project_owner(project_id)
    or my_project_role(project_id) = 'editor'
  );

-- ---------------------------------------------------------------------
-- project_collaborators
-- ---------------------------------------------------------------------

-- Only the project owner adds, changes, or removes collaborators —
-- editors can edit entries, not the membership list.
drop policy if exists "owner manages collaborators" on project_collaborators;
create policy "owner manages collaborators" on project_collaborators
  for all
  using (is_project_owner(project_id))
  with check (is_project_owner(project_id));

-- A collaborator can see their OWN invitation row (self-lookup by email,
-- not routed through the helper function above — this is the one place
-- that intentionally stays a direct check, since it's what the helper
-- function itself relies on internally).
drop policy if exists "collaborator sees own invite" on project_collaborators;
create policy "collaborator sees own invite" on project_collaborators
  for select
  using (lower(auth.email()) = email);

-- ---------------------------------------------------------------------
-- subscriptions — one row per user, written only by the Stripe webhook
-- (netlify/functions/stripe-webhook.js), which uses the service_role key
-- and so bypasses RLS entirely. There is deliberately no insert/update/
-- delete policy for regular users below: from the browser, this table is
-- effectively read-only. A user can see their own billing status; only
-- the webhook — driven by what Stripe actually reports — can change it.
-- ---------------------------------------------------------------------

create table if not exists subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'none',
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

alter table subscriptions enable row level security;

drop policy if exists "users see own subscription" on subscriptions;
create policy "users see own subscription" on subscriptions
  for select
  using (auth.uid() = user_id);
