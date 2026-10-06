import { useState } from 'react'
import { Archive, Settings, User, Users, LogOut, MoreHorizontal } from 'lucide-react'
import BrandMark from './BrandMark'

// The "..." overflow menu — Λογαριασμός + Έξοδος, the two least-frequent
// actions in the header (see this component's own top comment for why
// those two specifically). Plain local state + a full-screen invisible
// backdrop to catch an outside tap, not a new dependency — this app has
// no popover/menu library anywhere else, and one dropdown doesn't justify
// adding one.
function OverflowMenu({ onOpenAccount, onSignOut }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-stone-500 active:bg-stone-200 p-3 rounded-lg"
        aria-label="Περισσότερα"
        aria-expanded={open}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <>
          {/* Catches the outside tap that closes the menu — sits below
              the menu itself (z-10 vs. z-20) but above everything else
              on the page, same layering idea as every modal's own
              backdrop elsewhere in this app. */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white rounded-2xl shadow-modal py-1 z-20 min-w-[180px]">
            <button
              onClick={() => {
                setOpen(false)
                onOpenAccount()
              }}
              className="w-full text-left px-4 py-3 text-sm flex items-center gap-2.5 active:bg-stone-100"
            >
              <User size={16} className="text-stone-400" />
              Λογαριασμός
            </button>
            <button
              onClick={() => {
                setOpen(false)
                onSignOut()
              }}
              className="w-full text-left px-4 py-3 text-sm flex items-center gap-2.5 active:bg-stone-100 text-rose-600"
            >
              <LogOut size={16} />
              Έξοδος
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// Slimmed down from four right-side items to two direct icons plus this
// overflow menu — Ρυθμίσεις έργου (only relevant inside a project) and
// Πελατολόγιο (the one truly global nav item) are frequent/contextual
// enough to stay one tap away; Λογαριασμός and Έξοδος are both rare
// (account/billing is a once-in-a-while check, signing out is the literal
// end of a session) and move into "...". Every icon button here uses
// p-3 (12px padding around a 16px icon = 40px tap target), not the
// p-2.5 this used before — this pass's own 40px-minimum tap-target rule.
export default function Header({
  activeProject,
  showOverview,
  showClients,
  onGoHome,
  onOpenProjectSettings,
  onOpenClients,
  onOpenAccount,
  onSignOut,
}) {
  const inProject = !showOverview && !showClients && Boolean(activeProject)

  return (
    <div className="sticky top-0 bg-stone-50 shadow-header px-4 py-3 flex items-center gap-1 z-10">
      {inProject ? (
        // Bigger tap target than the icon itself (see the same pattern
        // below) — these are hit often, one-handed, sometimes gloved, not
        // just technically clickable.
        <button
          onClick={onGoHome}
          className="text-rust-700 shrink-0 p-3 -ml-3 rounded-lg active:bg-stone-200"
          aria-label="Όλα τα έργα"
        >
          <BrandMark className="w-6 h-6" />
        </button>
      ) : (
        <BrandMark className="w-6 h-6 text-rust-700 shrink-0 ml-1" />
      )}
      <div className="flex-1 min-w-0 ml-1.5">
        {inProject ? (
          <>
            <div className="font-display font-bold text-lg truncate flex items-center gap-1.5">
              <span className="truncate">{activeProject.name}</span>
              {activeProject.role && activeProject.role !== 'owner' && (
                <span className="text-sm px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium shrink-0">
                  Συνεργασία
                </span>
              )}
              {activeProject.archivedAt && (
                <span className="text-sm px-2 py-0.5 rounded-full bg-stone-200 text-stone-600 font-medium shrink-0 inline-flex items-center gap-1">
                  <Archive size={11} />
                  Αρχειοθετημένο
                </span>
              )}
            </div>
            {activeProject.location && (
              <div className="text-sm text-stone-500 truncate">{activeProject.location}</div>
            )}
          </>
        ) : (
          <div className="font-display font-bold text-lg">{showClients ? 'Πελατολόγιο' : 'Διαχείριση Έργου'}</div>
        )}
      </div>
      {inProject && (
        <button
          onClick={onOpenProjectSettings}
          className="text-stone-500 active:bg-stone-200 shrink-0 p-3 rounded-lg"
          aria-label="Ρυθμίσεις έργου"
        >
          <Settings className="w-4 h-4" />
        </button>
      )}
      <button
        onClick={onOpenClients}
        className="text-stone-500 active:bg-stone-200 shrink-0 p-3 rounded-lg"
        aria-label="Πελατολόγιο"
      >
        <Users className="w-4 h-4" />
      </button>
      <OverflowMenu onOpenAccount={onOpenAccount} onSignOut={onSignOut} />
    </div>
  )
}
