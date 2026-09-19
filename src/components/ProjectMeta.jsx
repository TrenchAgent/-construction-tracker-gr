import { Calendar, Wallet } from 'lucide-react'
import { formatEUR, formatDateGr } from '../lib/format'

// A separate, neutral-toned strip above the dashboard's real hero stat
// (Κέρδος/Ζημία in DashboardSummary) — not folded into it, on purpose:
// budget/timeline is project *context*, not a profit/loss figure, and
// giving it the same colored-hero treatment would compete with the
// number that's actually meant to be the headline of this screen.
// Renders nothing at all if the project has none of these three set —
// most projects won't, right after this feature ships, and an
// always-empty "Budget: —" row would just be noise.
export default function ProjectMeta({ budgetEstimate, startDate, targetCompletionDate }) {
  const hasDates = startDate || targetCompletionDate
  if (!hasDates && budgetEstimate == null) return null

  return (
    <div className="bg-white rounded-xl p-3 mb-5 shadow-card flex items-center gap-4 flex-wrap text-sm">
      {hasDates && (
        <div className="flex items-center gap-1.5 text-stone-600 min-w-0">
          <Calendar size={14} className="text-stone-400 shrink-0" />
          <span className="truncate">
            {startDate ? formatDateGr(startDate) : '—'}
            {' – '}
            {targetCompletionDate ? formatDateGr(targetCompletionDate) : '—'}
          </span>
        </div>
      )}
      {budgetEstimate != null && (
        <div className="flex items-center gap-1.5 text-stone-600 ml-auto">
          <Wallet size={14} className="text-stone-400 shrink-0" />
          <span className="font-display font-bold text-stone-800">{formatEUR(budgetEstimate)}</span>
        </div>
      )}
    </div>
  )
}
