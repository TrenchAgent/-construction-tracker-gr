import { ArrowUpCircle, ArrowDownCircle, TrendingDown, TrendingUp } from 'lucide-react'
import { formatEUR, formatEURWhole } from '../lib/format'

// The dashboard's one deliberately strong-fill element (rust-950, white
// text) — everything else on the screen is white/light with a colored
// accent at most, so this is the thing your eye lands on first. Spend
// against budget is the headline figure (a budget is a spending ceiling,
// not a net-income figure), with profit/loss folded in underneath as a
// secondary line rather than a competing card of its own, per the visual
// hierarchy pass this came from. Contrast re-measured against rust-950
// (#301209) after building, not assumed: white text 17.3:1, white/70
// (every secondary label/figure in here) 8.9:1, emerald-300 11.3:1,
// rose-300 9.1:1 — all comfortably clear WCAG AAA's 7:1 for normal text.
function BudgetHero({ budgetEstimate, expense, income, profit }) {
  const pct = budgetEstimate > 0 ? (expense / budgetEstimate) * 100 : 0
  const barPct = Math.min(100, Math.max(0, pct))
  const remaining = budgetEstimate - expense
  const isOver = remaining < 0
  const isProfit = profit >= 0

  return (
    <div className="rounded-2xl p-4 bg-rust-950 text-white shadow-card">
      <div className="text-xs font-medium text-white/70 mb-1">Προϋπολογισμός</div>
      <div className="font-display font-extrabold text-3xl tabular-nums leading-tight">
        {formatEURWhole(expense)}
        <span className="text-white/70 text-lg font-bold"> από {formatEURWhole(budgetEstimate)}</span>
      </div>

      <div className="h-2 rounded-full bg-white/15 overflow-hidden mt-3 mb-1.5">
        <div
          className={'h-full rounded-full transition-[width] ' + (isOver ? 'bg-amber-400' : 'bg-white')}
          style={{ width: `${barPct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-white/70 tabular-nums">
        <span>{Math.round(pct)}%</span>
        <span>{isOver ? `Υπέρβαση ${formatEUR(Math.abs(remaining))}` : `Απομένουν ${formatEUR(remaining)}`}</span>
      </div>

      {income > 0 && (
        <div className="mt-3 pt-3 border-t border-white/15 flex items-center gap-1.5">
          {isProfit ? (
            <TrendingUp size={14} className="text-emerald-300 shrink-0" />
          ) : (
            <TrendingDown size={14} className="text-rose-300 shrink-0" />
          )}
          <span className="text-xs text-white/70">Κέρδος / Ζημία</span>
          <span
            className={
              'ml-auto font-display font-bold text-base tabular-nums ' +
              (isProfit ? 'text-emerald-300' : 'text-rose-300')
            }
          >
            {formatEUR(profit)}
          </span>
        </div>
      )}
    </div>
  )
}

// The fallback hero for a project with no budget set — today's only
// hero, kept as-is (same pastel-tint treatment this whole file used to
// use everywhere) rather than retired, since most projects won't have a
// budget the moment this ships.
function ProfitHero({ profit }) {
  const isProfit = profit >= 0
  return (
    <div
      className={
        'rounded-2xl p-4 border-2 shadow-card flex items-center gap-3 ' +
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
  )
}

// Έσοδα/Έξοδα/Εκκρεμή are deliberately quiet now — white surfaces with a
// thin colored left edge and colored numbers, not full pastel fills —
// so the hero above is the only strong-fill element on the screen. The
// colored-number pairs reused here (emerald-800/rose-800/amber-900 on
// white) are the same dark-on-light pairs already verified AAA
// elsewhere in this app (see constants.js's badge styles); white is a
// *higher*-luminance background than the pastel-50 tints they replace,
// so contrast only improves, never regresses.
export default function DashboardSummary({ income, expense, profit, pendingAmount, budgetEstimate }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-white rounded-xl p-3 shadow-card border-l-4 border-emerald-500">
          <div className="text-xs text-stone-500 mb-1 flex items-center gap-1">
            <ArrowUpCircle size={12} className="text-emerald-600" />
            Έσοδα
          </div>
          <div className="font-display font-bold text-xl tabular-nums text-emerald-800">{formatEUR(income)}</div>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-card border-l-4 border-rose-500">
          <div className="text-xs text-stone-500 mb-1 flex items-center gap-1">
            <ArrowDownCircle size={12} className="text-rose-600" />
            Έξοδα
          </div>
          <div className="font-display font-bold text-xl tabular-nums text-rose-800">{formatEUR(expense)}</div>
        </div>
      </div>

      {budgetEstimate > 0 ? (
        <div className={pendingAmount > 0 ? 'mb-3' : 'mb-5'}>
          <BudgetHero budgetEstimate={budgetEstimate} expense={expense} income={income} profit={profit} />
        </div>
      ) : (
        <div className={pendingAmount > 0 ? 'mb-3' : 'mb-5'}>
          <ProfitHero profit={profit} />
        </div>
      )}

      {pendingAmount > 0 && (
        <div className="bg-white rounded-xl p-3 mb-5 flex items-center gap-2 shadow-card border-l-4 border-amber-500">
          <span className="text-xs text-stone-500">Εκκρεμή ποσά</span>
          <span className="ml-auto font-display font-bold text-xl tabular-nums text-amber-900">
            {formatEUR(pendingAmount)}
          </span>
        </div>
      )}
    </>
  )
}
