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
  return { id: row.id, name: row.name, location: row.location || '', ownerId: row.user_id }
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
  }
}

export async function getProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(mapProject)
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
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return mapEntry(data)
}

export async function deleteEntry(id) {
  const { error } = await supabase.from('entries').delete().eq('id', id)
  if (error) throw error
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
// supabase/schema.sql.
export async function deleteProject(id) {
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
