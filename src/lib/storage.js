// ---------------------------------------------------------------------------
// ⚠️ TEMPORARY STORAGE — READ THIS BEFORE DEPLOYING PUBLICLY
//
// Everything here lives in the browser's localStorage. That means:
//   - Data does NOT sync between devices (phone and laptop see different data).
//   - Data is lost if the user clears their browser data, or on some phones,
//     when they reinstall the app / free up storage.
//   - Nothing is backed up anywhere.
//
// This is fine for trying the app out and for a single-device demo. It is
// NOT fine as the permanent storage for a real business tracking real money.
// Before this app is used on more than one device (or the data matters),
// swap this module for a real backend — Supabase is a good fit (free tier,
// Postgres, works well with a Vite/React app). The functions below
// (getProjects/saveProjects/getEntries/saveEntries) are the only place that
// needs to change — every component calls through this module, never
// localStorage directly.
// ---------------------------------------------------------------------------

const PROJECTS_KEY = 'csm_projects'
const entriesKey = (projectId) => `csm_entries_${projectId}`

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or unavailable (e.g. private browsing) — fail silently,
    // the UI still works for the current session.
  }
}

export function getProjects() {
  return readJSON(PROJECTS_KEY, [])
}

export function saveProjects(projects) {
  writeJSON(PROJECTS_KEY, projects)
}

export function getEntries(projectId) {
  if (!projectId) return []
  return readJSON(entriesKey(projectId), [])
}

export function saveEntries(projectId, entries) {
  writeJSON(entriesKey(projectId), entries)
}
