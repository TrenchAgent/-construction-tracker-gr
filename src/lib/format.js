const currencyFormatter = new Intl.NumberFormat('el-GR', {
  style: 'currency',
  currency: 'EUR',
})

export function formatEUR(amount) {
  return currencyFormatter.format(amount || 0)
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
