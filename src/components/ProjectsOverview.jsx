import { MapPin, Plus, Users } from 'lucide-react'
import { formatEUR } from '../lib/format'

// One card per project — name, location, profit/loss, and outstanding
// amount, so the user can tell what needs attention before drilling into
// any one project. summaries is keyed by project id; a project with no
// entries yet just isn't in it (see storage.getProjectSummaries).
export default function ProjectsOverview({ projects, summaries, onSelectProject, onNewProject }) {
  return (
    <div className="p-4 pb-24">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-stone-700">Τα έργα μου</h2>
        <button
          onClick={onNewProject}
          className="text-xs text-orange-700 font-medium flex items-center gap-0.5"
        >
          <Plus size={13} />
          Νέο έργο
        </button>
      </div>

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
                <span className="font-semibold truncate">{p.name}</span>
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
              <div className="flex items-center gap-3 flex-wrap">
                <div>
                  <div className="text-[11px] text-stone-400">Κέρδος / Ζημία</div>
                  <div
                    className={
                      'text-sm font-semibold ' + (profit >= 0 ? 'text-emerald-700' : 'text-rose-700')
                    }
                  >
                    {formatEUR(profit)}
                  </div>
                </div>
                {summary.pendingAmount > 0 && (
                  <div>
                    <div className="text-[11px] text-stone-400">Εκκρεμή</div>
                    <div className="text-sm font-semibold text-amber-800">
                      {formatEUR(summary.pendingAmount)}
                    </div>
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
