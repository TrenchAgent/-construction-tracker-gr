const currencyFormatter = new Intl.NumberFormat('el-GR', {
  style: 'currency',
  currency: 'EUR',
})

export function formatEUR(amount) {
  return currencyFormatter.format(amount || 0)
}

const currencyFormatterWhole = new Intl.NumberFormat('el-GR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

// Rounds to whole euros — used only for the dashboard's big budget-hero
// figure (DashboardSummary.jsx), where cents on a €10.000 headline number
// add visual noise without adding anything scannable. Every other money
// figure in the app keeps full cent precision via formatEUR above.
export function formatEURWhole(amount) {
  return currencyFormatterWhole.format(amount || 0)
}

// Plain "YYYY-MM-DD" date columns (entries.date, projects.start_date/
// target_completion_date — never a full timestamp) formatted as
// dd/mm/yyyy. Deliberately a manual split, not `new Date(iso)
// .toLocaleDateString()`: a date-only string parses as UTC midnight, so
// in any timezone behind UTC that displays as the PREVIOUS day — wrong
// for a value that was never a moment in time to begin with, just a
// calendar date.
export function formatDateGr(isoDate) {
  const [y, m, d] = isoDate.split('-')
  return `${d}/${m}/${y}`
}
