import { Calendar } from 'lucide-react'
import { formatDateGr } from '../lib/format'

// Date range only now — budget moved to the dashboard's own hero
// (DashboardSummary.jsx's BudgetHero), which is the one headline place
// that shows it as of the visual hierarchy pass this came from. Showing
// the same figure twice on one screen (once here, once big in the hero)
// was repetition, not useful redundancy. Renders nothing if neither date
// is set — most projects won't have these right after the feature
// shipped, and an always-empty strip would just be noise.
export default function ProjectMeta({ startDate, targetCompletionDate }) {
  if (!startDate && !targetCompletionDate) return null

  return (
    <div className="bg-white rounded-xl p-3 mb-5 shadow-card flex items-center gap-1.5 text-sm text-stone-600">
      <Calendar size={14} className="text-stone-400 shrink-0" />
      <span className="truncate">
        {startDate ? formatDateGr(startDate) : '—'}
        {' – '}
        {targetCompletionDate ? formatDateGr(targetCompletionDate) : '—'}
      </span>
    </div>
  )
}
