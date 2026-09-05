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
-- policy is dropped and recreated, so running this again (e.g. after a
-- schema.sql update) just applies whatever changed.

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
  using (
    exists (
      select 1 from project_collaborators pc
      where pc.project_id = projects.id
      and lower(auth.email()) = pc.email
    )
  );

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
    exists (select 1 from projects p where p.id = entries.project_id and p.user_id = auth.uid())
    or exists (
      select 1 from project_collaborators pc
      where pc.project_id = entries.project_id
      and lower(auth.email()) = pc.email
    )
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
    exists (select 1 from projects p where p.id = entries.project_id and p.user_id = auth.uid())
    or exists (
      select 1 from project_collaborators pc
      where pc.project_id = entries.project_id
      and lower(auth.email()) = pc.email
      and pc.role = 'editor'
    )
  )
  with check (
    exists (select 1 from projects p where p.id = entries.project_id and p.user_id = auth.uid())
    or exists (
      select 1 from project_collaborators pc
      where pc.project_id = entries.project_id
      and lower(auth.email()) = pc.email
      and pc.role = 'editor'
    )
  );

-- ---------------------------------------------------------------------
-- project_collaborators
-- ---------------------------------------------------------------------

-- Only the project owner adds, changes, or removes collaborators —
-- editors can edit entries, not the membership list.
drop policy if exists "owner manages collaborators" on project_collaborators;
create policy "owner manages collaborators" on project_collaborators
  for all
  using (exists (select 1 from projects p where p.id = project_collaborators.project_id and p.user_id = auth.uid()))
  with check (exists (select 1 from projects p where p.id = project_collaborators.project_id and p.user_id = auth.uid()));

-- A collaborator can see their OWN invitation row. This isn't just a nice
-- self-service touch — it's load-bearing: the policies above check
-- project_collaborators via a subquery, and Postgres RLS applies to that
-- subquery too. Without this, a collaborator's subquery would see zero
-- rows in project_collaborators (even their own), and every check above
-- would silently evaluate false — access would look "granted" by the
-- invite row's existence but never actually work.
drop policy if exists "collaborator sees own invite" on project_collaborators;
create policy "collaborator sees own invite" on project_collaborators
  for select
  using (lower(auth.email()) = email);
