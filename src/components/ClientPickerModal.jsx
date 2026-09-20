import { useState } from 'react'
import { X, Plus, Search, ChevronLeft } from 'lucide-react'
import { CLIENT_TYPE_ICONS } from '../constants'
import ClientFormFields from './ClientFormFields'

const emptyForm = () => ({ type: 'individual', name: '', afm: '', gemi: '', doy: '', address: '', email: '' })

// Reached from ProjectSettingsModal's "Πελάτης" section — the "link an
// existing one, or create inline" entry point named explicitly in the
// spec. Both paths end up calling the same onSelectExisting/onCreateAndLink
// props, which App.jsx wires to the exact same setProjectClient/addClient
// storage functions the Πελατολόγιο tab uses — one underlying table,
// never duplicated data, regardless of which door you came in through.
export default function ClientPickerModal({ clients, onClose, onSelectExisting, onCreateAndLink }) {
  const [creating, setCreating] = useState(clients.length === 0)
  const [query, setQuery] = useState('')
  const [form, setForm] = useState(emptyForm())
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const filtered = clients.filter((c) => {
    if (!query.trim()) return true
    const q = query.trim().toLowerCase()
    return c.name.toLowerCase().includes(q) || c.afm.toLowerCase().includes(q)
  })

  async function handleSelect(clientId) {
    setBusy(true)
    setError('')
    try {
      await onSelectExisting(clientId)
      onClose()
    } catch (err) {
      setError(err.message || 'Κάτι πήγε στραβά, δοκιμάστε ξανά')
      setBusy(false)
    }
  }

  function update(patch) {
    setForm((f) => ({ ...f, ...patch }))
  }

  async function handleCreate() {
    if (!form.name.trim()) {
      setError(form.type === 'company' ? 'Δώστε επωνυμία' : 'Δώστε όνομα')
      return
    }
    setBusy(true)
    setError('')
    try {
      await onCreateAndLink({
        type: form.type,
        name: form.name.trim(),
        afm: form.afm.trim(),
        gemi: form.type === 'company' ? form.gemi.trim() : '',
        doy: form.type === 'company' ? form.doy.trim() : '',
        address: form.address.trim(),
        email: form.email.trim(),
      })
      onClose()
    } catch (err) {
      setError(err.message || 'Κάτι πήγε στραβά, δοκιμάστε ξανά')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-30">
      <div
        className="bg-white w-full max-w-md rounded-t-2xl p-5 shadow-modal"
        style={{ maxHeight: '85vh', overflowY: 'auto' }}
      >
        <div className="flex items-center mb-4">
          {creating && clients.length > 0 ? (
            <button
              onClick={() => {
                setCreating(false)
                setError('')
              }}
              className="text-stone-500 p-2.5 -ml-2.5 -my-2.5 rounded-lg active:bg-stone-100"
            >
              <ChevronLeft size={18} />
            </button>
          ) : null}
          <h3 className="font-display font-bold text-lg">{creating ? 'Νέος πελάτης' : 'Σύνδεση πελάτη'}</h3>
          <button onClick={onClose} className="ml-auto text-stone-500 p-2.5 -m-2.5">
            <X size={18} />
          </button>
        </div>

        {creating ? (
          <>
            <ClientFormFields form={form} onChange={update} />
            {error && <div className="text-xs text-rose-600 mb-2">{error}</div>}
            <button onClick={handleCreate} disabled={busy} className="btn-primary w-full rounded-xl py-2.5 text-sm">
              {busy ? 'Δημιουργία…' : 'Δημιουργία και σύνδεση'}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setCreating(true)}
              className="w-full border border-dashed border-stone-300 text-stone-600 rounded-xl py-2.5 text-sm font-medium mb-3 inline-flex items-center justify-center gap-1.5 active:bg-stone-50"
            >
              <Plus size={15} />
              Νέος πελάτης
            </button>

            <div className="relative mb-3">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                className="w-full border border-stone-300 rounded-lg pl-9 pr-3 py-2 text-sm"
                placeholder="Αναζήτηση με όνομα ή ΑΦΜ…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            {error && <div className="text-xs text-rose-600 mb-2">{error}</div>}

            <div className="space-y-1.5">
              {filtered.map((c) => {
                const TypeIcon = CLIENT_TYPE_ICONS[c.type]
                return (
                  <button
                    key={c.id}
                    onClick={() => handleSelect(c.id)}
                    disabled={busy}
                    className="w-full text-left flex items-center gap-2.5 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 disabled:opacity-60 active:bg-stone-100"
                  >
                    <TypeIcon size={15} className="text-stone-400 shrink-0" />
                    <span className="text-sm truncate flex-1 min-w-0">{c.name}</span>
                    {c.afm && <span className="text-xs text-stone-400 shrink-0">ΑΦΜ: {c.afm}</span>}
                  </button>
                )
              })}
              {filtered.length === 0 && (
                <div className="text-xs text-stone-400 text-center py-3">Κανένας πελάτης δεν ταιριάζει.</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
