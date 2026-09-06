import { HardHat, Plus } from 'lucide-react'

export default function EmptyState({ onNewProject }) {
  return (
    <div className="p-8 text-center mt-16">
      <HardHat size={40} strokeWidth={1.75} className="mx-auto text-orange-700 mb-3" />
      <h2 className="font-semibold text-lg mb-1">Ξεκινήστε το πρώτο σας έργο</h2>
      <p className="text-sm text-stone-500 mb-5">
        Καταγράψτε έσοδα και έξοδα του έργου σας εύκολα και γρήγορα.
      </p>
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
