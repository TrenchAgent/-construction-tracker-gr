import { ArrowUp, ArrowDown, TrendingDown, TrendingUp } from 'lucide-react'
import { formatEUR } from '../lib/format'

// Income/expense get their own tinted surface (a soft colored
// background + matching border), not just colored text on a plain
// white card — a flat white card with colored text was the single
// biggest thing making this dashboard read as generic rather than
// confident. Κέρδος/Ζημία (profit/loss) gets a step further still: a
// visibly bigger, bolder "hero" treatment (thicker border, larger
// figure, its own tint) so it's unmistakably the headline stat of the
// screen, not just a third card in the row below the first two.
export default function DashboardSummary({ income, expense, profit, pendingAmount }) {
  const isProfit = profit >= 0
  return (
    <>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <div className="text-xs text-emerald-800 mb-1 flex items-center gap-1">
            <ArrowUp size={12} />
            Έσοδα
          </div>
          <div className="font-display font-bold text-xl tabular-nums text-emerald-800">{formatEUR(income)}</div>
        </div>
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
          <div className="text-xs text-rose-800 mb-1 flex items-center gap-1">
            <ArrowDown size={12} />
            Έξοδα
          </div>
          <div className="font-display font-bold text-xl tabular-nums text-rose-800">{formatEUR(expense)}</div>
        </div>
      </div>

      {/* The hero stat — deliberately heavier than the two cards above:
          thicker colored border, a richer tint, a bigger figure, and an
          icon that itself carries the up/down meaning. */}
      <div
        className={
          'rounded-2xl p-4 border-2 flex items-center gap-3 ' +
          (pendingAmount > 0 ? 'mb-3' : 'mb-5') +
          ' ' +
          (isProfit ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50 border-rose-300')
        }
      >
        <div className={'rounded-full p-2 shrink-0 ' + (isProfit ? 'bg-emerald-200' : 'bg-rose-200')}>
          {isProfit ? (
            <TrendingUp size={20} className="text-emerald-800" />
          ) : (
            <TrendingDown size={20} className="text-rose-800" />
          )}
        </div>
        <div className="min-w-0">
          <div className={'text-xs font-medium ' + (isProfit ? 'text-emerald-800' : 'text-rose-800')}>
            Κέρδος / Ζημία
          </div>
          <div
            className={
              'font-display font-extrabold text-3xl tabular-nums leading-tight ' +
              (isProfit ? 'text-emerald-900' : 'text-rose-900')
            }
          >
            {formatEUR(profit)}
          </div>
        </div>
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
