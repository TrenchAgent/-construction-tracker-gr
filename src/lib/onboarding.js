// A user with zero projects right now is either a true first-time
// visitor (never created one) or a returning user who happens to have
// deleted their last one — those deserve different empty-state copy
// (see EmptyState.jsx), and current project count alone can't tell them
// apart, since by definition both look like "zero projects" at load
// time. This is a one-way flag, per signed-in user, set the first time
// we ever see them with at least one project (on load, or right after
// creating their first one) — same localStorage-per-user pattern as
// outbox.js, chosen for the same reason: cheap, no schema change, no
// backend round trip just to decide which empty-state message to show.
//
// It's a per-browser signal, not a per-account one (a different device
// wouldn't know) — an acceptable trade for how lightweight this needs to
// stay; the worst case of getting it wrong either way is just showing
// (or skipping) a few lines of welcome text, never a functional problem.

const KEY_PREFIX = 'diaxeirisi-ergou:has-had-project:'

export function hasEverHadProject(userId) {
  try {
    return localStorage.getItem(KEY_PREFIX + userId) === '1'
  } catch {
    // Storage blocked/unavailable — default to treating them as first-run
    // rather than not: showing the welcome blurb to a returning user one
    // extra time is harmless, but hiding it from an actual first-time
    // visitor defeats the point of it.
    return false
  }
}

export function markHasHadProject(userId) {
  try {
    localStorage.setItem(KEY_PREFIX + userId, '1')
  } catch {
    // Best-effort — nothing meaningful to fall back to here.
  }
}
