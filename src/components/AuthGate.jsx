import { useEffect, useState } from 'react'
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
