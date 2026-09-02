import { useState } from 'react'
import { EXPENSE_CATEGORIES, VAT_RATE } from '../constants'

const emptyForm = () => ({
  kind: 'expense',
  category: EXPENSE_CATEGORIES[0],
  vendor: '',
  note: '',
  amount: '',
  vat: false,
  date: new Date().toISOString().slice(0, 10),
})

export default function QuickAddModal({ onClose, onSave }) {
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')

  function update(patch) {
    setForm((f) => ({ ...f, ...patch }))
  }

  function handleSave() {
    const amt = parseFloat(form.amount)
    if (!form.amount || Number.isNaN(amt) || amt <= 0) {
      setError('Δώστε έγκυρο ποσό')
      return
    }
    if (!form.note.trim()) {
      setError('Προσθέστε μια σύντομη σημείωση')
      return
    }
    const final = form.kind === 'expense' && form.vat ? amt * (1 + VAT_RATE) : amt
    onSave({
      kind: form.kind,
      category: form.kind === 'expense' ? form.category : 'Είσπραξη',
      vendor: form.vendor.trim(),
      note: form.note.trim(),
      amount: Math.round(final * 100) / 100,
      vat: form.vat,
      date: form.date,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-20">
      <div
        className="bg-white w-full max-w-md rounded-t-2xl p-5"
        style={{ maxHeight: '85vh', overflowY: 'auto' }}
      >
        <div className="flex items-center mb-4">
          <h3 className="font-semibold">Νέα καταχώρηση</h3>
          <button onClick={onClose} className="ml-auto text-stone-400 text-lg">
            ×
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            onClick={() => update({ kind: 'expense' })}
            className={
              'py-2 rounded-lg text-sm font-medium border ' +
              (form.kind === 'expense'
                ? 'bg-rose-600 text-white border-rose-600'
                : 'border-stone-300 text-stone-600')
            }
          >
            Έξοδο
          </button>
          <button
            onClick={() => update({ kind: 'income' })}
            className={
              'py-2 rounded-lg text-sm font-medium border ' +
              (form.kind === 'income'
                ? 'bg-emerald-700 text-white border-emerald-700'
                : 'border-stone-300 text-stone-600')
            }
          >
            Είσπραξη
          </button>
        </div>

        {form.kind === 'expense' && (
          <>
            <label className="block text-xs text-stone-500 mb-1">Κατηγορία</label>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {EXPENSE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => update({ category: cat })}
                  className={
                    'py-1.5 rounded-lg text-xs font-medium border ' +
                    (form.category === cat
                      ? 'border-orange-700 text-orange-800 bg-orange-50'
                      : 'border-stone-300 text-stone-600')
                  }
                >
                  {cat}
                </button>
              ))}
            </div>
          </>
        )}

        <label className="block text-xs text-stone-500 mb-1">Ποσό (€) *</label>
        <input
          type="number"
          inputMode="decimal"
          className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-3 text-sm"
          placeholder="0.00"
          value={form.amount}
          onChange={(e) => update({ amount: e.target.value })}
        />

        {form.kind === 'expense' && (
          <>
            <label className="block text-xs text-stone-500 mb-1">Προμηθευτής (προαιρετικό)</label>
            <input
              className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-3 text-sm"
              placeholder="π.χ. Εμπορία Ξυλείας Γεωργίου"
              value={form.vendor}
              onChange={(e) => update({ vendor: e.target.value })}
            />
          </>
        )}

        <label className="block text-xs text-stone-500 mb-1">Σημείωση *</label>
        <input
          className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-3 text-sm"
          placeholder="π.χ. Ξυλεία για σκελετό"
          value={form.note}
          onChange={(e) => update({ note: e.target.value })}
        />

        {form.kind === 'expense' && (
          <label className="flex items-center gap-2 mb-3 text-sm">
            <input
              type="checkbox"
              checked={form.vat}
              onChange={(e) => update({ vat: e.target.checked })}
            />
            Προσθήκη ΦΠΑ 24%
          </label>
        )}

        <label className="block text-xs text-stone-500 mb-1">Ημερομηνία</label>
        <input
          type="date"
          className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-4 text-sm"
          value={form.date}
          onChange={(e) => update({ date: e.target.value })}
        />

        {error && <div className="text-xs text-rose-600 mb-2">{error}</div>}
        <button
          onClick={handleSave}
          className="w-full bg-orange-700 text-white rounded-xl py-2.5 font-medium text-sm"
        >
          Αποθήκευση
        </button>
      </div>
    </div>
  )
}
