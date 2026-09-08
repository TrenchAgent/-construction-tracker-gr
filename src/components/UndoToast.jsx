import { Undo2 } from 'lucide-react'

// Rendered globally (see App.jsx) so it survives navigating away from
// whatever screen the delete happened on — the countdown and the actual
// deletion it's deferring both live at the App level, not tied to one
// screen's lifetime.
export default function UndoToast({ pending, onUndo, durationMs }) {
  if (!pending) return null
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[calc(100%-2.5rem)] max-w-[26rem] bg-stone-900 text-white rounded-xl shadow-lg overflow-hidden z-40">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="flex-1 text-sm truncate">{pending.label}</span>
        <button
          onClick={onUndo}
          className="text-sm font-semibold text-orange-300 flex items-center gap-1 shrink-0"
        >
          <Undo2 size={14} />
          Αναίρεση
        </button>
      </div>
      <div className="h-0.5 bg-white/20">
        {/* key={pending.id} restarts the animation for each new pending
            delete — without it, a second delete arriving before the first
            toast's animation finished would keep the old (partway-through)
            animation state instead of starting a fresh countdown. */}
        <div
          key={pending.id}
          className="h-full bg-orange-400"
          style={{ animation: `shrink-width ${durationMs}ms linear forwards` }}
        />
      </div>
    </div>
  )
}
