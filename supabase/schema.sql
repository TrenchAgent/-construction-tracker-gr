-- Διαχείριση Έργου — database schema
--
-- Run this once, in the Supabase dashboard: SQL Editor → New query → paste
-- this whole file → Run. It creates the two tables the app needs and locks
-- them down with Row Level Security so that each signed-in user can only
-- ever see and edit their own projects and entries — the database enforces
-- this itself, not the app's JavaScript, which matters because the app's
-- code (and its Supabase key) is publicly visible in the browser.

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

-- Row Level Security: without this, the tables are only as private as the
-- app's own code makes them — with it, the database refuses any query that
-- isn't scoped to the requesting user, no matter what the client asks for.
alter table projects enable row level security;
alter table entries enable row level security;

drop policy if exists "own projects only" on projects;
create policy "own projects only" on projects
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own entries only" on entries;
create policy "own entries only" on entries
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
