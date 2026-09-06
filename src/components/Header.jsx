import { HardHat, Settings, User, LogOut } from 'lucide-react'

export default function Header({
  activeProject,
  projects,
  activeId,
  onSwitchProject,
  onOpenProjectSettings,
  onOpenAccount,
  onSignOut,
}) {
  return (
    <div className="sticky top-0 bg-stone-50 border-b border-stone-200 px-4 py-3 flex items-center gap-1.5 z-10">
      <HardHat className="w-5 h-5 text-orange-700 shrink-0" strokeWidth={2.25} />
      <div className="flex-1 min-w-0 ml-1">
        {activeProject ? (
          <>
            <div className="font-semibold truncate flex items-center gap-1.5">
              <span className="truncate">{activeProject.name}</span>
              {activeProject.role && activeProject.role !== 'owner' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium shrink-0">
                  Συνεργασία
                </span>
              )}
            </div>
            {activeProject.location && (
              <div className="text-xs text-stone-500 truncate">{activeProject.location}</div>
            )}
          </>
        ) : (
          <div className="font-semibold">Διαχείριση Έργου</div>
        )}
      </div>
      {activeProject && (
        <button
          onClick={onOpenProjectSettings}
          className="text-stone-400 hover:text-stone-600 hover:bg-stone-200/60 shrink-0 p-1.5 rounded-lg"
          aria-label="Ρυθμίσεις έργου"
        >
          <Settings className="w-4 h-4" />
        </button>
      )}
      {projects.length > 1 && (
        <select
          className="text-xs border border-stone-300 rounded-lg px-2 py-1 bg-white max-w-[110px]"
          value={activeId || ''}
          onChange={(e) => onSwitchProject(e.target.value)}
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}
      <button
        onClick={onOpenAccount}
        className="text-stone-400 hover:text-stone-600 hover:bg-stone-200/60 shrink-0 p-1.5 rounded-lg"
        aria-label="Λογαριασμός"
      >
        <User className="w-4 h-4" />
      </button>
      <button
        onClick={onSignOut}
        className="text-stone-400 hover:text-stone-600 shrink-0 flex items-center gap-1 text-xs p-1.5"
      >
        <LogOut className="w-3.5 h-3.5" />
        Έξοδος
      </button>
    </div>
  )
}
