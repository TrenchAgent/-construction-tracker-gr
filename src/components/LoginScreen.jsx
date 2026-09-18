import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import BrandMark from './BrandMark'

// Email+password now, not the old magic-link flow — too much broke
// around email deliverability (a Resend sandbox that only delivers to
// the account's own signup address, then Supabase's own built-in sender's
// shared 2-emails/hour project-wide cap) to keep relying on email being
// reachable just to sign in. This screen has zero email dependency of
// its own now — see the README for the one dashboard setting that still
// needs to be off for that to be true end-to-end (Confirm email).
const MIN_PASSWORD_LENGTH = 8

// Supabase's auth API answers in English — keyed on error.code (a stable
// identifier, not error.message, which is just English prose that could
// reword itself without notice). These are the codes email+password
// sign-in/sign-up can actually hit; the old mapping here was keyed on
// magic-link-specific codes and is gone along with the flow it
// described — except over_email_send_rate_limit, kept for now: verified
// live that it can still fire on signup as long as "Confirm email" is
// on in the Supabase dashboard (signUp still tries to send a
// confirmation email before a session exists) — see the README for that
// setting. Once it's off, this code shouldn't come up again from this
// screen; harmless to leave mapped either way.
const AUTH_ERROR_MESSAGES = {
  invalid_credentials: 'Λάθος email ή κωδικός.',
  email_address_invalid: 'Αυτό δεν μοιάζει με έγκυρο email. Ελέγξτε το και δοκιμάστε ξανά.',
  weak_password: `Ο κωδικός πρέπει να έχει τουλάχιστον ${MIN_PASSWORD_LENGTH} χαρακτήρες.`,
  user_already_exists: 'Υπάρχει ήδη λογαριασμός με αυτό το email. Δοκιμάστε να συνδεθείτε.',
  email_exists: 'Υπάρχει ήδη λογαριασμός με αυτό το email. Δοκιμάστε να συνδεθείτε.',
  over_email_send_rate_limit: 'Δεν είναι δυνατή η δημιουργία λογαριασμού αυτή τη στιγμή (όριο αποστολής email). Δοκιμάστε ξανά σε λίγο.',
  signup_disabled: 'Η εγγραφή δεν είναι διαθέσιμη αυτή τη στιγμή.',
  email_provider_disabled: 'Η σύνδεση μέσω email δεν είναι διαθέσιμη αυτή τη στιγμή.',
  // Password auth still shares Supabase's project-wide request-rate
  // limiter (a different, much higher limiter than the email-sending one
  // that caused all the trouble — see "Rate limit for sign-ups and
  // sign-ins" in the same dashboard screen) — kept mapped in case it's
  // ever actually hit, not because it's expected to be.
  over_request_rate_limit: 'Πάρα πολλές προσπάθειες προς το παρόν. Περιμένετε λίγο και δοκιμάστε ξανά.',
}
const AUTH_ERROR_FALLBACK = 'Κάτι πήγε στραβά. Δοκιμάστε ξανά σε λίγο.'
const AUTH_ERROR_NO_CONNECTION = 'Δεν ήταν δυνατή η σύνδεση με τον διακομιστή. Ελέγξτε τη σύνδεσή σας στο διαδίκτυο και δοκιμάστε ξανά.'

// Same reasoning as the magic-link screen's old version of this function
// (see git history): any 5xx response collapses in auth-js into an error
// with error.code left undefined by design, indistinguishable at a
// glance from a true offline/network failure — error.status is what
// actually tells them apart (0 only when no response ever arrived; a
// real HTTP number when the server did answer, just with something not
// mapped above).
function describeAuthError(error) {
  if (error.code) return AUTH_ERROR_MESSAGES[error.code] || AUTH_ERROR_FALLBACK
  if (!error.status) return AUTH_ERROR_NO_CONNECTION
  return AUTH_ERROR_FALLBACK
}

export default function LoginScreen() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const isSignup = mode === 'signup'

  function switchMode(next) {
    setMode(next)
    setError('')
    setPassword('')
    setConfirmPassword('')
  }

  async function handleSubmit() {
    if (!email.trim()) {
      setError('Δώστε το email σας')
      return
    }
    if (!password) {
      setError('Δώστε τον κωδικό σας')
      return
    }
    if (isSignup) {
      if (password.length < MIN_PASSWORD_LENGTH) {
        setError(`Ο κωδικός πρέπει να έχει τουλάχιστον ${MIN_PASSWORD_LENGTH} χαρακτήρες.`)
        return
      }
      if (password !== confirmPassword) {
        setError('Οι κωδικοί δεν ταιριάζουν.')
        return
      }
    }

    setBusy(true)
    setError('')

    if (isSignup) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      })
      setBusy(false)
      if (signUpError) {
        setError(describeAuthError(signUpError))
        return
      }
      // Supabase's own anti-enumeration behavior, verified against the
      // real project rather than assumed: signing up with an email that
      // already has an account returns a fake-looking success (a user
      // object, empty identities, no session) instead of a real error —
      // specifically so a signup attempt can't be used to probe whether
      // an email is registered. Without checking for it explicitly, this
      // screen would look like it just did nothing.
      if (data.user?.identities?.length === 0) {
        setError('Υπάρχει ήδη λογαριασμός με αυτό το email. Δοκιμάστε να συνδεθείτε.')
        return
      }
      // If "Confirm email" is enabled in the Supabase dashboard
      // (Authentication → Providers → Email), signUp returns a user but
      // no session — the account needs an emailed confirmation link
      // clicked first, exactly the email dependency this screen exists
      // to avoid. Surfaced clearly rather than left looking stuck: it
      // means that dashboard setting still needs turning off.
      if (!data.session) {
        setError('Ο λογαριασμός δημιουργήθηκε, αλλά χρειάζεται επιβεβαίωση μέσω email πριν τη σύνδεση.')
        return
      }
      // A session exists now — AuthGate's onAuthStateChange listener
      // picks it up on its own and swaps this screen out; nothing else
      // to do here.
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      setBusy(false)
      if (signInError) {
        setError(describeAuthError(signInError))
        return
      }
    }
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-stone-50 bg-blueprint flex flex-col items-center justify-center px-6 text-stone-900">
      <BrandMark className="w-10 h-10 text-rust-700 mb-3" />
      <h1 className="font-semibold text-lg mb-1">Διαχείριση Έργου</h1>
      <p className="text-sm text-stone-500 mb-6 text-center">
        {isSignup
          ? 'Δημιουργήστε λογαριασμό για να ξεκινήσετε.'
          : 'Συνδεθείτε για να βλέπετε τα έργα σας σε κάθε συσκευή.'}
      </p>

      <div className="w-full bg-white rounded-xl p-5 shadow-card">
        <label className="block text-xs text-stone-500 mb-1">Email</label>
        <input
          type="email"
          autoFocus
          autoComplete="email"
          className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-3 text-sm"
          placeholder="π.χ. giannis@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />

        <label className="block text-xs text-stone-500 mb-1">Κωδικός</label>
        <input
          type="password"
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-1 text-sm"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        {isSignup && (
          <p className="text-[11px] text-stone-400 mb-3">
            Τουλάχιστον {MIN_PASSWORD_LENGTH} χαρακτήρες.
          </p>
        )}

        {isSignup && (
          <>
            <label className="block text-xs text-stone-500 mb-1 mt-2">Επιβεβαίωση κωδικού</label>
            <input
              type="password"
              autoComplete="new-password"
              className="w-full border border-stone-300 rounded-lg px-3 py-2 mb-3 text-sm"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </>
        )}

        {error && <div className="text-xs text-rose-600 mb-2 mt-2">{error}</div>}

        <button
          onClick={handleSubmit}
          disabled={busy}
          className="btn-primary w-full rounded-xl py-2.5 text-sm mt-2"
        >
          {busy ? (isSignup ? 'Δημιουργία λογαριασμού…' : 'Σύνδεση…') : isSignup ? 'Εγγραφή' : 'Σύνδεση'}
        </button>

        <button
          onClick={() => switchMode(isSignup ? 'signin' : 'signup')}
          className="w-full text-stone-400 text-xs py-2.5 mt-1"
        >
          {isSignup ? 'Έχετε ήδη λογαριασμό; Σύνδεση' : 'Δεν έχετε λογαριασμό; Εγγραφή'}
        </button>
      </div>
    </div>
  )
}
