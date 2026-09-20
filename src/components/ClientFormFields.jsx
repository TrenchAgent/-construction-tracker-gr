import { CLIENT_TYPES, CLIENT_TYPE_LABELS, CLIENT_TYPE_ICONS } from '../constants'
import OptionPill from './OptionPill'

// Shared between ClientModal (create/edit from Πελατολόγιο) and
// ClientPickerModal's inline-create flow (from within a project) — both
// entry points collect exactly the same fields and write to the same
// clients table, so the fields themselves live in one place rather than
// being typed out twice and drifting apart.
//
// `name` doubles as Όνομα (individual) or Επωνυμία (company) — same
// underlying column (see schema.sql), just a different label depending
// on the type toggle above it.
export default function ClientFormFields({ form, onChange }) {
  const isCompany = form.type === 'company'
  return (
    <>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {CLIENT_TYPES.map((type) => (
          <OptionPill
            key={type}
            selected={form.type === type}
            selectedClassName="bg-rust-700"
            onClick={() => onChange({ type })}
            Icon={CLIENT_TYPE_ICONS[type]}
            label={CLIENT_TYPE_LABELS[type]}
            iconSize={20}
          />
        ))}
      </div>

      <label className="block text-xs text-stone-500 mb-1">{isCompany ? 'Επωνυμία *' : 'Όνομα *'}</label>
      <input
        className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-3 text-sm"
        placeholder={isCompany ? 'π.χ. Κατασκευές Παπαδόπουλος ΑΕ' : 'π.χ. Γιώργος Παπαδόπουλος'}
        value={form.name}
        onChange={(e) => onChange({ name: e.target.value })}
      />

      <label className="block text-xs text-stone-500 mb-1">ΑΦΜ (προαιρετικό)</label>
      <input
        className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-3 text-sm"
        placeholder="π.χ. 123456789"
        value={form.afm}
        onChange={(e) => onChange({ afm: e.target.value })}
      />

      {isCompany && (
        <>
          <label className="block text-xs text-stone-500 mb-1">ΓΕΜΗ (προαιρετικό)</label>
          <input
            className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-3 text-sm"
            value={form.gemi}
            onChange={(e) => onChange({ gemi: e.target.value })}
          />

          <label className="block text-xs text-stone-500 mb-1">ΔΟΥ (προαιρετικό)</label>
          <input
            className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-3 text-sm"
            value={form.doy}
            onChange={(e) => onChange({ doy: e.target.value })}
          />
        </>
      )}

      <label className="block text-xs text-stone-500 mb-1">Διεύθυνση (προαιρετικό)</label>
      <input
        className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-3 text-sm"
        value={form.address}
        onChange={(e) => onChange({ address: e.target.value })}
      />

      <label className="block text-xs text-stone-500 mb-1">Email (προαιρετικό)</label>
      <input
        type="email"
        className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-3 text-sm"
        value={form.email}
        onChange={(e) => onChange({ email: e.target.value })}
      />
    </>
  )
}
