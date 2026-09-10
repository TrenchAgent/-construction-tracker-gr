import { useEffect, useState } from 'react'
import { HardHat } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

// This screen has no server of its own to rate-limit — every click here
// is a direct call to Supabase's own auth API, which has the real,
// server-side rate limit on how many sign-in emails an address can be
// sent (Supabase dashboard → Authentication → Rate Limits). This cooldown
// is a courtesy on top of that, not a replacement for it: it stops one
// person's own repeated taps from spamming their own inbox and, since
// it's a plain in-memory timer, anyone could bypass it from devtools in
// two seconds. It exists for the same reason a "resend" link elsewhere
// usually disables itself for a few seconds, not as a security boundary.
const RESEND_COOLDOWN_SECONDS = 30

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  async function sendLink() {
    if (!email.trim()) {
      setError('Δώστε το email σας')
      return
    }
    if (cooldown > 0) return
    setBusy(true)
    setError('')
    // emailRedirectTo must be one of the "Redirect URLs" allowed in the
    // Supabase dashboard (Authentication → URL Configuration) — see README.
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })
    setBusy(false)
    if (sendError) {
      setError(sendError.message)
      return
    }
    setSent(true)
    setCooldown(RESEND_COOLDOWN_SECONDS)
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-stone-50 flex flex-col items-center justify-center px-6 text-stone-900">
      <HardHat size={40} strokeWidth={1.75} className="text-rust-700 mb-3" />
      <h1 className="font-semibold text-lg mb-1">Διαχείριση Έργου</h1>
      <p className="text-sm text-stone-500 mb-1 text-center">
        Συνδεθείτε με το email σας για να βλέπετε τα έργα σας σε κάθε συσκευή.
      </p>
      <p className="text-xs text-stone-400 mb-6 text-center">
        Πρώτη φορά εδώ; Ο λογαριασμός σας δημιουργείται αυτόματα.
      </p>

      <div className="w-full bg-white border border-stone-200 rounded-xl p-5">
        {sent ? (
          <>
            <p className="text-sm text-stone-600 mb-3">
              Στείλαμε ένα email στο <strong>{email}</strong>. Ανοίξτε το και
              πατήστε τον σύνδεσμο σύνδεσης — θα σας φέρει πίσω εδώ,
              συνδεδεμένους.
            </p>
            {error && <div className="text-xs text-rose-600 mb-2">{error}</div>}
            <button
              onClick={sendLink}
              disabled={busy || cooldown > 0}
              className="w-full border border-stone-300 text-stone-700 rounded-xl py-2.5 font-medium text-sm disabled:opacity-60"
            >
              {busy ? 'Αποστολή…' : cooldown > 0 ? `Αποστολή ξανά (${cooldown})` : 'Αποστολή ξανά'}
            </button>
            <button
              onClick={() => {
                setSent(false)
                setError('')
              }}
              className="w-full text-stone-400 text-xs py-2.5 mt-1"
            >
              Χρήση άλλου email
            </button>
          </>
        ) : (
          <>
            <label className="block text-xs text-stone-500 mb-1">Email</label>
            <input
              type="email"
              autoFocus
              className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-3 text-sm"
              placeholder="π.χ. giannis@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendLink()}
            />
            {error && <div className="text-xs text-rose-600 mb-2">{error}</div>}
            <button
              onClick={sendLink}
              disabled={busy}
              className="w-full bg-rust-700 text-white rounded-xl py-2.5 font-medium text-sm disabled:opacity-60"
            >
              {busy ? 'Αποστολή…' : 'Αποστολή συνδέσμου'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
