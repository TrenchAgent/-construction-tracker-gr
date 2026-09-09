import { Archive, MapPin, Plus, Users } from 'lucide-react'
import { formatEUR } from '../lib/format'

// One card per project — name, location, profit/loss, and outstanding
// amount, so the user can tell what needs attention before drilling into
// any one project. summaries is keyed by project id; a project with no
// entries yet just isn't in it (see storage.getProjectSummaries).
// `projects` here is already the active (non-archived) list — archivedCount
// only drives whether the link to the separate archived section shows up.
export default function ProjectsOverview({
  projects,
  summaries,
  onSelectProject,
  onNewProject,
  archivedCount,
  onShowArchived,
}) {
  return (
    <div className="p-4 pb-24">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-bold text-lg text-stone-800">Τα έργα μου</h2>
        <button
          onClick={onNewProject}
          className="text-xs text-rust-700 font-medium flex items-center gap-0.5"
        >
          <Plus size={13} />
          Νέο έργο
        </button>
      </div>

      {/* All this user's projects are archived (not the same as never
          having created one — see EmptyState/App.jsx for that case) —
          say so plainly rather than showing a silently empty list. */}
      {projects.length === 0 && archivedCount > 0 && (
        <div className="text-sm text-stone-400 text-center py-6">
          Όλα τα έργα σας είναι αρχειοθετημένα.
        </div>
      )}

      <div className="space-y-2">
        {projects.map((p) => {
          const summary = summaries.get(p.id) || { income: 0, expense: 0, pendingAmount: 0 }
          const profit = summary.income - summary.expense
          return (
            <button
              key={p.id}
              onClick={() => onSelectProject(p.id)}
              className="w-full text-left bg-white border border-stone-200 rounded-xl p-4 active:bg-stone-50"
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="font-display font-bold text-lg truncate">{p.name}</span>
                {p.role !== 'owner' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium shrink-0 inline-flex items-center gap-0.5">
                    <Users size={10} />
                    Συνεργασία
                  </span>
                )}
              </div>
              {p.location && (
                <div className="text-xs text-stone-500 flex items-center gap-1 mb-2.5">
                  <MapPin size={12} />
                  {p.location}
                </div>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <div className={'rounded-lg px-2.5 py-1.5 ' + (profit >= 0 ? 'bg-emerald-50' : 'bg-rose-50')}>
                  <div className={'text-[10px] font-medium ' + (profit >= 0 ? 'text-emerald-800' : 'text-rose-800')}>
                    Κέρδος / Ζημία
                  </div>
                  <div
                    className={
                      'font-display font-bold text-lg tabular-nums ' +
                      (profit >= 0 ? 'text-emerald-800' : 'text-rose-800')
                    }
                  >
                    {formatEUR(profit)}
                  </div>
                </div>
                {summary.pendingAmount > 0 && (
                  <div className="rounded-lg px-2.5 py-1.5 bg-amber-50">
                    <div className="text-[10px] font-medium text-amber-900">Εκκρεμή</div>
                    <div className="font-display font-bold text-lg tabular-nums text-amber-900">
                      {formatEUR(summary.pendingAmount)}
                    </div>
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {archivedCount > 0 && (
        <button
          onClick={onShowArchived}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-stone-500 py-3 mt-2"
        >
          <Archive size={13} />
          Αρχειοθετημένα έργα ({archivedCount})
        </button>
      )}
    </div>
  )
}
