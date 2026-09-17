import { useEffect, useState } from 'react'
import * as Sentry from '@sentry/react'
import { supabase } from '../lib/supabaseClient'
import LoginScreen from './LoginScreen'

// Renders children only once there is a signed-in Supabase session; shows
// the login screen otherwise. Also hands the session (and a signOut
// function) down via a render-prop-style children function, since App
// needs to show a "Sign out" control and know who's signed in.
export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined) // undefined = still loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => subscription.subscription.unsubscribe()
  }, [])

  // Deliberate, minimal user context on error reports — "which account
  // hit this" — distinct from the broad automatic user-data collection
  // Sentry can do on its own (left off, see main.jsx): just enough to
  // know who to ask or reach out to, for a small app where every signed-in
  // user is either the owner or someone they specifically invited. A
  // no-op if Sentry was never initialized (no VITE_SENTRY_DSN set).
  useEffect(() => {
    Sentry.setUser(session?.user ? { id: session.user.id, email: session.user.email } : null)
  }, [session])

  if (session === undefined) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-stone-50 flex items-center justify-center text-stone-400 text-sm">
        Φόρτωση…
      </div>
    )
  }

  if (!session) {
    return <LoginScreen />
  }

  return children({ session, signOut: () => supabase.auth.signOut() })
}
