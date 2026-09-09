import { Archive, HardHat, Settings, User, LogOut } from 'lucide-react'

export default function Header({
  activeProject,
  showOverview,
  onGoHome,
  onOpenProjectSettings,
  onOpenAccount,
  onSignOut,
}) {
  const inProject = !showOverview && Boolean(activeProject)

  return (
    <div className="sticky top-0 bg-stone-50 border-b border-stone-200 px-4 py-3 flex items-center gap-1.5 z-10">
      {inProject ? (
        // Bigger tap target than the icon itself (see the same pattern
        // below) — these are hit often, one-handed, sometimes gloved, not
        // just technically clickable.
        <button
          onClick={onGoHome}
          className="text-orange-700 shrink-0 p-2.5 -ml-2.5 rounded-lg active:bg-stone-200"
          aria-label="Όλα τα έργα"
        >
          <HardHat className="w-5 h-5" strokeWidth={2.25} />
        </button>
      ) : (
        <HardHat className="w-5 h-5 text-orange-700 shrink-0" strokeWidth={2.25} />
      )}
      <div className="flex-1 min-w-0 ml-1">
        {inProject ? (
          <>
            <div className="font-display font-bold text-lg truncate flex items-center gap-1.5">
              <span className="truncate">{activeProject.name}</span>
              {activeProject.role && activeProject.role !== 'owner' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium shrink-0">
                  Συνεργασία
                </span>
              )}
              {activeProject.archivedAt && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-200 text-stone-600 font-medium shrink-0 inline-flex items-center gap-0.5">
                  <Archive size={9} />
                  Αρχειοθετημένο
                </span>
              )}
            </div>
            {activeProject.location && (
              <div className="text-xs text-stone-500 truncate">{activeProject.location}</div>
            )}
          </>
        ) : (
          <div className="font-display font-bold text-lg">Διαχείριση Έργου</div>
        )}
      </div>
      {inProject && (
        <button
          onClick={onOpenProjectSettings}
          className="text-stone-500 active:bg-stone-200 shrink-0 p-2.5 rounded-lg"
          aria-label="Ρυθμίσεις έργου"
        >
          <Settings className="w-4 h-4" />
        </button>
      )}
      <button
        onClick={onOpenAccount}
        className="text-stone-500 active:bg-stone-200 shrink-0 p-2.5 rounded-lg"
        aria-label="Λογαριασμός"
      >
        <User className="w-4 h-4" />
      </button>
      <button
        onClick={onSignOut}
        className="text-stone-500 active:bg-stone-200 shrink-0 flex items-center gap-1 text-xs py-2.5 px-2 rounded-lg"
      >
        <LogOut className="w-3.5 h-3.5" />
        Έξοδος
      </button>
    </div>
  )
}
