import { ArrowUp, ArrowDown } from 'lucide-react'
import { formatEUR } from '../lib/format'

export default function DashboardSummary({ income, expense, profit, pendingAmount }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-white border border-stone-200 rounded-xl p-3">
          <div className="text-xs text-stone-500 mb-1 flex items-center gap-1">
            <ArrowUp size={12} />
            Έσοδα
          </div>
          <div className="font-display font-bold text-xl tabular-nums text-emerald-800">{formatEUR(income)}</div>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-3">
          <div className="text-xs text-stone-500 mb-1 flex items-center gap-1">
            <ArrowDown size={12} />
            Έξοδα
          </div>
          <div className="font-display font-bold text-xl tabular-nums text-rose-800">{formatEUR(expense)}</div>
        </div>
      </div>
      <div
        className={
          'bg-white border border-stone-200 rounded-xl p-3 flex items-center gap-2 ' +
          (pendingAmount > 0 ? 'mb-3' : 'mb-5')
        }
      >
        <span className="text-xs text-stone-500">Κέρδος / Ζημία</span>
        <span
          className={
            'ml-auto font-display font-bold text-xl tabular-nums ' +
            (profit >= 0 ? 'text-emerald-800' : 'text-rose-800')
          }
        >
          {formatEUR(profit)}
        </span>
      </div>
      {pendingAmount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 flex items-center gap-2">
          <span className="text-xs text-amber-900">Εκκρεμή ποσά</span>
          <span className="ml-auto font-display font-bold text-xl tabular-nums text-amber-900">
            {formatEUR(pendingAmount)}
          </span>
        </div>
      )}
    </>
  )
}
