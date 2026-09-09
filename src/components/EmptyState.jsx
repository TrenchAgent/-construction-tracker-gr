import { HardHat, Plus } from 'lucide-react'
import EmptyMoment from './EmptyMoment'

// Shown only when this user has zero projects at all — not the same as
// "the active list is empty" (see ProjectsOverview's own message for
// "everything's archived"). isFirstRun further splits that into "never
// created one" (a real explanation of what the app does, since they've
// never seen it) vs. "deleted their last one" (a returning user who
// already knows — a short prompt, not the same pitch again).
export default function EmptyState({ isFirstRun, onNewProject }) {
  return (
    <div className="mt-12">
      <EmptyMoment
        Icon={HardHat}
        iconStrokeWidth={1.75}
        title={isFirstRun ? 'Καλώς ήρθατε στη Διαχείριση Έργου' : 'Ξεκινήστε ένα νέο έργο'}
        action={
          <button
            onClick={onNewProject}
            className="bg-rust-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Νέο έργο
          </button>
        }
      >
        {isFirstRun
          ? 'Καταγράφετε έσοδα και έξοδα ξεχωριστά για κάθε έργο κατασκευής — τι πληρώσατε, τι εισπράξατε, τι εκκρεμεί ακόμα. Λειτουργεί και χωρίς σύνδεση στο εργοτάξιο. Ξεκινήστε δημιουργώντας το πρώτο σας έργο.'
          : 'Δεν έχετε κανένα έργο αυτή τη στιγμή.'}
      </EmptyMoment>
    </div>
  )
}
