import { formatEUR } from '../lib/format'
import { parseLocalDate } from '../lib/dates'
import { EXPENSE_CATEGORIES, CATEGORY_SELECTED_STYLES } from '../constants'

// Greek month abbreviations via Intl, not a hand-written lookup table —
// correct by construction, no extra bundle weight (built into the JS
// engine already).
const MONTH_FORMATTER = new Intl.DateTimeFormat('el-GR', { month: 'short' })

const BAR_AREA_HEIGHT = 72 // px

// The last 6 calendar months up to and including this one, pulled
// forward to the project's own creation month if that's more recent —
// "last 6 months or since project start, whichever is shorter," so a
// 2-month-old project shows 2 bars, not 6 with 4 empty ones. Always a
// fixed calendar window (not "months that happen to have entries") —
// a gap in the middle is itself glance-value information ("nothing
// happened in July"), not noise to hide.
function monthsToShow(projectCreatedAt) {
  const now = new Date()
  let cursor = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  if (projectCreatedAt) {
    const created = new Date(projectCreatedAt)
    const createdMonthStart = new Date(created.getFullYear(), created.getMonth(), 1)
    if (createdMonthStart > cursor) cursor = createdMonthStart
  }
  const end = new Date(now.getFullYear(), now.getMonth(), 1)
  const months = []
  while (cursor <= end) {
    months.push({ year: cursor.getFullYear(), month: cursor.getMonth() })
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  }
  return months
}

function sumForMonth(entries, year, month, kind) {
  return entries
    .filter((e) => {
      if (e.kind !== kind) return false
      const d = parseLocalDate(e.date)
      return d.getFullYear() === year && d.getMonth() === month
    })
    .reduce((s, e) => s + e.amount, 0)
}

// Spend by category — the fallback shown instead of the monthly trend
// chart until there are at least two actual months of data (see
// MonthlyTrendChart below): a trend needs at least two points to show a
// trend at all, and a single bar for "this month" is a figure the
// Έξοδα card above already shows. Reuses CATEGORY_SELECTED_STYLES —
// the same solid fills OptionPill's selected state already uses for
// these three categories — rather than inventing a new color per bar.
function CategoryBreakdown({ entries }) {
  const totals = EXPENSE_CATEGORIES.map((category) => ({
    category,
    total: entries
      .filter((e) => e.kind === 'expense' && e.category === category)
      .reduce((s, e) => s + e.amount, 0),
  }))
  if (totals.every((t) => t.total === 0)) return null
  const maxTotal = Math.max(1, ...totals.map((t) => t.total))

  return (
    <div className="bg-white rounded-xl p-3 mb-5 shadow-card">
      <h3 className="text-xs font-semibold text-stone-500 mb-3">Έξοδα ανά κατηγορία</h3>
      <div className="space-y-2.5">
        {totals.map(({ category, total }) => (
          <div key={category}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-stone-600">{category}</span>
              <span className="font-display font-bold text-stone-800 tabular-nums">{formatEUR(total)}</span>
            </div>
            <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
              <div
                className={'h-full rounded-full ' + CATEGORY_SELECTED_STYLES[category]}
                style={{ width: `${total > 0 ? Math.max(3, Math.round((total / maxTotal) * 100)) : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// A glance-value visual, deliberately — income vs. expense per month,
// nothing computed on top of that. No averages, no month-over-month
// change, no projected rate; see the project's own scope notes for why
// that kind of analysis is explicitly left out of this app.
export default function MonthlyTrendChart({ entries, projectCreatedAt }) {
  if (entries.length === 0) return null

  const bars = monthsToShow(projectCreatedAt).map(({ year, month }) => ({
    year,
    month,
    income: sumForMonth(entries, year, month, 'income'),
    expense: sumForMonth(entries, year, month, 'expense'),
  }))

  // A trend chart with one real data point isn't a trend — show
  // category spend instead until there's at least a second month to
  // actually compare against. "Months with data," not "months in the
  // window": the window always spans up to 6 calendar months regardless
  // (see monthsToShow's own comment on why empty months stay visible
  // once this chart does render), so counting the window itself would
  // flip this on for a single-month-old project with a wide-enough date
  // range, which isn't what "2+ months of data" means.
  const monthsWithData = bars.filter((b) => b.income > 0 || b.expense > 0).length
  if (monthsWithData < 2) {
    return <CategoryBreakdown entries={entries} />
  }
  // 1 as a floor, not 0 — avoids a divide-by-zero if the whole window
  // (a real calendar span, not just "months with data") turns out empty.
  const maxValue = Math.max(1, ...bars.flatMap((b) => [b.income, b.expense]))

  return (
    <div className="bg-white rounded-xl p-3 mb-5 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-stone-500">Μηνιαία τάση</h3>
        <div className="flex items-center gap-3 text-[10px] text-stone-500">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-emerald-600 inline-block" />
            Έσοδα
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-rose-600 inline-block" />
            Έξοδα
          </span>
        </div>
      </div>

      <div className="flex items-end justify-between gap-1" style={{ height: BAR_AREA_HEIGHT }}>
        {bars.map((b) => {
          // A real but tiny value still gets a visible sliver (2px floor)
          // rather than rounding away to nothing next to a much bigger
          // month — "something happened" is itself the glance-value point.
          const incomeHeight = b.income > 0 ? Math.max(2, Math.round((b.income / maxValue) * BAR_AREA_HEIGHT)) : 0
          const expenseHeight = b.expense > 0 ? Math.max(2, Math.round((b.expense / maxValue) * BAR_AREA_HEIGHT)) : 0
          const label = MONTH_FORMATTER.format(new Date(b.year, b.month, 1))
          return (
            <div
              key={`${b.year}-${b.month}`}
              className="flex-1 flex items-end justify-center gap-0.5 h-full"
              title={`${label} ${b.year}: +${formatEUR(b.income)} / -${formatEUR(b.expense)}`}
            >
              <div className="w-2.5 rounded-t bg-emerald-600" style={{ height: `${incomeHeight}px` }} />
              <div className="w-2.5 rounded-t bg-rose-600" style={{ height: `${expenseHeight}px` }} />
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between gap-1 mt-1.5">
        {bars.map((b) => (
          <div key={`${b.year}-${b.month}-label`} className="flex-1 text-center text-[10px] text-stone-400 capitalize">
            {MONTH_FORMATTER.format(new Date(b.year, b.month, 1))}
          </div>
        ))}
      </div>
    </div>
  )
}
