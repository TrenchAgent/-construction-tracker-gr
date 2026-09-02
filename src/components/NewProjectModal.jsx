import { useState } from 'react'

export default function NewProjectModal({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [error, setError] = useState('')

  function handleCreate() {
    if (!name.trim()) {
      setError('Δώστε όνομα έργου')
      return
    }
    onCreate({ name: name.trim(), location: location.trim() })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-20">
      <div className="bg-white w-full max-w-md rounded-t-2xl p-5">
        <div className="flex items-center mb-4">
          <h3 className="font-semibold">Νέο έργο</h3>
          <button onClick={onClose} className="ml-auto text-stone-400 text-lg">
            ×
          </button>
        </div>
        <label className="block text-xs text-stone-500 mb-1">Όνομα έργου *</label>
        <input
          className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-3 text-sm"
          placeholder="π.χ. Κατοικία Παπαδόπουλου"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label className="block text-xs text-stone-500 mb-1">Τοποθεσία (προαιρετικό)</label>
        <input
          className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-3 text-sm"
          placeholder="π.χ. Χαλάνδρι"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        {error && <div className="text-xs text-rose-600 mb-2">{error}</div>}
        <button
          onClick={handleCreate}
          className="w-full bg-orange-700 text-white rounded-xl py-2.5 font-medium text-sm mt-1"
        >
          Δημιουργία έργου
        </button>
      </div>
    </div>
  )
}
