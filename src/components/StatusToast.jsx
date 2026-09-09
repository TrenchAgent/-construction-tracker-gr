import { useEffect } from 'react'
import { CheckCircle2 } from 'lucide-react'

// Same visual shell as UndoToast (bottom-fixed, dark, a shrinking
// progress bar) on purpose — this is the other half of the toast
// system, for a plain "that worked" confirmation instead of a
// destructive action's undo window. Auto-dismisses; no action to tap.
export default function StatusToast({ status, onDismiss, durationMs }) {
  useEffect(() => {
    if (!status) return undefined
    const timeoutId = setTimeout(onDismiss, durationMs)
    return () => clearTimeout(timeoutId)
  }, [status, durationMs, onDismiss])

  if (!status) return null
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[calc(100%-2.5rem)] max-w-[26rem] bg-stone-900 text-white rounded-xl shadow-lg overflow-hidden z-40">
      <div className="flex items-center gap-2.5 px-4 py-3">
        <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
        <span className="flex-1 text-sm truncate">{status.message}</span>
      </div>
      <div className="h-0.5 bg-white/20">
        {/* key={status.id} restarts the animation for each new status —
            same reasoning as UndoToast's identical pattern. */}
        <div
          key={status.id}
          className="h-full bg-emerald-400"
          style={{ animation: `shrink-width ${durationMs}ms linear forwards` }}
        />
      </div>
    </div>
  )
}
