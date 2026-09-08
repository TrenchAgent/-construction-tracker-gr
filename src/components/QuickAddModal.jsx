import { useState } from 'react'
import { X, Camera, Trash2 } from 'lucide-react'
import {
  EXPENSE_CATEGORIES,
  VAT_RATE,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
} from '../constants'
import ReceiptThumbnail from './ReceiptThumbnail'

// defaultCategory/defaultVendor: whatever was last used in this project
// (see App.jsx) — saves re-picking the same category and re-typing the
// same supplier on every entry when you're logging a run of similar
// ones, without forcing it on genuinely different entries (still just a
// starting point, both stay fully editable).
const emptyForm = (defaultCategory, defaultVendor) => ({
  kind: 'expense',
  category: defaultCategory || EXPENSE_CATEGORIES[0],
  vendor: defaultVendor || '',
  note: '',
  amount: '',
  vat: false,
  date: new Date().toISOString().slice(0, 10),
  // A brand new entry defaults to "not yet paid" — matches reality most of
  // the time (you record the expense/invoice before settling it), and
  // unlike VAT this is meant to change later, so editing an entry lets you
  // move it forward (e.g. pending → paid) at any time.
  paymentStatus: 'pending',
  paymentMethod: '',
})

// duplicateFrom: pre-fill a new entry from an existing one's values,
// except the date (today, not the original's) — the point is repeating a
// similar entry quickly, not literally re-dating the same transaction.
// The stored amount is already VAT-inclusive if VAT was on (see the note
// above the component) — reverse the markup here so the amount field
// shows the same pre-VAT figure the original was created from, letting
// the normal create-time VAT math re-apply it exactly like a fresh entry,
// instead of quietly compounding VAT on an already-final number.
function duplicateForm(source) {
  const isExpense = source.kind === 'expense'
  const preVatAmount =
    isExpense && source.vat ? Math.round((source.amount / (1 + VAT_RATE)) * 100) / 100 : source.amount
  return {
    kind: source.kind,
    category: isExpense ? source.category : EXPENSE_CATEGORIES[0],
    vendor: source.vendor || '',
    note: source.note,
    amount: String(preVatAmount),
    vat: isExpense ? source.vat : false,
    date: new Date().toISOString().slice(0, 10),
    paymentStatus: source.paymentStatus,
    paymentMethod: source.paymentMethod || '',
  }
}

// editingEntry: pass an existing entry to edit it in place instead of
// creating a new one. Note on VAT in edit mode: the stored `amount` is
// already the final, VAT-inclusive value (that's what's on disk — see
// storage.js), so editing doesn't re-run the VAT calculation or let you
// toggle it. You're editing the actual total, e.g. to fix a typo. To
// change whether VAT applies to an entry, delete it and add it again.
export default function QuickAddModal({
  onClose,
  onSave,
  editingEntry,
  duplicateFrom,
  defaultCategory,
  defaultVendor,
  onAttachReceipt,
  onRemoveReceipt,
}) {
  const isEditing = Boolean(editingEntry)
  const [form, setForm] = useState(() => {
    if (isEditing) {
      return {
        kind: editingEntry.kind,
        category: editingEntry.kind === 'expense' ? editingEntry.category : EXPENSE_CATEGORIES[0],
        vendor: editingEntry.vendor,
        note: editingEntry.note,
        amount: String(editingEntry.amount),
        vat: editingEntry.vat,
        date: editingEntry.date,
        paymentStatus: editingEntry.paymentStatus,
        paymentMethod: editingEntry.paymentMethod || '',
      }
    }
    if (duplicateFrom) return duplicateForm(duplicateFrom)
    return emptyForm(defaultCategory, defaultVendor)
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  // Receipt photo attach/remove happens immediately on its own, separate
  // from the "Αποθήκευση" button below — it's a file upload, not form
  // data, and only ever applies to an entry that already has a real id
  // (see outbox.js / EntryList.jsx for why an offline-queued entry never
  // reaches edit mode in the first place).
  const [receiptPath, setReceiptPath] = useState(editingEntry?.receiptPath || '')
  const [receiptBusy, setReceiptBusy] = useState(false)
  const [receiptError, setReceiptError] = useState('')

  async function handlePickReceipt(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // lets picking the exact same file again later still fire onChange
    if (!file) return
    setReceiptBusy(true)
    setReceiptError('')
    try {
      const path = await onAttachReceipt(editingEntry.id, file)
      setReceiptPath(path)
    } catch (err) {
      setReceiptError(err.message || 'Η μεταφόρτωση απέτυχε')
    } finally {
      setReceiptBusy(false)
    }
  }

  async function handleRemoveReceipt() {
    setReceiptBusy(true)
    setReceiptError('')
    try {
      await onRemoveReceipt(editingEntry.id, receiptPath)
      setReceiptPath('')
    } catch (err) {
      setReceiptError(err.message || 'Η αφαίρεση απέτυχε')
    } finally {
      setReceiptBusy(false)
    }
  }

  function update(patch) {
    setForm((f) => ({ ...f, ...patch }))
  }

  async function handleSave() {
    const amt = parseFloat(form.amount)
    if (!form.amount || Number.isNaN(amt) || amt <= 0) {
      setError('Δώστε έγκυρο ποσό')
      return
    }
    if (!form.note.trim()) {
      setError('Προσθέστε μια σύντομη σημείωση')
      return
    }
    // Only apply the VAT markup when creating — in edit mode `amt` is
    // already the final stored amount (see the note above the component).
    const final = !isEditing && form.kind === 'expense' && form.vat ? amt * (1 + VAT_RATE) : amt
    setBusy(true)
    setError('')
    try {
      await onSave({
        kind: form.kind,
        category: form.kind === 'expense' ? form.category : 'Είσπραξη',
        vendor: form.vendor.trim(),
        note: form.note.trim(),
        amount: Math.round(final * 100) / 100,
        // Income never carries VAT — matters in edit mode, where switching
        // an expense (possibly vat: true) to income could otherwise leave
        // a stale VAT flag on a row that no longer has a category for it.
        vat: form.kind === 'expense' ? form.vat : false,
        date: form.date,
        paymentStatus: form.paymentStatus,
        paymentMethod: form.paymentMethod,
      })
      onClose() // unmounts this component — don't touch state after this
    } catch (err) {
      setError(err.message || 'Κάτι πήγε στραβά, δοκιμάστε ξανά')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-20">
      <div
        className="bg-white w-full max-w-md rounded-t-2xl p-5"
        style={{ maxHeight: '85vh', overflowY: 'auto' }}
      >
        <div className="flex items-center mb-4">
          <h3 className="font-semibold">
            {isEditing
              ? 'Επεξεργασία καταχώρησης'
              : duplicateFrom
                ? 'Νέα καταχώρηση (αντίγραφο)'
                : 'Νέα καταχώρηση'}
          </h3>
          <button onClick={onClose} className="ml-auto text-stone-400 p-1 -m-1">
            <X size={18} />
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

        <label className="block text-xs text-stone-500 mb-1">
          Ποσό (€) {isEditing && form.kind === 'expense' && form.vat ? '— τελικό, με ΦΠΑ' : ''} *
        </label>
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

        {form.kind === 'expense' &&
          (isEditing ? (
            form.vat && (
              <p className="text-xs text-stone-400 mb-3">
                Το ΦΠΑ 24% ήταν ενεργό όταν δημιουργήθηκε — για να το αλλάξετε,
                διαγράψτε την καταχώρηση και προσθέστε τη ξανά.
              </p>
            )
          ) : (
            <label className="flex items-center gap-2 mb-3 text-sm">
              <input
                type="checkbox"
                checked={form.vat}
                onChange={(e) => update({ vat: e.target.checked })}
              />
              Προσθήκη ΦΠΑ 24%
            </label>
          ))}

        <label className="block text-xs text-stone-500 mb-1">Ημερομηνία</label>
        <input
          type="date"
          className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-3 text-sm"
          value={form.date}
          onChange={(e) => update({ date: e.target.value })}
        />

        <label className="block text-xs text-stone-500 mb-1">Κατάσταση πληρωμής</label>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {PAYMENT_STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => update({ paymentStatus: status })}
              className={
                'py-1.5 rounded-lg text-xs font-medium border ' +
                (form.paymentStatus === status
                  ? 'border-orange-700 text-orange-800 bg-orange-50'
                  : 'border-stone-300 text-stone-600')
              }
            >
              {PAYMENT_STATUS_LABELS[status]}
            </button>
          ))}
        </div>

        <label className="block text-xs text-stone-500 mb-1">Τρόπος πληρωμής (προαιρετικό)</label>
        <div className="grid grid-cols-4 gap-1.5 mb-4">
          {PAYMENT_METHODS.map((method) => (
            <button
              key={method}
              onClick={() => update({ paymentMethod: form.paymentMethod === method ? '' : method })}
              className={
                'py-1.5 rounded-lg text-[11px] font-medium border ' +
                (form.paymentMethod === method
                  ? 'border-orange-700 text-orange-800 bg-orange-50'
                  : 'border-stone-300 text-stone-600')
              }
            >
              {PAYMENT_METHOD_LABELS[method]}
            </button>
          ))}
        </div>

        {isEditing && (
          <div className="mb-4 pt-3 border-t border-stone-200">
            <label className="block text-xs text-stone-500 mb-2">
              Φωτογραφία απόδειξης (προαιρετικό)
            </label>
            {receiptPath ? (
              <div className="flex items-center gap-3">
                <ReceiptThumbnail path={receiptPath} size={56} />
                <button
                  onClick={handleRemoveReceipt}
                  disabled={receiptBusy}
                  className="text-xs text-rose-600 inline-flex items-center gap-1 disabled:opacity-60"
                >
                  <Trash2 size={13} />
                  {receiptBusy ? 'Αφαίρεση…' : 'Αφαίρεση φωτογραφίας'}
                </button>
              </div>
            ) : (
              <label
                className={
                  'border border-dashed border-stone-300 rounded-xl py-3 flex items-center justify-center gap-2 text-sm text-stone-500 ' +
                  (receiptBusy ? 'opacity-60' : 'cursor-pointer')
                }
              >
                <Camera size={16} />
                {receiptBusy ? 'Μεταφόρτωση…' : 'Προσθήκη φωτογραφίας'}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  disabled={receiptBusy}
                  onChange={handlePickReceipt}
                />
              </label>
            )}
            {receiptError && <div className="text-xs text-rose-600 mt-2">{receiptError}</div>}
          </div>
        )}

        {error && <div className="text-xs text-rose-600 mb-2">{error}</div>}
        <button
          onClick={handleSave}
          disabled={busy}
          className="w-full bg-orange-700 text-white rounded-xl py-2.5 font-medium text-sm disabled:opacity-60"
        >
          {busy ? 'Αποθήκευση…' : 'Αποθήκευση'}
        </button>
      </div>
    </div>
  )
}
