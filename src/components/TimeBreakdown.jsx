import { formatEUR } from '../lib/format'
import { parseLocalDate, toLocalDateString } from '../lib/dates'

// Monday-start week — "αυτή την εβδομάδα" is normally understood that way
// in Greek, unlike the US convention of a Sunday-start week.
function startOfWeek(date) {
  const day = date.getDay() // 0 = Sunday, 1 = Monday, ...
  const diff = (day === 0 ? -6 : 1) - day
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() + diff)
  return start
}

// One compact column per period, net amount only (not separate +/-
// income/expense figures) — three periods × two signed figures each
// doesn't fit one row at this screen width, and a glance-value summary
// ("ahead or behind, roughly how much") is what this strip is actually
// for; the full breakdown is one tap away in the entry list itself.
function Column({ label, income, expense, isLast }) {
  const net = income - expense
  const isZero = net === 0
  return (
    <div className={'flex-1 py-3 text-center' + (isLast ? '' : ' border-r border-stone-100')}>
      <div className="text-sm text-stone-400 mb-0.5">{label}</div>
      <div
        className={
          'font-display font-bold text-sm tabular-nums ' +
          (isZero ? 'text-stone-400' : net > 0 ? 'text-emerald-800' : 'text-rose-800')
        }
      >
        {isZero ? '—' : (net > 0 ? '+' : '') + formatEUR(net)}
      </div>
    </div>
  )
}

export default function TimeBreakdown({ entries }) {
  const now = new Date()
  const todayStr = toLocalDateString(now)
  const weekStart = startOfWeek(now)
  const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7)

  const today = entries.filter((e) => e.date === todayStr)
  const thisWeek = entries.filter((e) => {
    const d = parseLocalDate(e.date)
    return d >= weekStart && d < weekEnd
  })
  const thisMonth = entries.filter((e) => {
    const d = parseLocalDate(e.date)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })

  // Nothing happened in any of the three windows — the strip would be
  // three dashes in a row, which tells you nothing a blank space
  // wouldn't also tell you. Hide rather than show that.
  if (today.length === 0 && thisWeek.length === 0 && thisMonth.length === 0) return null

  function sums(list) {
    return {
      income: list.filter((e) => e.kind === 'income').reduce((s, e) => s + e.amount, 0),
      expense: list.filter((e) => e.kind === 'expense').reduce((s, e) => s + e.amount, 0),
    }
  }
  const t = sums(today)
  const w = sums(thisWeek)
  const m = sums(thisMonth)

  return (
    <div className="bg-white rounded-2xl mb-6 shadow-card flex items-stretch animate-in" style={{ '--i': 3 }}>
      <Column label="Σήμερα" income={t.income} expense={t.expense} />
      <Column label="Εβδομάδα" income={w.income} expense={w.expense} />
      <Column label="Μήνας" income={m.income} expense={m.expense} isLast />
    </div>
  )
}
