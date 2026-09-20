import { useEffect, useState } from 'react'
import { X, Archive, ArchiveRestore, FileDown, Trash2, UserPlus, Users, Briefcase } from 'lucide-react'
import {
  COLLABORATOR_ROLES,
  COLLABORATOR_ROLE_LABELS,
  COLLABORATOR_ROLE_ICONS,
  CLIENT_TYPE_ICONS,
} from '../constants'
import OptionPill from './OptionPill'
import ClientPickerModal from './ClientPickerModal'

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
        // A light touch here on purpose, not the full icon-badge
        // treatment the bigger empty moments get (EmptyMoment) — this
        // is a small, secondary line inside an already-busy settings
        // form, not a whole screen's worth of "there's nothing here."
        <div className="text-xs text-stone-400 mb-2 flex items-center gap-1.5">
          <Users size={13} />
          Δεν έχετε προσκαλέσει συνεργάτη ακόμα.
        </div>
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
                className="text-stone-300 hover:text-rose-600 text-xs shrink-0 disabled:opacity-60 inline-flex items-center gap-0.5"
              >
                <X size={12} />
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
          <OptionPill
            key={r}
            selected={role === r}
            selectedClassName="bg-rust-700"
            onClick={() => setRole(r)}
            Icon={COLLABORATOR_ROLE_ICONS[r]}
            label={COLLABORATOR_ROLE_LABELS[r]}
            iconSize={16}
          />
        ))}
      </div>
      {error && <div className="text-xs text-rose-600 mb-2">{error}</div>}
      <button
        onClick={handleInvite}
        disabled={busy}
        className="w-full border border-stone-300 text-stone-700 rounded-xl py-2 font-medium text-sm disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
      >
        <UserPlus size={15} />
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
  onArchiveToggle,
  onExport,
  onLoadCollaborators,
  onInviteCollaborator,
  onRemoveCollaborator,
  clients,
  linkedClient,
  onLinkClient,
  onCreateAndLinkClient,
  onUnlinkClient,
}) {
  const isOwner = project.role === 'owner'
  const isArchived = Boolean(project.archivedAt)
  const [showClientPicker, setShowClientPicker] = useState(false)
  const [name, setName] = useState(project.name)
  const [location, setLocation] = useState(project.location)
  const [budgetEstimate, setBudgetEstimate] = useState(
    project.budgetEstimate != null ? String(project.budgetEstimate) : '',
  )
  const [startDate, setStartDate] = useState(project.startDate || '')
  const [targetCompletionDate, setTargetCompletionDate] = useState(project.targetCompletionDate || '')
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
      await onSave({
        name: name.trim(),
        location: location.trim(),
        budgetEstimate: budgetEstimate ? parseFloat(budgetEstimate) : null,
        startDate: startDate || null,
        targetCompletionDate: targetCompletionDate || null,
      })
      onClose()
    } catch (err) {
      setError(err.message || 'Κάτι πήγε στραβά, δοκιμάστε ξανά')
      setBusy(false)
    }
  }

  // Reversible either direction, so unlike delete this needs no
  // confirmation dialog — archiving just moves the project out of the
  // active list; nothing about its data changes.
  async function handleArchiveToggle() {
    setBusy(true)
    setError('')
    try {
      await onArchiveToggle()
      onClose()
    } catch (err) {
      setError(err.message || 'Κάτι πήγε στραβά, δοκιμάστε ξανά')
      setBusy(false)
    }
  }

  // onDelete only starts the undo window now (see App.jsx's
  // startPendingDelete) — it doesn't call the server or throw, so there's
  // nothing here to await or catch. A genuine failure surfaces later,
  // asynchronously, via the app-level error banner once the undo window
  // actually finalizes the delete.
  function handleDelete() {
    const confirmed = window.confirm(
      `Διαγραφή του έργου «${project.name}»; Θα διαγραφούν και όλες οι καταχωρήσεις του. ` +
        'Μπορείτε να το αναιρέσετε για λίγα δευτερόλεπτα μετά.',
    )
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
          <h3 className="font-display font-bold text-lg flex items-center gap-1.5">
            {isOwner ? 'Ρυθμίσεις έργου' : 'Πληροφορίες έργου'}
            {isArchived && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-200 text-stone-600 font-medium inline-flex items-center gap-0.5">
                <Archive size={9} />
                Αρχειοθετημένο
              </span>
            )}
          </h3>
          <button onClick={onClose} className="ml-auto text-stone-500 p-2.5 -m-2.5">
            <X size={18} />
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
            <label className="block text-xs text-stone-500 mb-1">Αρχικός προϋπολογισμός € (προαιρετικό)</label>
            <input
              type="number"
              inputMode="decimal"
              className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-3 text-sm"
              placeholder="0.00"
              value={budgetEstimate}
              onChange={(e) => setBudgetEstimate(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="block text-xs text-stone-500 mb-1">Έναρξη (προαιρετικό)</label>
                <input
                  type="date"
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">Ολοκλήρωση (προαιρετικό)</label>
                <input
                  type="date"
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm"
                  value={targetCompletionDate}
                  onChange={(e) => setTargetCompletionDate(e.target.value)}
                />
              </div>
            </div>
            {error && <div className="text-xs text-rose-600 mb-2">{error}</div>}
            <button
              onClick={handleSave}
              disabled={busy}
              className="btn-primary w-full rounded-xl py-2.5 text-sm mb-3"
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
          className="w-full border border-stone-300 text-stone-700 rounded-xl py-2.5 font-medium text-sm mb-1 inline-flex items-center justify-center gap-1.5"
        >
          <FileDown size={15} />
          Εξαγωγή καταχωρήσεων (CSV)
        </button>

        {isOwner && (
          <button
            onClick={handleArchiveToggle}
            disabled={busy}
            className="w-full border border-stone-300 text-stone-700 rounded-xl py-2.5 font-medium text-sm mb-1 mt-2 disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
          >
            {isArchived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
            {isArchived ? 'Επαναφορά στα ενεργά έργα' : 'Αρχειοθέτηση έργου'}
          </button>
        )}

        {isOwner && (
          <>
            <div className="mb-4 pt-4 border-t border-stone-200">
              <h4 className="text-xs font-semibold text-stone-500 mb-2">Πελάτης</h4>
              {linkedClient ? (
                <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 mb-2">
                  {(() => {
                    const TypeIcon = CLIENT_TYPE_ICONS[linkedClient.type]
                    return <TypeIcon size={14} className="text-stone-400 shrink-0" />
                  })()}
                  <span className="text-sm truncate flex-1 min-w-0">{linkedClient.name}</span>
                  <button
                    onClick={onUnlinkClient}
                    className="text-stone-300 hover:text-rose-600 text-xs shrink-0 inline-flex items-center gap-0.5"
                  >
                    <X size={12} />
                    Αφαίρεση
                  </button>
                </div>
              ) : (
                <div className="text-xs text-stone-400 mb-2 flex items-center gap-1.5">
                  <Briefcase size={13} />
                  Δεν έχει οριστεί πελάτης για αυτό το έργο.
                </div>
              )}
              <button
                onClick={() => setShowClientPicker(true)}
                className="w-full border border-stone-300 text-stone-700 rounded-xl py-2 font-medium text-sm inline-flex items-center justify-center gap-1.5"
              >
                <UserPlus size={15} />
                {linkedClient ? 'Αλλαγή πελάτη' : 'Σύνδεση πελάτη'}
              </button>
            </div>

            <CollaboratorsSection
              onLoadCollaborators={onLoadCollaborators}
              onInvite={onInviteCollaborator}
              onRemove={onRemoveCollaborator}
            />
            <button
              onClick={handleDelete}
              disabled={busy}
              className="w-full text-rose-600 text-sm py-2 disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
            >
              <Trash2 size={15} />
              Διαγραφή έργου
            </button>
          </>
        )}
      </div>

      {showClientPicker && (
        <ClientPickerModal
          clients={clients}
          onClose={() => setShowClientPicker(false)}
          onSelectExisting={onLinkClient}
          onCreateAndLink={onCreateAndLinkClient}
        />
      )}
    </div>
  )
}
