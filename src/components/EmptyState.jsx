import { HardHat, Plus } from 'lucide-react'

// Shown only when this user has zero projects at all — not the same as
// "the active list is empty" (see ProjectsOverview's own message for
// "everything's archived"). isFirstRun further splits that into "never
// created one" (a real explanation of what the app does, since they've
// never seen it) vs. "deleted their last one" (a returning user who
// already knows — a short prompt, not the same pitch again).
export default function EmptyState({ isFirstRun, onNewProject }) {
  return (
    <div className="p-8 text-center mt-16">
      <HardHat size={40} strokeWidth={1.75} className="mx-auto text-orange-700 mb-3" />
      <h2 className="font-semibold text-lg mb-1">
        {isFirstRun ? 'Καλώς ήρθατε στη Διαχείριση Έργου' : 'Ξεκινήστε ένα νέο έργο'}
      </h2>
      {isFirstRun ? (
        <p className="text-sm text-stone-500 mb-5 max-w-xs mx-auto">
          Καταγράφετε έσοδα και έξοδα ξεχωριστά για κάθε έργο κατασκευής —
          τι πληρώσατε, τι εισπράξατε, τι εκκρεμεί ακόμα. Λειτουργεί και
          χωρίς σύνδεση στο εργοτάξιο. Ξεκινήστε δημιουργώντας το πρώτο
          σας έργο.
        </p>
      ) : (
        <p className="text-sm text-stone-500 mb-5">Δεν έχετε κανένα έργο αυτή τη στιγμή.</p>
      )}
      <button
        onClick={onNewProject}
        className="bg-orange-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm inline-flex items-center gap-1.5"
      >
        <Plus className="w-4 h-4" />
        Νέο έργο
      </button>
    </div>
  )
}
