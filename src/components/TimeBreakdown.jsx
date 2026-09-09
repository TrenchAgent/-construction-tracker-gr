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

function sumByKind(entries, kind) {
  return entries.filter((e) => e.kind === kind).reduce((s, e) => s + e.amount, 0)
}

function Row({ label, entries }) {
  const income = sumByKind(entries, 'income')
  const expense = sumByKind(entries, 'expense')
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="text-stone-500">{label}</span>
      <span className="flex gap-3 tabular-nums">
        <span className="font-display text-emerald-800 font-bold">+{formatEUR(income)}</span>
        <span className="font-display text-rose-800 font-bold">-{formatEUR(expense)}</span>
      </span>
    </div>
  )
}

export default function TimeBreakdown({ entries }) {
  if (entries.length === 0) return null

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

  return (
    <div className="bg-white border border-stone-200 rounded-xl px-3 divide-y divide-stone-100 mb-5">
      <Row label="Σήμερα" entries={today} />
      <Row label="Αυτή την εβδομάδα" entries={thisWeek} />
      <Row label="Αυτόν τον μήνα" entries={thisMonth} />
    </div>
  )
}
