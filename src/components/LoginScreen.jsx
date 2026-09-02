import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// Email OTP as a typed code, not a clicked link. On an installed PWA
// (standalone display mode, no address bar) a "click this link" email can
// open in the phone's regular browser instead of the installed app, which
// leaves the app itself still logged out. Typing a short code back into the
// app avoids that entirely — the user never has to leave the app.
export default function LoginScreen() {
  const [step, setStep] = useState('email') // 'email' | 'code'
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function sendCode() {
    if (!email.trim()) {
      setError('Δώστε το email σας')
      return
    }
    setBusy(true)
    setError('')
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
    })
    setBusy(false)
    if (sendError) {
      setError(sendError.message)
      return
    }
    setStep('code')
  }

  async function verifyCode() {
    if (!code.trim()) {
      setError('Δώστε τον 6ψήφιο κωδικό')
      return
    }
    setBusy(true)
    setError('')
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    })
    setBusy(false)
    if (verifyError) {
      setError(verifyError.message)
      return
    }
    // On success supabase-js stores the session itself and notifies every
    // listener via onAuthStateChange — AuthGate is subscribed to that and
    // will swap this screen out for the app. Nothing else to do here.
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-stone-50 flex flex-col items-center justify-center px-6 text-stone-900">
      <div className="text-4xl mb-3">🏗️</div>
      <h1 className="font-semibold text-lg mb-1">Διαχείριση Έργου</h1>
      <p className="text-sm text-stone-500 mb-6 text-center">
        Συνδεθείτε με το email σας για να βλέπετε τα έργα σας σε κάθε συσκευή.
      </p>

      <div className="w-full bg-white border border-stone-200 rounded-xl p-5">
        {step === 'email' ? (
          <>
            <label className="block text-xs text-stone-500 mb-1">Email</label>
            <input
              type="email"
              autoFocus
              className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-3 text-sm"
              placeholder="π.χ. giannis@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendCode()}
            />
            {error && <div className="text-xs text-rose-600 mb-2">{error}</div>}
            <button
              onClick={sendCode}
              disabled={busy}
              className="w-full bg-orange-700 text-white rounded-xl py-2.5 font-medium text-sm disabled:opacity-60"
            >
              {busy ? 'Αποστολή…' : 'Αποστολή κωδικού'}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-stone-600 mb-3">
              Στείλαμε 6ψήφιο κωδικό στο <strong>{email}</strong>. Ελέγξτε το
              email σας και γράψτε τον κωδικό εδώ.
            </p>
            <label className="block text-xs text-stone-500 mb-1">Κωδικός</label>
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-3 text-sm tracking-widest text-center"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && verifyCode()}
            />
            {error && <div className="text-xs text-rose-600 mb-2">{error}</div>}
            <button
              onClick={verifyCode}
              disabled={busy}
              className="w-full bg-orange-700 text-white rounded-xl py-2.5 font-medium text-sm disabled:opacity-60"
            >
              {busy ? 'Σύνδεση…' : 'Σύνδεση'}
            </button>
            <button
              onClick={() => {
                setStep('email')
                setCode('')
                setError('')
              }}
              className="w-full text-center text-xs text-stone-400 mt-3"
            >
              Λάθος email; Πίσω
            </button>
          </>
        )}
      </div>
    </div>
  )
}
