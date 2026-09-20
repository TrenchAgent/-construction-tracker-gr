import { useEffect, useState } from 'react'
import { X, Trash2, Briefcase } from 'lucide-react'
import ClientFormFields from './ClientFormFields'

const emptyForm = () => ({ type: 'individual', name: '', afm: '', gemi: '', doy: '', address: '', email: '' })

function clientToForm(client) {
  return {
    type: client.type,
    name: client.name,
    afm: client.afm,
    gemi: client.gemi,
    doy: client.doy,
    address: client.address,
    email: client.email,
  }
}

// Create when `client` is null, edit when it's a real client — same
// "one modal, two modes" pattern as QuickAddModal. Editing also shows a
// read-only "Συνδεδεμένα έργα" section (which project(s) this client is
// on) — the whole reason clients are a shared entity and not per-project
// duplicate data, so it's worth surfacing right where you'd look for it.
export default function ClientModal({ client, onClose, onSave, onDelete, onLoadLinkedProjects }) {
  const isEditing = Boolean(client)
  const [form, setForm] = useState(() => (isEditing ? clientToForm(client) : emptyForm()))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [linkedProjects, setLinkedProjects] = useState(null) // null = loading

  useEffect(() => {
    if (!isEditing) return
    let cancelled = false
    onLoadLinkedProjects(client.id)
      .then((projects) => {
        if (!cancelled) setLinkedProjects(projects)
      })
      .catch(() => {
        if (!cancelled) setLinkedProjects([])
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function update(patch) {
    setForm((f) => ({ ...f, ...patch }))
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError(form.type === 'company' ? 'Δώστε επωνυμία' : 'Δώστε όνομα')
      return
    }
    setBusy(true)
    setError('')
    try {
      await onSave({
        type: form.type,
        name: form.name.trim(),
        afm: form.afm.trim(),
        gemi: form.type === 'company' ? form.gemi.trim() : '',
        doy: form.type === 'company' ? form.doy.trim() : '',
        address: form.address.trim(),
        email: form.email.trim(),
      })
      onClose() // unmounts this component — don't touch state after this
    } catch (err) {
      setError(err.message || 'Κάτι πήγε στραβά, δοκιμάστε ξανά')
      setBusy(false)
    }
  }

  // Same deferred-delete contract as project/entry delete elsewhere in
  // the app — onDelete only starts the undo window, nothing here to
  // await or catch.
  function handleDelete() {
    const confirmed = window.confirm(`Διαγραφή του πελάτη «${client.name}»;`)
    if (!confirmed) return
    onDelete()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-20">
      <div
        className="bg-white w-full max-w-md rounded-t-2xl p-5 shadow-modal"
        style={{ maxHeight: '85vh', overflowY: 'auto' }}
      >
        <div className="flex items-center mb-4">
          <h3 className="font-display font-bold text-lg">{isEditing ? 'Επεξεργασία πελάτη' : 'Νέος πελάτης'}</h3>
          <button onClick={onClose} className="ml-auto text-stone-500 p-2.5 -m-2.5">
            <X size={18} />
          </button>
        </div>

        <ClientFormFields form={form} onChange={update} />

        {isEditing && (
          <div className="mb-4 pt-3 border-t border-stone-200">
            <label className="block text-xs text-stone-500 mb-2">Συνδεδεμένα έργα</label>
            {linkedProjects === null ? (
              <div className="text-xs text-stone-400">Φόρτωση…</div>
            ) : linkedProjects.length === 0 ? (
              <div className="text-xs text-stone-400 flex items-center gap-1.5">
                <Briefcase size={13} />
                Δεν είναι συνδεδεμένος με κάποιο έργο ακόμα.
              </div>
            ) : (
              <div className="space-y-1.5">
                {linkedProjects.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5"
                  >
                    <Briefcase size={13} className="text-stone-400 shrink-0" />
                    <span className="text-sm truncate">{p.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {error && <div className="text-xs text-rose-600 mb-2">{error}</div>}
        <button onClick={handleSave} disabled={busy} className="btn-primary w-full rounded-xl py-2.5 text-sm mb-1">
          {busy ? 'Αποθήκευση…' : 'Αποθήκευση'}
        </button>

        {isEditing && (
          <button
            onClick={handleDelete}
            disabled={busy}
            className="w-full text-rose-600 text-sm py-2 mt-2 disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
          >
            <Trash2 size={15} />
            Διαγραφή πελάτη
          </button>
        )}
      </div>
    </div>
  )
}
