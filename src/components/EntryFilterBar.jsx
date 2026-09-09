import { useState } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { EXPENSE_CATEGORIES, PAYMENT_STATUSES, PAYMENT_STATUS_LABELS } from '../constants'
import { EMPTY_FILTERS, isFilterActive } from '../lib/entryFilters'

export default function EntryFilterBar({ filters, onChange }) {
  const [expanded, setExpanded] = useState(false)
  const active = isFilterActive(filters)

  function set(patch) {
    onChange({ ...filters, ...patch })
  }

  return (
    <div className="mb-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="Αναζήτηση σε σημείωση ή προμηθευτή…"
            className="w-full border border-stone-300 rounded-lg pl-8 pr-3 py-2 text-sm bg-white"
          />
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          aria-label="Φίλτρα"
          className={
            'shrink-0 p-2.5 rounded-lg border relative ' +
            (expanded || active
              ? 'border-rust-700 text-rust-800 bg-rust-50'
              : 'border-stone-300 text-stone-500')
          }
        >
          <SlidersHorizontal size={16} />
          {active && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rust-700" />
          )}
        </button>
      </div>

      {expanded && (
        <div className="mt-2 bg-white border border-stone-200 rounded-xl p-3 space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <select
              value={filters.category}
              onChange={(e) => set({ category: e.target.value })}
              className="text-xs border border-stone-300 rounded-lg px-2 py-2 bg-white"
            >
              <option value="">Όλες οι κατηγορίες</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="Είσπραξη">Είσπραξη</option>
            </select>
            <select
              value={filters.status}
              onChange={(e) => set({ status: e.target.value })}
              className="text-xs border border-stone-300 rounded-lg px-2 py-2 bg-white"
            >
              <option value="">Κάθε κατάσταση</option>
              {PAYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PAYMENT_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-stone-500 mb-1">Από</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => set({ dateFrom: e.target.value })}
                className="w-full text-xs border border-stone-300 rounded-lg px-2 py-1.5 bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] text-stone-500 mb-1">Έως</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => set({ dateTo: e.target.value })}
                className="w-full text-xs border border-stone-300 rounded-lg px-2 py-1.5 bg-white"
              />
            </div>
          </div>
          {active && (
            <button
              onClick={() => onChange(EMPTY_FILTERS)}
              className="w-full flex items-center justify-center gap-1 text-xs text-stone-500 py-2"
            >
              <X size={12} />
              Καθαρισμός φίλτρων
            </button>
          )}
        </div>
      )}
    </div>
  )
}
