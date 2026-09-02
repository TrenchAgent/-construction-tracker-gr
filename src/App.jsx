import { useState } from 'react'
import Header from './components/Header'
import EmptyState from './components/EmptyState'
import DashboardSummary from './components/DashboardSummary'
import EntryList from './components/EntryList'
import NewProjectModal from './components/NewProjectModal'
import QuickAddModal from './components/QuickAddModal'
import { getProjects, saveProjects, getEntries, saveEntries } from './lib/storage'

export default function App() {
  const [projects, setProjects] = useState(() => getProjects())
  const [activeId, setActiveId] = useState(() => {
    const list = getProjects()
    return list.length ? list[0].id : null
  })
  const [entries, setEntries] = useState(() => getEntries(activeId))
  const [showNewProject, setShowNewProject] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)

  function switchProject(id) {
    setActiveId(id)
    setEntries(getEntries(id))
  }

  function createProject({ name, location }) {
    const project = { id: 'p_' + Date.now(), name, location }
    const list = [project, ...projects]
    setProjects(list)
    saveProjects(list)
    switchProject(project.id)
    setShowNewProject(false)
  }

  function addEntry(entry) {
    const list = [{ id: 'e_' + Date.now(), ...entry }, ...entries]
    setEntries(list)
    saveEntries(activeId, list)
    setShowQuickAdd(false)
  }

  function deleteEntry(id) {
    const list = entries.filter((e) => e.id !== id)
    setEntries(list)
    saveEntries(activeId, list)
  }

  const income = entries.filter((e) => e.kind === 'income').reduce((s, e) => s + e.amount, 0)
  const expense = entries.filter((e) => e.kind === 'expense').reduce((s, e) => s + e.amount, 0)
  const profit = income - expense
  const activeProject = projects.find((p) => p.id === activeId)

  return (
    <div
      className="max-w-md mx-auto bg-stone-50 min-h-screen text-stone-900"
      style={{ fontFamily: 'system-ui, sans-serif' }}
    >
      <Header
        activeProject={activeProject}
        projects={projects}
        activeId={activeId}
        onSwitchProject={switchProject}
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

          <EntryList entries={entries} onDelete={deleteEntry} />
        </div>
      )}

      {activeProject && (
        <button
          onClick={() => setShowQuickAdd(true)}
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
        <QuickAddModal onClose={() => setShowQuickAdd(false)} onSave={addEntry} />
      )}
    </div>
  )
}
