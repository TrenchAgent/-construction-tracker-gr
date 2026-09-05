// A small localStorage-backed queue of "add entry" writes made while the
// device had no connection. Construction sites often have bad or no
// signal — this lets someone keep recording expenses on-site and have
// them actually reach the database automatically the next time the
// device gets a connection, with no "retry" button to remember to press.
//
// Deliberately scoped to just one write type: adding a new entry. Editing
// and deleting still need a live connection (they act on a real row that
// already exists server-side, and reconciling an offline edit/delete
// against whatever else may have changed a project in the meantime is a
// materially harder problem than "add this new line" — not attempted
// here, see README's Offline support section).
//
// Scoped per signed-in user (the key includes their id) so switching
// accounts on a shared device can't leak one person's queued entries into
// another's, and so a leftover queue from a previous offline session is
// still there — and still tied to the right account — after a reload.

const KEY_PREFIX = 'offline-outbox:'

function readAll(userId) {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + userId)
    return raw ? JSON.parse(raw) : []
  } catch {
    // Corrupt JSON shouldn't happen, but a stray manual edit to
    // localStorage isn't worth crashing the app over — treat it as empty.
    return []
  }
}

function writeAll(userId, queue) {
  localStorage.setItem(KEY_PREFIX + userId, JSON.stringify(queue))
}

export function loadQueue(userId) {
  return readAll(userId)
}

export function queueLength(userId) {
  return readAll(userId).length
}

// entry: the same shape App.jsx would otherwise pass to storage.addEntry.
export function enqueue(userId, projectId, entry) {
  const item = {
    localId: `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    projectId,
    entry,
    queuedAt: new Date().toISOString(),
  }
  const queue = readAll(userId)
  queue.push(item)
  writeAll(userId, queue)
  return item
}

export function dequeue(userId, localId) {
  writeAll(
    userId,
    readAll(userId).filter((item) => item.localId !== localId),
  )
}
