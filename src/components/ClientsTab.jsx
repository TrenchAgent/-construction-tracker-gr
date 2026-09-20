import { useState } from 'react'
import { Plus, Search, Briefcase, ChevronLeft } from 'lucide-react'
import { CLIENT_TYPE_ICONS } from '../constants'
import EmptyMoment from './EmptyMoment'

// Client-side filtering over the already-fetched full list, same
// approach as EntryFilterBar — the list this app deals with (one user's
// own clients) is small enough that a server round-trip per keystroke
// would be pure overhead, not a real scalability need.
function matches(client, query) {
  if (!query) return true
  const q = query.trim().toLowerCase()
  return (
    client.name.toLowerCase().includes(q) ||
    client.afm.toLowerCase().includes(q) ||
    client.address.toLowerCase().includes(q) ||
    client.email.toLowerCase().includes(q)
  )
}

export default function ClientsTab({ clients, onBack, onSelectClient, onNewClient }) {
  const [query, setQuery] = useState('')
  const filtered = clients.filter((c) => matches(c, query))

  return (
    <div className="p-4 pb-24">
      <button
        onClick={onBack}
        className="text-xs text-stone-500 flex items-center gap-1 mb-3 py-2.5 -my-2.5 -ml-1.5 px-1.5 rounded-lg active:bg-stone-100"
      >
        <ChevronLeft size={14} />
        Πίσω στα έργα μου
      </button>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-bold text-lg text-stone-800">Πελατολόγιο</h2>
        <button onClick={onNewClient} className="btn-primary text-xs rounded-lg px-3 py-2 flex items-center gap-1">
          <Plus size={13} />
          Νέος πελάτης
        </button>
      </div>

      {clients.length > 0 && (
        <div className="relative mb-3">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            className="w-full border border-stone-300 rounded-lg pl-9 pr-3 py-2 text-sm bg-white"
            placeholder="Αναζήτηση με όνομα, ΑΦΜ, διεύθυνση ή email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

      {clients.length === 0 ? (
        <EmptyMoment
          Icon={Briefcase}
          title="Δεν έχετε προσθέσει πελάτες ακόμα"
          action={
            <button onClick={onNewClient} className="btn-primary px-4 py-2.5 rounded-xl text-sm inline-flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              Νέος πελάτης
            </button>
          }
        >
          Προσθέστε τον πρώτο σας πελάτη εδώ, ή μέσα από τις ρυθμίσεις ενός έργου.
        </EmptyMoment>
      ) : filtered.length === 0 ? (
        <EmptyMoment Icon={Search} tone="stone" title="Κανένας πελάτης δεν ταιριάζει">
          Δοκιμάστε διαφορετικούς όρους αναζήτησης.
        </EmptyMoment>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const TypeIcon = CLIENT_TYPE_ICONS[c.type]
            return (
              <button
                key={c.id}
                onClick={() => onSelectClient(c)}
                className="w-full text-left bg-white rounded-xl p-4 shadow-card active:bg-stone-50 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-rust-100 text-rust-800 shrink-0 flex items-center justify-center">
                  <TypeIcon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-display font-bold text-base truncate">{c.name}</div>
                  {c.afm && <div className="text-xs text-stone-500">ΑΦΜ: {c.afm}</div>}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
