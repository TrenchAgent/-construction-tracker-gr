import { useEffect, useState } from 'react'
import { COLLABORATOR_ROLES, COLLABORATOR_ROLE_LABELS } from '../constants'

function CollaboratorsSection({ onLoadCollaborators, onInvite, onRemove }) {
  const [collaborators, setCollaborators] = useState(null) // null = loading
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('editor')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function refresh() {
    try {
      setCollaborators(await onLoadCollaborators())
    } catch (err) {
      setError(err.message || 'Σφάλμα φόρτωσης συνεργατών')
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleInvite() {
    if (!email.trim()) {
      setError('Δώστε email συνεργάτη')
      return
    }
    setBusy(true)
    setError('')
    try {
      await onInvite({ email: email.trim(), role })
      setEmail('')
      await refresh()
    } catch (err) {
      // Postgres unique-violation code for the (project_id, email) constraint.
      if (err.code === '23505') {
        setError('Αυτό το email έχει ήδη προσκληθεί σε αυτό το έργο')
      } else {
        setError(err.message || 'Κάτι πήγε στραβά, δοκιμάστε ξανά')
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove(id) {
    setBusy(true)
    setError('')
    try {
      await onRemove(id)
      await refresh()
    } catch (err) {
      setError(err.message || 'Η αφαίρεση απέτυχε')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-4 pt-4 border-t border-stone-200">
      <h4 className="text-xs font-semibold text-stone-500 mb-2">Συνεργάτες</h4>

      {collaborators === null ? (
        <div className="text-xs text-stone-400 mb-2">Φόρτωση…</div>
      ) : collaborators.length === 0 ? (
        <div className="text-xs text-stone-400 mb-2">Κανένας συνεργάτης ακόμα.</div>
      ) : (
        <div className="space-y-1.5 mb-3">
          {collaborators.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5"
            >
              <span className="text-sm truncate flex-1 min-w-0">{c.email}</span>
              <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-stone-200 text-stone-600 shrink-0">
                {COLLABORATOR_ROLE_LABELS[c.role] || c.role}
              </span>
              <button
                onClick={() => handleRemove(c.id)}
                disabled={busy}
                className="text-stone-300 hover:text-rose-600 text-xs shrink-0 disabled:opacity-60"
              >
                Αφαίρεση
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        type="email"
        className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-2 text-sm"
        placeholder="Email συνεργάτη"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2 mb-2">
        {COLLABORATOR_ROLES.map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={
              'py-1.5 rounded-lg text-xs font-medium border ' +
              (role === r
                ? 'border-orange-700 text-orange-800 bg-orange-50'
                : 'border-stone-300 text-stone-600')
            }
          >
            {COLLABORATOR_ROLE_LABELS[r]}
          </button>
        ))}
      </div>
      {error && <div className="text-xs text-rose-600 mb-2">{error}</div>}
      <button
        onClick={handleInvite}
        disabled={busy}
        className="w-full border border-stone-300 text-stone-700 rounded-xl py-2 font-medium text-sm disabled:opacity-60"
      >
        {busy ? 'Πρόσκληση…' : 'Πρόσκληση συνεργάτη'}
      </button>
    </div>
  )
}

export default function ProjectSettingsModal({
  project,
  onClose,
  onSave,
  onDelete,
  onExport,
  onLoadCollaborators,
  onInviteCollaborator,
  onRemoveCollaborator,
}) {
  const isOwner = project.role === 'owner'
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
      <div
        className="bg-white w-full max-w-md rounded-t-2xl p-5"
        style={{ maxHeight: '85vh', overflowY: 'auto' }}
      >
        <div className="flex items-center mb-4">
          <h3 className="font-semibold">{isOwner ? 'Ρυθμίσεις έργου' : 'Πληροφορίες έργου'}</h3>
          <button onClick={onClose} className="ml-auto text-stone-400 text-lg">
            ×
          </button>
        </div>

        {isOwner ? (
          <>
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
          </>
        ) : (
          <p className="text-sm text-stone-500 mb-3">
            Είστε συνεργάτης σε αυτό το έργο —{' '}
            {project.role === 'editor' ? 'μπορείτε να επεξεργαστείτε τις καταχωρήσεις.' : 'έχετε πρόσβαση προβολής.'}
          </p>
        )}

        <button
          onClick={onExport}
          className="w-full border border-stone-300 text-stone-700 rounded-xl py-2.5 font-medium text-sm mb-1"
        >
          Εξαγωγή καταχωρήσεων (CSV)
        </button>

        {isOwner && (
          <>
            <CollaboratorsSection
              onLoadCollaborators={onLoadCollaborators}
              onInvite={onInviteCollaborator}
              onRemove={onRemoveCollaborator}
            />
            <button
              onClick={handleDelete}
              disabled={busy}
              className="w-full text-rose-600 text-sm py-2 disabled:opacity-60"
            >
              Διαγραφή έργου
            </button>
          </>
        )}
      </div>
    </div>
  )
}
