import { useEffect, useRef, useState } from 'react'
import { X, WifiOff, Plus } from 'lucide-react'
import Header from './components/Header'
import EmptyState from './components/EmptyState'
import ProjectsOverview from './components/ProjectsOverview'
import DashboardSummary from './components/DashboardSummary'
import TimeBreakdown from './components/TimeBreakdown'
import EntryList from './components/EntryList'
import EntryFilterBar from './components/EntryFilterBar'
import { EMPTY_FILTERS, applyEntryFilters, isFilterActive } from './lib/entryFilters'
import NewProjectModal from './components/NewProjectModal'
import QuickAddModal from './components/QuickAddModal'
import ProjectSettingsModal from './components/ProjectSettingsModal'
import AccountModal from './components/AccountModal'
import UndoToast from './components/UndoToast'
import * as storage from './lib/storage'
import * as outbox from './lib/outbox'
import { entriesToCsv, slugifyFilename, downloadCsv } from './lib/csv'

// How long a delete stays undoable before it's actually sent to the
// server. Not just a visual delay — the real delete call itself doesn't
// happen until this expires (see startPendingDelete/finalizePendingDelete
// below), so "Undo" genuinely means "never send it," not "put back
// something already gone."
const UNDO_WINDOW_MS = 5000

// A network-layer failure (no connection at all) looks different from a
// real server rejection (bad data, RLS denial, etc.) — supabase-js's
// underlying fetch call throws something like "Failed to fetch" (Chrome),
// "NetworkError when attempting to fetch resource" (Firefox), or "Load
// failed" (Safari) when it can't even reach the server. Checking
// navigator.onLine first covers the common case cheaply; this is the
// fallback for a request that was already in flight when the connection
// dropped.
function isLikelyOffline(err) {
  if (!navigator.onLine) return true
  const msg = String(err?.message || '').toLowerCase()
  return msg.includes('failed to fetch') || msg.includes('network') || msg.includes('load failed')
}

// Read once at module load, before anything strips it from the URL —
// Stripe Checkout redirects back to /?checkout=success or
// /?checkout=cancelled (see create-checkout-session.js).
const checkoutParam = new URLSearchParams(window.location.search).get('checkout')

// Attaches a `role` to each project: 'owner' if the current user created
// it, otherwise whatever role their collaborator invite grants. This is
// purely for the UI (show/hide edit controls) — the real enforcement is
// server-side RLS, so getting this wrong would be a UX annoyance, not a
// security hole.
function attachRoles(rawProjects, myCollaborations, currentUserId) {
  const roleByProjectId = new Map(myCollaborations.map((c) => [c.project_id, c.role]))
  return rawProjects.map((p) => ({
    ...p,
    role: p.ownerId === currentUserId ? 'owner' : (roleByProjectId.get(p.id) ?? 'viewer'),
  }))
}

export default function App({ session, onSignOut }) {
  const [projects, setProjects] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showNewProject, setShowNewProject] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)
  const [showProjectSettings, setShowProjectSettings] = useState(false)
  const [showAccount, setShowAccount] = useState(checkoutParam === 'success')
  const [pendingCount, setPendingCount] = useState(0)
  // Shown before any single project is picked — see ProjectsOverview.jsx.
  // Starts true; the initial-load effect below only flips it once it
  // knows whether there's actually anything to show an overview OF.
  const [showOverview, setShowOverview] = useState(true)
  const [summaries, setSummaries] = useState(new Map())
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  // { kind: 'entry' | 'project', id, label, timeoutId } | null — see
  // startPendingDelete/finalizePendingDelete/undoPendingDelete below.
  // Only one at a time: a second delete while one's still pending
  // finalizes the first immediately rather than stacking undo windows.
  const [pendingDelete, setPendingDelete] = useState(null)
  const pendingDeleteRef = useRef(null)
  useEffect(() => {
    pendingDeleteRef.current = pendingDelete
  }, [pendingDelete])

  // flushOutbox (below) is called from the 'online' event listener, which
  // can fire long after the render that registered it — a plain closure
  // over activeId would see whatever project was active back then, not
  // whatever's active now. A ref sidesteps that without re-registering
  // the listener on every project switch.
  const activeIdRef = useRef(activeId)
  useEffect(() => {
    activeIdRef.current = activeId
  }, [activeId])

  // Any entries queued locally for this project (added while offline,
  // not yet synced) go at the top, shown immediately, ahead of whatever
  // storage.getEntries() already knows about.
  function mergeQueuedIntoEntries(projectId, freshEntries) {
    const queued = outbox.loadQueue(session.user.id).filter((item) => item.projectId === projectId)
    const placeholders = queued.map((item) => ({ ...item.entry, id: item.localId, pendingSync: true }))
    return [...placeholders, ...freshEntries]
  }

  function queueEntryLocally(fields) {
    const item = outbox.enqueue(session.user.id, activeId, fields)
    setEntries((list) => [{ ...fields, id: item.localId, pendingSync: true }, ...list])
    setPendingCount((n) => n + 1)
  }

  // Walks the queue in order and tries to actually save each one.
  // Called on mount (in case a previous offline session left entries
  // queued and we're already online by the time this loads), and again
  // every time the browser reports the connection came back — no manual
  // "retry" button anywhere in the UI.
  async function flushOutbox() {
    const queue = outbox.loadQueue(session.user.id)
    for (const item of queue) {
      // This item is mid-undo-window for its own deletion — leave it
      // queued and skip it this pass. Syncing it now would race the
      // pending delete: it'd get a real id just as (or after) the undo
      // window finalizes a delete keyed to the old local id, and either
      // silently reappear on undo (already re-synced under a new id the
      // undo doesn't know about) or leave a freshly-synced row nothing
      // ever deletes. Simplest correct fix is to just wait it out — the
      // next flush (undone, or the item's already gone) picks it up clean.
      if (pendingDeleteRef.current?.kind === 'entry' && pendingDeleteRef.current.id === item.localId) {
        continue
      }
      try {
        const saved = await storage.addEntry(item.projectId, item.entry)
        outbox.dequeue(session.user.id, item.localId)
        if (item.projectId === activeIdRef.current) {
          setEntries((list) => list.map((e) => (e.id === item.localId ? saved : e)))
        }
      } catch (err) {
        if (isLikelyOffline(err)) {
          // Still offline (or dropped again mid-flush) — stop here rather
          // than hammering a dead connection through the rest of the
          // queue. The next 'online' event will pick up where this left off.
          break
        }
        // A genuine server-side rejection (e.g. access to that project
        // was revoked while this device was offline). Retrying forever
        // won't fix that — drop it from the queue, but don't silently
        // vanish it from view either: flag it so it's obviously unsaved.
        outbox.dequeue(session.user.id, item.localId)
        if (item.projectId === activeIdRef.current) {
          setEntries((list) =>
            list.map((e) => (e.id === item.localId ? { ...e, pendingSync: false, syncFailed: true } : e)),
          )
        }
      }
    }
    setPendingCount(outbox.queueLength(session.user.id))
  }

  useEffect(() => {
    flushOutbox()
    window.addEventListener('online', flushOutbox)
    return () => window.removeEventListener('online', flushOutbox)
    // Deliberately only re-runs if the signed-in user changes — flushOutbox
    // itself always reads current state via refs/storage, not stale closures.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.user.id])

  // Clean the ?checkout=... param out of the URL once, on mount, so a
  // page refresh doesn't re-trigger the "just checked out" polling logic
  // in AccountModal.
  useEffect(() => {
    if (checkoutParam) {
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  // Initial load, once, on sign-in. (App only mounts once AuthGate has a
  // session, so there's no need to react to auth state changes here.)
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [rawProjects, myCollaborations, projectSummaries] = await Promise.all([
          storage.getProjects(),
          storage.getMyCollaborations(session.user.email),
          storage.getProjectSummaries(),
        ])
        if (cancelled) return
        const list = attachRoles(rawProjects, myCollaborations, session.user.id)
        setProjects(list)
        setSummaries(projectSummaries)
        // Land on the overview whenever there's anything to show on it —
        // no auto-picking a "first" project and fetching its entries
        // before the user has actually chosen to look at it.
        setShowOverview(list.length > 0)
        setPendingCount(outbox.queueLength(session.user.id))
      } catch (err) {
        if (!cancelled) setError(err.message || 'Σφάλμα φόρτωσης δεδομένων')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // mergeQueuedIntoEntries only closes over session.user.id, already listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.user.id, session.user.email])

  async function switchProject(id) {
    setActiveId(id)
    setShowOverview(false)
    setFilters(EMPTY_FILTERS) // a filter set on one project isn't likely to mean anything on another
    try {
      const fresh = await storage.getEntries(id)
      setEntries(mergeQueuedIntoEntries(id, fresh))
    } catch (err) {
      // Can't reach the server for this project's real entries (e.g. no
      // connection right now) — still show whatever's queued locally for
      // it rather than an empty list, since those are real, just unsynced.
      setEntries(mergeQueuedIntoEntries(id, []))
      setError(err.message || 'Σφάλμα φόρτωσης καταχωρήσεων')
    }
  }

  // Re-fetches summaries on the way back — whatever was just added/edited/
  // deleted in the project the user's leaving should already be reflected
  // on its card, not stale until the next full reload.
  async function goToOverview() {
    setShowOverview(true)
    try {
      setSummaries(await storage.getProjectSummaries())
    } catch (err) {
      setError(err.message || 'Σφάλμα φόρτωσης έργων')
    }
  }

  // Throws on failure — NewProjectModal awaits this and shows the error
  // itself, so the modal stays open with what the user typed.
  async function createProject({ name, location }) {
    const project = await storage.addProject({ name, location })
    setProjects((list) => [{ ...project, role: 'owner' }, ...list])
    await switchProject(project.id)
  }

  // Same contract: throws on failure, QuickAddModal displays it. Handles
  // both add and edit — which one depends on whether editingEntry is set
  // when the modal was opened (see openQuickAdd/openEditEntry below).
  //
  // Editing still requires a live connection — it acts on a row that
  // already exists server-side (see outbox.js for why that's out of scope
  // for the offline queue). Adding a new entry is the one write that
  // stays usable with no signal: if we're offline, or the request fails
  // because we just went offline mid-request, queue it locally instead of
  // showing an error — from the user's point of view it saved.
  async function saveEntry(fields) {
    if (editingEntry) {
      const saved = await storage.updateEntry(editingEntry.id, fields)
      setEntries((list) => list.map((e) => (e.id === saved.id ? saved : e)))
      return
    }

    if (!navigator.onLine) {
      queueEntryLocally(fields)
      return
    }

    try {
      const saved = await storage.addEntry(activeId, fields)
      setEntries((list) => [saved, ...list])
    } catch (err) {
      if (isLikelyOffline(err)) {
        queueEntryLocally(fields)
      } else {
        throw err
      }
    }
  }

  function openQuickAdd() {
    setEditingEntry(null)
    setShowQuickAdd(true)
  }

  function openEditEntry(entry) {
    setEditingEntry(entry)
    setShowQuickAdd(true)
  }

  // Throws on failure — QuickAddModal displays it. Only ever called for an
  // entry that's already editable (a real, synced row), so activeId here
  // is always the entry's actual project.
  async function attachReceipt(entryId, file) {
    const path = await storage.uploadReceipt(activeId, entryId, file)
    try {
      await storage.setEntryReceiptPath(entryId, path)
    } catch (err) {
      // The file made it to Storage but pointing the entry at it failed —
      // don't leave that file orphaned just because this second half did.
      await storage.deleteReceiptFile(path).catch(() => {})
      throw err
    }
    setEntries((list) => list.map((e) => (e.id === entryId ? { ...e, receiptPath: path } : e)))
    return path
  }

  // Throws on failure — QuickAddModal displays it.
  async function removeReceipt(entryId, path) {
    await storage.setEntryReceiptPath(entryId, null)
    await storage.deleteReceiptFile(path).catch(() => {}) // best-effort; the entry no longer points at it either way
    setEntries((list) => list.map((e) => (e.id === entryId ? { ...e, receiptPath: '' } : e)))
  }

  // Actually performs a deferred delete — called when its undo window
  // expires, or immediately if a new delete supersedes a still-pending
  // one. Nothing calls the real storage.delete* functions anywhere else;
  // this is the only place a delete becomes real and permanent.
  async function finalizePendingDelete(pending) {
    if (!pending) return
    if (pending.kind === 'entry') {
      if (String(pending.id).startsWith('local-')) {
        // Never made it to the server — nothing to delete remotely, just
        // drop it from the local queue for good.
        outbox.dequeue(session.user.id, pending.id)
        setEntries((list) => list.filter((e) => e.id !== pending.id))
        setPendingCount(outbox.queueLength(session.user.id))
        return
      }
      try {
        await storage.deleteEntry(pending.id)
        setEntries((list) => list.filter((e) => e.id !== pending.id))
      } catch (err) {
        setError(err.message || 'Η διαγραφή απέτυχε')
      }
    } else if (pending.kind === 'project') {
      try {
        await storage.deleteProject(pending.id)
        setProjects((list) => list.filter((p) => p.id !== pending.id))
        setSummaries((prev) => {
          const next = new Map(prev)
          next.delete(pending.id)
          return next
        })
      } catch (err) {
        setError(err.message || 'Η διαγραφή απέτυχε')
      }
    }
  }

  // Starts (or restarts) the undo window for one delete. The item stays
  // exactly where it is in state the whole time — see the render-time
  // visibleEntries/visibleProjects filters below — so "undo" is just
  // "never mind, forget this pending delete" with nothing to restore,
  // and a stale re-fetch mid-window (switching projects and back, e.g.)
  // can't accidentally revive something that's genuinely gone, because
  // nothing's gone yet.
  function startPendingDelete(kind, id, label) {
    if (pendingDeleteRef.current) {
      clearTimeout(pendingDeleteRef.current.timeoutId)
      finalizePendingDelete(pendingDeleteRef.current)
    }
    const timeoutId = setTimeout(() => {
      const current = pendingDeleteRef.current
      setPendingDelete(null)
      finalizePendingDelete(current)
    }, UNDO_WINDOW_MS)
    setPendingDelete({ kind, id, label, timeoutId })
  }

  function undoPendingDelete() {
    if (!pendingDeleteRef.current) return
    clearTimeout(pendingDeleteRef.current.timeoutId)
    setPendingDelete(null)
  }

  // Confirmation happens at the call site (EntryList has the entry's own
  // note/amount to put in the message) — by the time this runs, the user
  // has already said yes. This only starts the undo window; the actual
  // delete is deferred (see finalizePendingDelete).
  function deleteEntry(id) {
    const entry = entries.find((e) => e.id === id)
    startPendingDelete('entry', id, entry ? `Διαγράφηκε: «${entry.note}»` : 'Η καταχώρηση διαγράφηκε')
  }

  // Throws on failure — ProjectSettingsModal displays it.
  async function updateProject(fields) {
    const saved = await storage.updateProject(activeId, fields)
    setProjects((list) => list.map((p) => (p.id === saved.id ? { ...saved, role: p.role } : p)))
  }

  // Confirmation already happened in ProjectSettingsModal before this is
  // called. Goes back to the overview right away rather than auto-picking
  // some other project — deleting one is a "back to my project list"
  // moment — while the card itself stays hidden there (visibleProjects
  // below) until the undo window actually finalizes the delete.
  function removeProject() {
    startPendingDelete('project', activeId, `Διαγράφηκε: «${activeProject?.name}»`)
    setActiveId(null)
    setEntries([])
    if (projects.length > 1) {
      goToOverview()
    } else {
      setShowOverview(false) // nothing left to show an overview of — EmptyState instead
    }
  }

  function exportCsv() {
    const csv = entriesToCsv(visibleEntries)
    const today = new Date().toISOString().slice(0, 10)
    downloadCsv(`${slugifyFilename(activeProject.name)}-${today}.csv`, csv)
  }

  // All three throw on failure — ProjectSettingsModal displays it.
  async function loadCollaborators() {
    return storage.getCollaborators(activeId)
  }
  async function inviteCollaborator({ email, role }) {
    return storage.addCollaborator(activeId, { email, role })
  }
  async function removeCollaboratorById(id) {
    await storage.removeCollaborator(id)
  }

  // A pending-deleted entry/project stays in real state the whole undo
  // window (see startPendingDelete) and is only filtered out of what's
  // actually rendered/totaled here — that's what makes undo trivial and
  // safe against an unrelated re-fetch landing mid-window.
  const pendingDeleteEntryId = pendingDelete?.kind === 'entry' ? pendingDelete.id : null
  const pendingDeleteProjectId = pendingDelete?.kind === 'project' ? pendingDelete.id : null
  const visibleEntries = pendingDeleteEntryId
    ? entries.filter((e) => e.id !== pendingDeleteEntryId)
    : entries
  const visibleProjects = pendingDeleteProjectId
    ? projects.filter((p) => p.id !== pendingDeleteProjectId)
    : projects

  const income = visibleEntries.filter((e) => e.kind === 'income').reduce((s, e) => s + e.amount, 0)
  const expense = visibleEntries.filter((e) => e.kind === 'expense').reduce((s, e) => s + e.amount, 0)
  const profit = income - expense
  // "Outstanding" = not fully settled yet — pending or partially paid.
  // Applies across both income (money owed to you) and expenses (money
  // you owe), since both are equally real to track.
  const pendingAmount = visibleEntries
    .filter((e) => e.paymentStatus === 'pending' || e.paymentStatus === 'partial')
    .reduce((s, e) => s + e.amount, 0)
  const activeProject = projects.find((p) => p.id === activeId)
  const canEdit = activeProject && activeProject.role !== 'viewer'
  // Filtering only narrows what's shown in the list below — the totals
  // above (income/expense/profit/pending, time breakdown) always reflect
  // the whole project, not just whatever's currently filtered into view.
  const filteredEntries = applyEntryFilters(visibleEntries, filters)

  if (loading) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-stone-50 flex items-center justify-center text-stone-400 text-sm">
        Φόρτωση…
      </div>
    )
  }

  return (
    <div
      className="max-w-md mx-auto bg-stone-50 min-h-screen text-stone-900"
      style={{ fontFamily: 'system-ui, sans-serif' }}
    >
      {error && (
        <div className="bg-rose-50 text-rose-700 text-xs px-4 py-2 flex items-center gap-2 border-b border-rose-200">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="text-rose-400 shrink-0">
            <X size={14} />
          </button>
        </div>
      )}

      {pendingCount > 0 && (
        <div className="bg-amber-50 text-amber-800 text-xs px-4 py-2 border-b border-amber-200 flex items-center gap-1.5">
          <WifiOff size={13} className="shrink-0" />
          {pendingCount} {pendingCount === 1 ? 'καταχώρηση' : 'καταχωρήσεις'} σε αναμονή — θα
          συγχρονιστεί{pendingCount === 1 ? '' : 'ούν'} όταν επανέλθει το δίκτυο.
        </div>
      )}

      <Header
        activeProject={activeProject}
        showOverview={showOverview}
        onGoHome={goToOverview}
        onOpenProjectSettings={() => setShowProjectSettings(true)}
        onOpenAccount={() => setShowAccount(true)}
        onSignOut={onSignOut}
      />

      {projects.length === 0 ? (
        <EmptyState onNewProject={() => setShowNewProject(true)} />
      ) : showOverview ? (
        <ProjectsOverview
          projects={visibleProjects}
          summaries={summaries}
          onSelectProject={switchProject}
          onNewProject={() => setShowNewProject(true)}
        />
      ) : (
        <div className="p-4 pb-24">
          <DashboardSummary
            income={income}
            expense={expense}
            profit={profit}
            pendingAmount={pendingAmount}
          />

          <TimeBreakdown entries={visibleEntries} />

          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-stone-700">Καταχωρήσεις</h3>
            <button
              onClick={() => setShowNewProject(true)}
              className="text-xs text-orange-700 font-medium flex items-center gap-0.5"
            >
              <Plus size={13} />
              Νέο έργο
            </button>
          </div>

          {visibleEntries.length > 0 && <EntryFilterBar filters={filters} onChange={setFilters} />}

          <EntryList
            entries={filteredEntries}
            filtersActive={isFilterActive(filters)}
            canEdit={canEdit}
            onEdit={openEditEntry}
            onDelete={deleteEntry}
          />
        </div>
      )}

      {!showOverview && activeProject && canEdit && (
        <button
          onClick={openQuickAdd}
          className="fixed bottom-5 right-5 bg-orange-700 text-white rounded-full w-14 h-14 shadow-lg flex items-center justify-center"
          style={{ maxWidth: '28rem' }}
          aria-label="Νέα καταχώρηση"
        >
          <Plus size={26} />
        </button>
      )}

      {showNewProject && (
        <NewProjectModal onClose={() => setShowNewProject(false)} onCreate={createProject} />
      )}

      {showQuickAdd && (
        <QuickAddModal
          onClose={() => setShowQuickAdd(false)}
          onSave={saveEntry}
          editingEntry={editingEntry}
          onAttachReceipt={attachReceipt}
          onRemoveReceipt={removeReceipt}
        />
      )}

      {showProjectSettings && activeProject && (
        <ProjectSettingsModal
          project={activeProject}
          onClose={() => setShowProjectSettings(false)}
          onSave={updateProject}
          onDelete={removeProject}
          onExport={exportCsv}
          onLoadCollaborators={loadCollaborators}
          onInviteCollaborator={inviteCollaborator}
          onRemoveCollaborator={removeCollaboratorById}
        />
      )}

      {showAccount && (
        <AccountModal
          email={session.user.email}
          justCheckedOut={checkoutParam === 'success'}
          onClose={() => setShowAccount(false)}
        />
      )}

      <UndoToast pending={pendingDelete} onUndo={undoPendingDelete} durationMs={UNDO_WINDOW_MS} />
    </div>
  )
}
