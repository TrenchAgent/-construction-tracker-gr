export default function EmptyState({ onNewProject }) {
  return (
    <div className="p-8 text-center mt-16">
      <div className="text-4xl mb-3">🏗️</div>
      <h2 className="font-semibold text-lg mb-1">Ξεκινήστε το πρώτο σας έργο</h2>
      <p className="text-sm text-stone-500 mb-5">
        Καταγράψτε έσοδα και έξοδα του έργου σας εύκολα και γρήγορα.
      </p>
      <button
        onClick={onNewProject}
        className="bg-orange-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm"
      >
        + Νέο έργο
      </button>
    </div>
  )
}
