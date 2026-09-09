import { ArchiveRestore, ChevronLeft, MapPin } from 'lucide-react'

// Reachable only via the "Αρχειοθετημένα έργα" link on the overview
// screen (see ProjectsOverview) — a lightweight sub-view, not a full
// second screen with its own header/navigation state, since it's a
// rarely-visited corner of the app. Data here is exactly as real and
// complete as an active project's — archiving only changes where a
// project shows up, never what it contains.
export default function ArchivedProjects({ projects, onBack, onSelectProject, onRestore }) {
  const sorted = [...projects].sort((a, b) => (a.archivedAt < b.archivedAt ? 1 : -1))
  return (
    <div className="p-4 pb-24">
      <button
        onClick={onBack}
        className="text-xs text-stone-500 flex items-center gap-1 mb-3 py-2.5 -my-2.5 -ml-1.5 px-1.5 rounded-lg active:bg-stone-100"
      >
        <ChevronLeft size={14} />
        Πίσω στα έργα μου
      </button>
      <h2 className="font-display font-bold text-lg text-stone-800 mb-3">Αρχειοθετημένα έργα</h2>

      {sorted.length === 0 ? (
        <div className="text-sm text-stone-400 text-center py-10">Δεν υπάρχουν αρχειοθετημένα έργα.</div>
      ) : (
        <div className="space-y-2">
          {sorted.map((p) => (
            <div key={p.id} className="bg-white border border-stone-200 rounded-xl p-4">
              <button onClick={() => onSelectProject(p.id)} className="w-full text-left">
                <div className="font-display font-bold text-lg truncate mb-0.5">{p.name}</div>
                {p.location && (
                  <div className="text-xs text-stone-500 flex items-center gap-1">
                    <MapPin size={12} />
                    {p.location}
                  </div>
                )}
              </button>
              <button
                onClick={() => onRestore(p.id)}
                className="mt-2.5 w-full border border-stone-300 text-stone-700 rounded-lg py-2.5 text-xs font-medium inline-flex items-center justify-center gap-1.5 active:bg-stone-50"
              >
                <ArchiveRestore size={13} />
                Επαναφορά στα ενεργά έργα
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
