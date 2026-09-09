// ---------------------------------------------------------------------------
// All persistence goes through this file — components never talk to
// Supabase directly. That's the one part of the original localStorage
// design that's unchanged.
//
// What DID change, and why: localStorage reads/writes are instant and
// synchronous. Supabase calls are network requests — they're asynchronous
// by nature, so every function here now returns a Promise and the two old
// "save the whole array back" functions (saveProjects/saveEntries) are gone.
// They were a fine shortcut for a JSON blob in localStorage, but replaying
// them against a shared database would mean literally deleting and
// re-inserting every row on every change — on two devices that race, that
// silently loses data (see the PR/commit description for the concrete
// scenario). Add/delete map onto real database operations instead, and the
// two call sites in App.jsx are simpler for it, not more complex.
//
// Every table has Row Level Security enabled (see supabase/schema.sql) —
// Supabase automatically scopes every query in here to the signed-in user,
// so there's no manual "user_id" filtering to get wrong on the client.
// ---------------------------------------------------------------------------

import { supabase } from './supabaseClient'

function mapProject(row) {
  return {
    id: row.id,
    name: row.name,
    location: row.location || '',
    ownerId: row.user_id,
    createdAt: row.created_at,
    // undefined (column not migrated yet on this database) collapses to
    // null the same as "not archived" — see getProjects' own comment.
    archivedAt: row.archived_at || null,
  }
}

function mapCollaborator(row) {
  return { id: row.id, email: row.email, role: row.role }
}

function mapEntry(row) {
  return {
    id: row.id,
    kind: row.kind,
    category: row.category,
    vendor: row.vendor || '',
    note: row.note,
    amount: Number(row.amount),
    vat: row.vat,
    date: row.date,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method || '',
    receiptPath: row.receipt_path || '',
  }
}

const RECEIPTS_BUCKET = 'receipts'

// How long a signed URL stays valid. Re-requested fresh whenever a
// thumbnail mounts rather than cached/stored anywhere, so this only needs
// to outlive one render — it's not a durable link.
const RECEIPT_URL_TTL_SECONDS = 3600

function extensionFor(file) {
  const fromName = file.name.split('.').pop()
  if (fromName && fromName.length <= 5 && /^[a-zA-Z0-9]+$/.test(fromName)) return fromName.toLowerCase()
  const fromType = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic' }
  return fromType[file.type] || 'jpg'
}

// Uploads the photo and returns the storage path — the caller still has
// to write that path onto the entry (setEntryReceiptPath) themselves;
// these stay separate calls rather than one combined function because
// the failure modes differ (a failed upload has nothing to roll back; a
// failed metadata write after a successful upload leaves an orphaned
// file worth knowing about specifically — see App.jsx).
export async function uploadReceipt(projectId, entryId, file) {
  const path = `${projectId}/${entryId}-${Date.now()}.${extensionFor(file)}`
  const { error } = await supabase.storage.from(RECEIPTS_BUCKET).upload(path, file, {
    contentType: file.type,
  })
  if (error) throw error
  return path
}

export async function deleteReceiptFile(path) {
  if (!path) return
  const { error } = await supabase.storage.from(RECEIPTS_BUCKET).remove([path])
  if (error) throw error
}

// Deletes every receipt file under a project's folder in one call — used
// when a project itself is deleted (see deleteProject below). Storage
// objects aren't foreign-keyed to entries, so the "on delete cascade" on
// entries.project_id never touches them on its own; without this they'd
// sit there forever, orphaned.
async function deleteAllReceiptsForProject(projectId) {
  const { data, error } = await supabase.storage.from(RECEIPTS_BUCKET).list(projectId)
  if (error) throw error
  if (!data || data.length === 0) return
  const paths = data.map((f) => `${projectId}/${f.name}`)
  const { error: removeError } = await supabase.storage.from(RECEIPTS_BUCKET).remove(paths)
  if (removeError) throw removeError
}

export async function getReceiptUrl(path) {
  const { data, error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .createSignedUrl(path, RECEIPT_URL_TTL_SECONDS)
  if (error) throw error
  return data.signedUrl
}

export async function setEntryReceiptPath(id, path) {
  const { data, error } = await supabase
    .from('entries')
    .update({ receipt_path: path || null })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return mapEntry(data)
}

// Returns every project regardless of archived state — active vs.
// archived is a client-side split (see App.jsx), not two separate
// queries, since the caller already needs the full list either way (an
// archived project must stay fully reachable, just out of the default
// view). `select('*')` degrades safely if archived_at hasn't been
// migrated onto this database yet: it just isn't one of the columns
// that comes back, and mapProject treats that the same as "not archived".
export async function getProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(mapProject)
}

// null -> active, true -> archived (stamps now()), false -> restore
// (clears the timestamp). A plain update, not a special endpoint —
// archiving is reversible and carries no other side effects (unlike
// deleteProject, nothing else needs cleaning up).
export async function setProjectArchived(id, archived) {
  const { data, error } = await supabase
    .from('projects')
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return mapProject(data)
}

// One row per project with entries (a project with none just doesn't
// appear — callers should treat a missing id as all-zero, not an error).
// Powers the all-projects overview screen; see the view's own comment in
// schema.sql for why this doesn't need its own RLS policy.
export async function getProjectSummaries() {
  const { data, error } = await supabase.from('project_summaries').select('*')
  if (error) throw error
  const byProjectId = new Map()
  for (const row of data) {
    byProjectId.set(row.project_id, {
      income: Number(row.income),
      expense: Number(row.expense),
      pendingAmount: Number(row.pending_amount),
    })
  }
  return byProjectId
}

export async function addProject({ name, location }) {
  const { data, error } = await supabase
    .from('projects')
    .insert({ name, location: location || null })
    .select()
    .single()
  if (error) throw error
  return mapProject(data)
}

export async function getEntries(projectId) {
  if (!projectId) return []
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(mapEntry)
}

export async function addEntry(projectId, entry) {
  const { data, error } = await supabase
    .from('entries')
    .insert({
      project_id: projectId,
      kind: entry.kind,
      category: entry.category,
      vendor: entry.vendor || null,
      note: entry.note,
      amount: entry.amount,
      vat: entry.vat,
      date: entry.date,
      payment_status: entry.paymentStatus,
      payment_method: entry.paymentMethod || null,
    })
    .select()
    .single()
  if (error) throw error
  return mapEntry(data)
}

export async function updateEntry(id, entry) {
  const { data, error } = await supabase
    .from('entries')
    .update({
      kind: entry.kind,
      category: entry.category,
      vendor: entry.vendor || null,
      note: entry.note,
      amount: entry.amount,
      vat: entry.vat,
      date: entry.date,
      payment_status: entry.paymentStatus,
      payment_method: entry.paymentMethod || null,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return mapEntry(data)
}

// Looks up the entry's own receipt_path first (rather than making the
// caller pass it in) so every call site gets the cleanup for free instead
// of having to remember it — deleting an entry always fully removes it.
export async function deleteEntry(id) {
  const { data: existing } = await supabase.from('entries').select('receipt_path').eq('id', id).maybeSingle()
  const { error } = await supabase.from('entries').delete().eq('id', id)
  if (error) throw error
  if (existing?.receipt_path) {
    // Best-effort: the entry is already gone either way, and a stray
    // orphaned file is a cleanup nit, not worth failing the delete over.
    await deleteReceiptFile(existing.receipt_path).catch(() => {})
  }
}

export async function updateProject(id, { name, location }) {
  const { data, error } = await supabase
    .from('projects')
    .update({ name, location: location || null })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return mapProject(data)
}

// Cascades to that project's entries (and its collaborator rows)
// automatically — see the "on delete cascade" foreign keys in
// supabase/schema.sql. Receipt files aren't a database row, so that
// cascade can't reach them — remove them first, while project_id is
// still valid to filter Storage by (deleting them after would work too,
// since the folder name doesn't depend on the project row existing, but
// doing it first means a failure here still blocks the delete instead of
// leaving the project gone and its receipts orphaned).
export async function deleteProject(id) {
  await deleteAllReceiptsForProject(id)
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw error
}

// Every project this email has been given collaborator access to, and at
// what role — used once at load time to figure out which of the projects
// getProjects() returns (owned + shared) the current user can edit vs.
// only view. Not project-scoped: a collaborator invite is looked up by
// email, so this is inherently "everything shared with me".
export async function getMyCollaborations(email) {
  const { data, error } = await supabase
    .from('project_collaborators')
    .select('project_id, role')
    .eq('email', email.toLowerCase())
  if (error) throw error
  return data
}

// Owner-only in practice (RLS), but any caller without owner access just
// gets an empty list back rather than an error — fine, since the UI never
// shows this to non-owners anyway.
export async function getCollaborators(projectId) {
  const { data, error } = await supabase
    .from('project_collaborators')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(mapCollaborator)
}

export async function addCollaborator(projectId, { email, role }) {
  const { data, error } = await supabase
    .from('project_collaborators')
    .insert({ project_id: projectId, email: email.toLowerCase().trim(), role })
    .select()
    .single()
  if (error) throw error
  return mapCollaborator(data)
}

export async function removeCollaborator(id) {
  const { error } = await supabase.from('project_collaborators').delete().eq('id', id)
  if (error) throw error
}
