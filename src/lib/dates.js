// Entry dates are plain "YYYY-MM-DD" calendar dates (from a <input
// type="date">), with no time/timezone component. Parsing them with
// `new Date(str)` treats them as UTC midnight, which can land on the
// "wrong" day once compared against a local Date near a timezone
// boundary — parsing the parts directly into a local Date sidesteps
// that. Shared by TimeBreakdown.jsx and MonthlyTrendChart.jsx, both of
// which bucket entries by calendar date/month.
export function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toLocalDateString(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
