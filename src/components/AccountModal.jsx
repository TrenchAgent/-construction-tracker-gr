import { useEffect, useState } from 'react'
import { getSubscription, startCheckout } from '../lib/billing'

const PRICE_LABEL = '19,00 €/μήνα' // placeholder — swap for a real price whenever that's decided
const TRIAL_DAYS = 14

function formatDateGr(iso) {
  return new Date(iso).toLocaleDateString('el-GR')
}

function daysLeft(iso) {
  return Math.max(0, Math.ceil((new Date(iso) - new Date()) / (1000 * 60 * 60 * 24)))
}

export default function AccountModal({ email, justCheckedOut, onClose }) {
  const [subscription, setSubscription] = useState(undefined) // undefined = loading
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    let attempts = 0

    // Right after a successful checkout, Stripe's webhook may take a
    // second or two to arrive and update the subscriptions row — poll a
    // few times rather than showing a stale "no subscription" state.
    async function load() {
      try {
        const sub = await getSubscription()
        if (cancelled) return
        if (justCheckedOut && !sub && attempts < 5) {
          attempts += 1
          setTimeout(load, 1500)
          return
        }
        setSubscription(sub)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Σφάλμα φόρτωσης συνδρομής')
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleUpgrade() {
    setBusy(true)
    setError('')
    try {
      await startCheckout() // redirects the page — nothing to do after this on success
    } catch (err) {
      setError(err.message || 'Κάτι πήγε στραβά, δοκιμάστε ξανά')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-20">
      <div className="bg-white w-full max-w-md rounded-t-2xl p-5">
        <div className="flex items-center mb-4">
          <h3 className="font-semibold">Λογαριασμός</h3>
          <button onClick={onClose} className="ml-auto text-stone-400 text-lg">
            ×
          </button>
        </div>

        <div className="text-sm text-stone-500 mb-4">{email}</div>

        {subscription === undefined ? (
          <div className="text-sm text-stone-400">Φόρτωση…</div>
        ) : (
          <StatusCard
            subscription={subscription}
            busy={busy}
            error={error}
            onUpgrade={handleUpgrade}
          />
        )}
      </div>
    </div>
  )
}

function StatusCard({ subscription, busy, error, onUpgrade }) {
  const status = subscription?.status

  if (status === 'trialing') {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="font-semibold text-blue-900 mb-1">Δωρεάν δοκιμή</div>
        <div className="text-sm text-blue-800">
          {daysLeft(subscription.current_period_end)} ημέρες ακόμα — η συνδρομή θα ξεκινήσει
          στις {formatDateGr(subscription.current_period_end)}.
        </div>
      </div>
    )
  }

  if (status === 'active') {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <div className="font-semibold text-emerald-900 mb-1">Ενεργή συνδρομή</div>
        <div className="text-sm text-emerald-800">
          Ανανεώνεται στις {formatDateGr(subscription.current_period_end)}.
        </div>
      </div>
    )
  }

  if (status === 'past_due' || status === 'unpaid') {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
        <div className="font-semibold text-rose-900 mb-1">Πρόβλημα πληρωμής</div>
        <div className="text-sm text-rose-800">
          Η πληρωμή της συνδρομής απέτυχε — ελέγξτε τα στοιχεία κάρτας σας.
        </div>
      </div>
    )
  }

  // status is 'canceled', 'incomplete_expired', or there's no row at all
  // (never started a checkout) — same upgrade prompt either way.
  return (
    <div className="border border-stone-200 rounded-xl p-4">
      {status === 'canceled' && (
        <div className="text-sm text-rose-600 mb-2">Η συνδρομή σας έχει ακυρωθεί.</div>
      )}
      <div className="font-semibold mb-1">Απλή μηνιαία συνδρομή</div>
      <div className="text-2xl font-semibold mb-1">{PRICE_LABEL}</div>
      <div className="text-sm text-stone-500 mb-4">{TRIAL_DAYS} ημέρες δωρεάν δοκιμή, χωρίς χρέωση μέχρι τότε.</div>
      {error && <div className="text-xs text-rose-600 mb-2">{error}</div>}
      <button
        onClick={onUpgrade}
        disabled={busy}
        className="w-full bg-orange-700 text-white rounded-xl py-2.5 font-medium text-sm disabled:opacity-60"
      >
        {busy ? 'Μεταφορά…' : 'Ξεκινήστε τη δωρεάν δοκιμή'}
      </button>
    </div>
  )
}
