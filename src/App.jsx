import { useEffect, useState } from 'react'
import Header from './components/Header'
import EmptyState from './components/EmptyState'
import DashboardSummary from './components/DashboardSummary'
import EntryList from './components/EntryList'
import NewProjectModal from './components/NewProjectModal'
import QuickAddModal from './components/QuickAddModal'
import ProjectSettingsModal from './components/ProjectSettingsModal'
import * as storage from './lib/storage'

export default function App({ onSignOut }) {
  const [projects, setProjects] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showNewProject, setShowNewProject] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)
  const [showProjectSettings, setShowProjectSettings] = useState(false)

  // Initial load, once, on sign-in. (App only mounts once AuthGate has a
  // session, so there's no need to react to auth state changes here.)
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const list = await storage.getProjects()
        if (cancelled) return
        setProjects(list)
        if (list.length) {
          setActiveId(list[0].id)
          const entryList = await storage.getEntries(list[0].id)
          if (cancelled) return
          setEntries(entryList)
        }
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
  }, [])

  async function switchProject(id) {
    setActiveId(id)
    try {
      setEntries(await storage.getEntries(id))
    } catch (err) {
      setError(err.message || 'Σφάλμα φόρτωσης καταχωρήσεων')
    }
  }

  // Throws on failure — NewProjectModal awaits this and shows the error
  // itself, so the modal stays open with what the user typed.
  async function createProject({ name, location }) {
    const project = await storage.addProject({ name, location })
    setProjects((list) => [project, ...list])
    await switchProject(project.id)
  }

  // Same contract: throws on failure, QuickAddModal displays it. Handles
  // both add and edit — which one depends on whether editingEntry is set
  // when the modal was opened (see openQuickAdd/openEditEntry below).
  async function saveEntry(fields) {
    if (editingEntry) {
      const saved = await storage.updateEntry(editingEntry.id, fields)
      setEntries((list) => list.map((e) => (e.id === saved.id ? saved : e)))
    } else {
      const saved = await storage.addEntry(activeId, fields)
      setEntries((list) => [saved, ...list])
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

  async function deleteEntry(id) {
    try {
      await storage.deleteEntry(id)
      setEntries((list) => list.filter((e) => e.id !== id))
    } catch (err) {
      setError(err.message || 'Η διαγραφή απέτυχε')
    }
  }

  // Throws on failure — ProjectSettingsModal displays it.
  async function updateProject(fields) {
    const saved = await storage.updateProject(activeId, fields)
    setProjects((list) => list.map((p) => (p.id === saved.id ? saved : p)))
  }

  // Throws on failure — ProjectSettingsModal displays it.
  async function removeProject() {
    await storage.deleteProject(activeId)
    const remaining = projects.filter((p) => p.id !== activeId)
    setProjects(remaining)
    if (remaining.length) {
      await switchProject(remaining[0].id)
    } else {
      setActiveId(null)
      setEntries([])
    }
  }

  const income = entries.filter((e) => e.kind === 'income').reduce((s, e) => s + e.amount, 0)
  const expense = entries.filter((e) => e.kind === 'expense').reduce((s, e) => s + e.amount, 0)
  const profit = income - expense
  const activeProject = projects.find((p) => p.id === activeId)

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
            ×
          </button>
        </div>
      )}

      <Header
        activeProject={activeProject}
        projects={projects}
        activeId={activeId}
        onSwitchProject={switchProject}
        onOpenProjectSettings={() => setShowProjectSettings(true)}
        onSignOut={onSignOut}
      />

      {!activeProject ? (
        <EmptyState onNewProject={() => setShowNewProject(true)} />
      ) : (
        <div className="p-4 pb-24">
          <DashboardSummary income={income} expense={expense} profit={profit} />

          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-stone-700">Καταχωρήσεις</h3>
            <button
              onClick={() => setShowNewProject(true)}
              className="text-xs text-orange-700 font-medium"
            >
              + Νέο έργο
            </button>
          </div>

          <EntryList entries={entries} onEdit={openEditEntry} onDelete={deleteEntry} />
        </div>
      )}

      {activeProject && (
        <button
          onClick={openQuickAdd}
          className="fixed bottom-5 right-5 bg-orange-700 text-white rounded-full w-14 h-14 shadow-lg flex items-center justify-center text-2xl leading-none"
          style={{ maxWidth: '28rem' }}
          aria-label="Νέα καταχώρηση"
        >
          +
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
        />
      )}

      {showProjectSettings && activeProject && (
        <ProjectSettingsModal
          project={activeProject}
          onClose={() => setShowProjectSettings(false)}
          onSave={updateProject}
          onDelete={removeProject}
        />
      )}
    </div>
  )
}
