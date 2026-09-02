import { CATEGORY_BADGE_STYLES } from '../constants'
import { formatEUR } from '../lib/format'

export default function EntryList({ entries, onDelete }) {
  if (entries.length === 0) {
    return (
      <div className="text-sm text-stone-400 text-center py-10">
        Δεν υπάρχουν καταχωρήσεις ακόμα.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {entries.map((e) => (
        <div
          key={e.id}
          className="bg-white border border-stone-200 rounded-xl p-3 flex items-start gap-3"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {e.kind === 'expense' ? (
                <span
                  className={
                    'text-[11px] px-2 py-0.5 rounded-full font-medium ' +
                    (CATEGORY_BADGE_STYLES[e.category] || 'bg-stone-200 text-stone-700')
                  }
                >
                  {e.category}
                </span>
              ) : (
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800">
                  Είσπραξη
                </span>
              )}
              {e.vat && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">
                  με ΦΠΑ
                </span>
              )}
            </div>
            <div className="text-sm truncate">{e.note}</div>
            <div className="text-xs text-stone-400 mt-0.5">
              {e.vendor ? e.vendor + ' · ' : ''}
              {e.date}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div
              className={
                'font-semibold text-sm ' +
                (e.kind === 'income' ? 'text-emerald-700' : 'text-rose-700')
              }
            >
              {e.kind === 'income' ? '+' : '-'}
              {formatEUR(e.amount)}
            </div>
            <button
              onClick={() => onDelete(e.id)}
              className="text-stone-300 hover:text-rose-600 mt-1 text-xs"
            >
              Διαγραφή
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
