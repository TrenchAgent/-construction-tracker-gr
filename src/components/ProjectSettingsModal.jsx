import { useState } from 'react'

export default function ProjectSettingsModal({ project, onClose, onSave, onDelete, onExport }) {
  const [name, setName] = useState(project.name)
  const [location, setLocation] = useState(project.location)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSave() {
    if (!name.trim()) {
      setError('Δώστε όνομα έργου')
      return
    }
    setBusy(true)
    setError('')
    try {
      await onSave({ name: name.trim(), location: location.trim() })
      onClose()
    } catch (err) {
      setError(err.message || 'Κάτι πήγε στραβά, δοκιμάστε ξανά')
      setBusy(false)
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Διαγραφή του έργου «${project.name}»; Θα διαγραφούν μόνιμα και όλες οι καταχωρήσεις του. Δεν αναιρείται.`,
    )
    if (!confirmed) return
    setBusy(true)
    setError('')
    try {
      await onDelete()
      onClose()
    } catch (err) {
      setError(err.message || 'Η διαγραφή απέτυχε')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-20">
      <div className="bg-white w-full max-w-md rounded-t-2xl p-5">
        <div className="flex items-center mb-4">
          <h3 className="font-semibold">Ρυθμίσεις έργου</h3>
          <button onClick={onClose} className="ml-auto text-stone-400 text-lg">
            ×
          </button>
        </div>
        <label className="block text-xs text-stone-500 mb-1">Όνομα έργου *</label>
        <input
          className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-3 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label className="block text-xs text-stone-500 mb-1">Τοποθεσία (προαιρετικό)</label>
        <input
          className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-3 text-sm"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        {error && <div className="text-xs text-rose-600 mb-2">{error}</div>}
        <button
          onClick={handleSave}
          disabled={busy}
          className="w-full bg-orange-700 text-white rounded-xl py-2.5 font-medium text-sm mb-3 disabled:opacity-60"
        >
          {busy ? 'Αποθήκευση…' : 'Αποθήκευση αλλαγών'}
        </button>
        <button
          onClick={onExport}
          className="w-full border border-stone-300 text-stone-700 rounded-xl py-2.5 font-medium text-sm mb-3"
        >
          Εξαγωγή καταχωρήσεων (CSV)
        </button>
        <button
          onClick={handleDelete}
          disabled={busy}
          className="w-full text-rose-600 text-sm py-2 disabled:opacity-60"
        >
          Διαγραφή έργου
        </button>
      </div>
    </div>
  )
}
