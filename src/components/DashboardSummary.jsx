import { ArrowUpCircle, ArrowDownCircle, TrendingDown, TrendingUp, Wallet, ChevronRight } from 'lucide-react'
import { formatEUR, formatEURWhole } from '../lib/format'
import { useCountUp } from '../lib/useCountUp'

// Budget progress thresholds — plain numbers, not magic strings scattered
// through the JSX below, so the "amber at 80%, red at 100%+" rule from
// this pass's own spec is visible in one place.
const WARNING_PCT = 80
const OVER_PCT = 100

// The dashboard's one deliberately strong-fill element (rust-950, white
// text) — everything else on the screen is white/light with a colored
// accent at most. Always renders as ONE visual shell now (not a
// different pastel card depending on state, which this pass's "no
// one-off surfaces" rule argued against): its CONTENT adapts —
// spend-vs-budget when a budget is set, profit/loss when it isn't but
// there's real activity, or a bare "set a budget" prompt when there's
// neither. Contrast re-measured against rust-950 (#301209), not
// assumed: white text 17.3:1, white/70 (every secondary label) 8.9:1,
// emerald-300 11.3:1, rose-300 9.1:1, amber-300 11.98:1 — all clear
// WCAG AAA's 7:1 for normal text.
function DashboardHero({ budgetEstimate, expense, income, profit, pendingAmount, onOpenSettings, animIndex }) {
  const hasBudget = budgetEstimate > 0
  const hasActivity = income > 0 || expense > 0
  const isProfit = profit >= 0
  // Only worth a line of its own when it's telling you something the
  // Έξοδα figure right below the hero doesn't already say — see this
  // pass's own "remove redundancy" instruction.
  const showPending = pendingAmount > 0 && pendingAmount !== expense

  const animatedExpense = useCountUp(hasBudget ? expense : 0)
  const animatedProfit = useCountUp(!hasBudget ? profit : 0)
  const animatedPending = useCountUp(showPending ? pendingAmount : 0)

  if (!hasBudget && !hasActivity) {
    // Brand new project, nothing recorded, no budget — a bare "no data"
    // hero would just be an empty dark rectangle. One clear action
    // instead: this IS the empty state for this element.
    return (
      <button
        onClick={onOpenSettings}
        className="w-full text-left rounded-2xl p-6 bg-rust-950 text-white shadow-modal animate-in flex items-center gap-4 active:opacity-90"
        style={{ '--i': animIndex }}
      >
        <div className="rounded-full p-2.5 bg-white/10 shrink-0">
          <Wallet size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display font-bold text-lg leading-tight">Ορίστε προϋπολογισμό</div>
          <div className="text-sm text-white/70">Παρακολουθήστε τα έξοδα έναντι ενός στόχου</div>
        </div>
        <ChevronRight size={18} className="text-white/50 shrink-0" />
      </button>
    )
  }

  const pct = hasBudget && budgetEstimate > 0 ? (expense / budgetEstimate) * 100 : 0
  const barPct = Math.min(100, Math.max(0, pct))
  const remaining = budgetEstimate - expense
  const isOver = pct >= OVER_PCT
  const isWarning = pct >= WARNING_PCT && !isOver
  const barColor = isOver ? 'bg-rose-400' : isWarning ? 'bg-amber-400' : 'bg-white'

  return (
    <div className="rounded-2xl p-6 bg-rust-950 text-white shadow-modal animate-in" style={{ '--i': animIndex }}>
      {hasBudget ? (
        <>
          <div className="text-sm font-medium text-white/70 mb-1">Προϋπολογισμός</div>
          <div className="font-display font-extrabold text-3xl tabular-nums leading-tight">
            {formatEURWhole(animatedExpense)}
            <span className="text-white/70 text-lg font-bold"> από {formatEURWhole(budgetEstimate)}</span>
          </div>

          <div className="h-2 rounded-full bg-white/15 overflow-hidden mt-4 mb-2">
            <div
              className={'h-full rounded-full animate-progress ' + barColor}
              style={{ width: `${barPct}%` }}
            />
          </div>
          {isOver ? (
            <div className="text-sm font-semibold text-rose-300 tabular-nums">
              Ξεπεράσατε τον προϋπολογισμό κατά {formatEUR(Math.abs(remaining))}
            </div>
          ) : (
            <div className="flex items-center justify-between text-sm text-white/70 tabular-nums">
              <span>{Math.round(pct)}%</span>
              <span>Απομένουν {formatEUR(remaining)}</span>
            </div>
          )}

          {income > 0 && (
            <div className="mt-4 pt-4 border-t border-white/15 flex items-center gap-1.5">
              {isProfit ? (
                <TrendingUp size={14} className="text-emerald-300 shrink-0" />
              ) : (
                <TrendingDown size={14} className="text-rose-300 shrink-0" />
              )}
              <span className="text-sm text-white/70">Κέρδος / Ζημία</span>
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
        </>
      ) : (
        <>
          <div className="flex items-center gap-1.5 text-sm font-medium text-white/70 mb-1">
            {isProfit ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            Κέρδος / Ζημία
          </div>
          <div
            className={
              'font-display font-extrabold text-3xl tabular-nums leading-tight ' +
              (isProfit ? 'text-emerald-300' : 'text-rose-300')
            }
          >
            {formatEUR(animatedProfit)}
          </div>
          <button
            onClick={onOpenSettings}
            className="mt-4 pt-4 border-t border-white/15 w-full flex items-center gap-1.5 text-left active:opacity-80"
          >
            <span className="text-sm text-white/70">Ορίστε προϋπολογισμό</span>
            <ChevronRight size={15} className="text-white/50 ml-auto shrink-0" />
          </button>
        </>
      )}

      {showPending && (
        <div className="flex items-center gap-1.5 text-sm mt-2">
          <span className="text-white/70">Εκκρεμούν</span>
          <span className="ml-auto font-display font-bold tabular-nums text-amber-300">
            {formatEUR(animatedPending)}
          </span>
        </div>
      )}
    </div>
  )
}

// Έσοδα/Έξοδα — white surfaces with a thin colored left edge and colored
// numbers, not full pastel fills, so the hero above stays the only
// strong-fill element on the screen. The colored-number pairs reused
// here (emerald-800/rose-800 on white) are the same dark-on-light pairs
// already verified AAA elsewhere in this app (see constants.js's badge
// styles) — white is a *higher*-luminance background than the pastel-50
// tints this replaced, so contrast only improves, never regresses.
export default function DashboardSummary({ income, expense, profit, pendingAmount, budgetEstimate, onOpenSettings }) {
  const animatedIncome = useCountUp(income)
  const animatedExpense = useCountUp(expense)

  return (
    <>
      <div className="mb-6">
        <DashboardHero
          budgetEstimate={budgetEstimate}
          expense={expense}
          income={income}
          profit={profit}
          pendingAmount={pendingAmount}
          onOpenSettings={onOpenSettings}
          animIndex={0}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 shadow-card border-l-4 border-emerald-500 animate-in" style={{ '--i': 1 }}>
          <div className="text-sm text-stone-500 mb-1 flex items-center gap-1">
            <ArrowUpCircle size={13} className="text-emerald-600" />
            Έσοδα
          </div>
          <div className="font-display font-bold text-xl tabular-nums text-emerald-800">
            {formatEUR(animatedIncome)}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-card border-l-4 border-rose-500 animate-in" style={{ '--i': 1 }}>
          <div className="text-sm text-stone-500 mb-1 flex items-center gap-1">
            <ArrowDownCircle size={13} className="text-rose-600" />
            Έξοδα
          </div>
          <div className="font-display font-bold text-xl tabular-nums text-rose-800">
            {formatEUR(animatedExpense)}
          </div>
        </div>
      </div>
    </>
  )
}
