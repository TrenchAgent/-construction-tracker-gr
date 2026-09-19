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

-- clients — a real, reusable entity (a client can be attached to several
-- projects over time), not per-project duplicate data. One row per
-- client, owned per-user exactly like projects. Created here, ahead of
-- projects' own later ALTERs, because projects.client_id (added below)
-- and its RLS both reference this table — it has to exist first.
--
-- `type` picks which of the two label sets the UI shows (Ιδιώτης:
-- Όνομα/ΑΦΜ; Εταιρεία: Επωνυμία/ΑΦΜ/ΓΕΜΗ/ΔΟΥ) — `name` holds whichever
-- one applies (a person's name or a company's trade name is the same
-- underlying "what do we call this client" field either way, so one
-- column, not two). gemi/doy stay null for an individual; the UI's job
-- to only show them for a company, not this table's.
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type text not null check (type in ('individual', 'company')),
  name text not null,
  afm text,
  gemi text,
  doy text,
  address text,
  email text,
  created_at timestamptz not null default now()
);

create index if not exists clients_user_id_idx on clients (user_id);

-- Archiving a project (added after projects already existed in
-- production, so this is an ALTER) hides it from the active list and the
-- all-projects overview without deleting anything — null means active,
-- a timestamp means archived (and when). Deliberately not a boolean:
-- keeping *when* it was archived costs nothing extra and is useful data
-- on its own (sorting the archived list, "archived 3 months ago"), the
-- same reasoning as created_at itself. No RLS changes needed for this —
-- every existing policy on projects/entries/collaborators is keyed on
-- ownership or collaborator role, never on archived_at, so an archived
-- project stays exactly as visible to its owner and collaborators as it
-- was before (verified, not just reasoned about — see the commit this
-- came from).
alter table projects add column if not exists archived_at timestamptz;

-- Budget estimate and target timeline — all three optional (a project can
-- be created before any of these are known), same "added after projects
-- already existed" ALTER pattern as archived_at above. No RLS changes
-- needed here either, for the same reason: every policy on this table is
-- keyed on ownership/collaborator role, never on these columns.
alter table projects add column if not exists budget_estimate numeric(12, 2);
alter table projects add column if not exists start_date date;
alter table projects add column if not exists target_completion_date date;

-- A project can optionally be linked to one client. on delete set null
-- (not cascade) — deleting a client should stop it appearing on a
-- project, not take the project's own data down with it.
alter table projects add column if not exists client_id uuid references clients (id) on delete set null;

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

-- Payment status per entry — added after entries already existed in
-- production, so this is an ALTER, not part of the CREATE TABLE above
-- (which only runs for a brand-new database). "if not exists" / drop-then-
-- add-constraint keep this safe to re-run, same as everything else here.
alter table entries add column if not exists payment_status text not null default 'pending';
alter table entries drop constraint if exists entries_payment_status_check;
alter table entries add constraint entries_payment_status_check
  check (payment_status in ('pending', 'partial', 'paid'));

-- Optional payment method per entry — same "added later" situation.
alter table entries add column if not exists payment_method text;
alter table entries drop constraint if exists entries_payment_method_check;
alter table entries add constraint entries_payment_method_check
  check (payment_method is null or payment_method in ('cash', 'transfer', 'card', 'check'));

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

-- The RLS policies below match a collaborator's own row by comparing
-- lower(auth.email()) to this column — so this column has to actually BE
-- lowercase for that match to ever succeed. The app's own insert path
-- (storage.js's inviteCollaborator) already lowercases before writing, so
-- this constraint never rejects anything that goes through the app today —
-- but the app's JavaScript isn't the trust boundary here (same reasoning
-- as the comment at the top of this file), so this makes the invariant
-- the database's own, not something every future writer has to remember.
alter table project_collaborators drop constraint if exists project_collaborators_email_lowercase;
alter table project_collaborators add constraint project_collaborators_email_lowercase
  check (email = lower(email));

-- Row Level Security: without this, the tables are only as private as the
-- app's own code makes them — with it, the database refuses any query that
-- isn't scoped to the requesting user, no matter what the client asks for.
alter table projects enable row level security;
alter table entries enable row level security;
alter table project_collaborators enable row level security;
alter table clients enable row level security;

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

-- Added alongside the clients table (see below), same reason as the two
-- functions above: projects.client_id needs to check "does the caller
-- actually own this client" (so a project owner can't point client_id at
-- a client belonging to someone else — see that check's own comment on
-- the projects policy for the concrete attack this closes), and clients'
-- own collaborator-visibility policy needs to check projects — a direct
-- subquery on both sides would be the exact same cross-table cycle as
-- projects <-> project_collaborators above.
create or replace function owns_client(target_client_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from clients c
    where c.id = target_client_id
    and c.user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------

-- Owner: full control (select/insert/update/delete) over their own
-- projects — unchanged from before collaborators existed. The extra
-- client_id clause (added alongside the clients table below) closes a
-- real hole, not a theoretical one: without it, an owner could point
-- their OWN project's client_id at a client UUID they don't own —
-- belonging to a total stranger, guessed or leaked — and then either
-- read it themselves (if a naive policy on clients granted visibility to
-- "any project that links to this client") or, worse, hand visibility to
-- an alt account by inviting it as a collaborator on that same project
-- (see "collaborators can view linked clients" below, which is scoped to
-- a genuine collaborator role for exactly this reason). Blocking the
-- write at the source — a project's client_id can only ever be set to a
-- client the same owner actually owns — makes both of those paths a
-- non-issue rather than something the read side has to keep defending
-- against.
drop policy if exists "own projects only" on projects;
create policy "own projects only" on projects
  for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (client_id is null or owns_client(client_id))
  );

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
-- clients — RLS policies. The table itself is created much earlier in
-- this file (right after projects' base CREATE TABLE), since projects.
-- client_id and the owns_client() helper both depend on it existing
-- first — see the comment there. This section just owns who can read
-- and write it, same as every other table's RLS section.
-- ---------------------------------------------------------------------

-- Owner: full control — same "own projects only" pattern as projects
-- itself. Only the owner creates/edits/deletes their own clients;
-- collaborators never do (see the select-only policy below), the same
-- split as project settings being owner-only while entries are editable
-- by editors.
drop policy if exists "own clients only" on clients;
create policy "own clients only" on clients
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- A collaborator on any project this client is linked to can VIEW that
-- client (e.g. someone helping manage a shared project's entries can
-- also see who the project is for) — never write. Deliberately scoped
-- to my_project_role(p.id) is not null — a genuine collaborator row —
-- rather than "any project visible to me that links to this client":
-- the owner's own case is already covered by "own clients only" above,
-- so the only thing this policy needs to grant is real collaborator
-- access, and being explicit about that is what stops the projects.
-- client_id write-time check above from being the *only* thing standing
-- between a forged link and real exposure — both have to agree before
-- anyone actually sees a client they don't own.
drop policy if exists "collaborators can view linked clients" on clients;
create policy "collaborators can view linked clients" on clients
  for select
  using (
    exists (
      select 1 from projects p
      where p.client_id = clients.id
      and my_project_role(p.id) is not null
    )
  );

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

-- ---------------------------------------------------------------------
-- Receipt photos — one optional photo per entry, stored in Supabase
-- Storage (not a database table) in a private "receipts" bucket. Each
-- file's path is "<project_id>/<entry_id>-<timestamp>.<ext>" — encoding
-- the project id directly in the path is what lets the policies below
-- decide access without a lookup table, using the same is_project_owner /
-- my_project_role helpers (and so the same owner/editor/viewer rules) as
-- entries themselves: any project member can view a receipt; only the
-- owner or an editor can upload or remove one. 8 MB / image-only, so this
-- can't become a dumping ground for arbitrary large files.
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

alter table entries add column if not exists receipt_path text;

drop policy if exists "receipts visible to project members" on storage.objects;
create policy "receipts visible to project members" on storage.objects
  for select
  using (
    bucket_id = 'receipts'
    and (
      is_project_owner((storage.foldername(name))[1]::uuid)
      or my_project_role((storage.foldername(name))[1]::uuid) is not null
    )
  );

drop policy if exists "receipts uploadable by owner and editors" on storage.objects;
create policy "receipts uploadable by owner and editors" on storage.objects
  for insert
  with check (
    bucket_id = 'receipts'
    and (
      is_project_owner((storage.foldername(name))[1]::uuid)
      or my_project_role((storage.foldername(name))[1]::uuid) = 'editor'
    )
  );

drop policy if exists "receipts deletable by owner and editors" on storage.objects;
create policy "receipts deletable by owner and editors" on storage.objects
  for delete
  using (
    bucket_id = 'receipts'
    and (
      is_project_owner((storage.foldername(name))[1]::uuid)
      or my_project_role((storage.foldername(name))[1]::uuid) = 'editor'
    )
  );

-- ---------------------------------------------------------------------
-- project_summaries — per-project totals for the all-projects overview
-- screen, computed server-side so it doesn't have to fetch every entry
-- of every project just to show a card. security_invoker means this
-- view runs with the CALLING user's own permissions, not its owner's —
-- so it's automatically scoped by entries' existing RLS (project
-- members only), with no separate policy needed on the view itself.
-- ---------------------------------------------------------------------

create or replace view project_summaries
with (security_invoker = true)
as
select
  project_id,
  coalesce(sum(amount) filter (where kind = 'income'), 0) as income,
  coalesce(sum(amount) filter (where kind = 'expense'), 0) as expense,
  coalesce(sum(amount) filter (where payment_status in ('pending', 'partial')), 0) as pending_amount
from entries
group by project_id;

grant select on project_summaries to authenticated;
