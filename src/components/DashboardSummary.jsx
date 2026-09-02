import { formatEUR } from '../lib/format'

export default function DashboardSummary({ income, expense, profit }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-white border border-stone-200 rounded-xl p-3">
          <div className="text-xs text-stone-500 mb-1">↑ Έσοδα</div>
          <div className="font-semibold text-emerald-700">{formatEUR(income)}</div>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-3">
          <div className="text-xs text-stone-500 mb-1">↓ Έξοδα</div>
          <div className="font-semibold text-rose-700">{formatEUR(expense)}</div>
        </div>
      </div>
      <div className="bg-white border border-stone-200 rounded-xl p-3 mb-5 flex items-center gap-2">
        <span className="text-xs text-stone-500">Κέρδος / Ζημία</span>
        <span
          className={
            'ml-auto font-semibold ' + (profit >= 0 ? 'text-emerald-700' : 'text-rose-700')
          }
        >
          {formatEUR(profit)}
        </span>
      </div>
    </>
  )
}
