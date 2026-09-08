export const EMPTY_FILTERS = { search: '', category: '', status: '', dateFrom: '', dateTo: '' }

export function isFilterActive(filters) {
  return Boolean(filters.search || filters.category || filters.status || filters.dateFrom || filters.dateTo)
}

// Matches note or vendor — covers "filter by vendor" without a separate
// text field for it (typing a supplier's name is the same gesture either
// way), and keeps this to one search box rather than two near-identical
// inputs on a screen this narrow.
export function applyEntryFilters(entries, filters) {
  return entries.filter((e) => {
    if (filters.category && e.category !== filters.category) return false
    if (filters.status && e.paymentStatus !== filters.status) return false
    if (filters.dateFrom && e.date < filters.dateFrom) return false
    if (filters.dateTo && e.date > filters.dateTo) return false
    if (filters.search) {
      const haystack = `${e.note} ${e.vendor || ''}`.toLowerCase()
      if (!haystack.includes(filters.search.toLowerCase())) return false
    }
    return true
  })
}
