import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function sendLink() {
    if (!email.trim()) {
      setError('Δώστε το email σας')
      return
    }
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
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-stone-50 flex flex-col items-center justify-center px-6 text-stone-900">
      <div className="text-4xl mb-3">🏗️</div>
      <h1 className="font-semibold text-lg mb-1">Διαχείριση Έργου</h1>
      <p className="text-sm text-stone-500 mb-6 text-center">
        Συνδεθείτε με το email σας για να βλέπετε τα έργα σας σε κάθε συσκευή.
      </p>

      <div className="w-full bg-white border border-stone-200 rounded-xl p-5">
        {sent ? (
          <p className="text-sm text-stone-600">
            Στείλαμε ένα email στο <strong>{email}</strong>. Ανοίξτε το και
            πατήστε τον σύνδεσμο σύνδεσης — θα σας φέρει πίσω εδώ,
            συνδεδεμένους.
          </p>
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
              className="w-full bg-orange-700 text-white rounded-xl py-2.5 font-medium text-sm disabled:opacity-60"
            >
              {busy ? 'Αποστολή…' : 'Αποστολή συνδέσμου'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
