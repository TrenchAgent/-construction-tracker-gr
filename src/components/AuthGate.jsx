import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import * as Sentry from '@sentry/react'
import { RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import LoginScreen from './LoginScreen'

// A browser only checks a service worker for updates on navigation by
// default — for a PWA someone might leave open all day on a jobsite
// without ever navigating away, that could mean not finding out about a
// new deploy for the entire session. Checked again on visibilitychange
// too (see onRegisteredSW below), so switching back to an already-open
// tab after leaving it in the background catches an update immediately
// rather than waiting out the rest of this interval.
const UPDATE_CHECK_INTERVAL_MS = 20 * 60 * 1000

// Renders children only once there is a signed-in Supabase session; shows
// the login screen otherwise. Also hands the session (and a signOut
// function) down via a render-prop-style children function, since App
// needs to show a "Sign out" control and know who's signed in.
//
// The update-available banner lives here rather than in App.jsx on
// purpose, even though App.jsx is where every other top banner (offline
// queue, inline errors) lives: this component is the one thing that's
// actually mounted for a tab's entire lifetime — App.jsx unmounts on
// sign-out (this component swaps it for LoginScreen) and remounts on the
// next sign-in, which would re-run useRegisterSW()'s registration and
// leak a duplicate setInterval on every sign-out/sign-in cycle within
// one tab session. Putting it here also means the login/loading screens
// get the same update prompt as the signed-in app, for free.
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

  // needRefresh flips true once a new service worker has been found and
  // is sitting there waiting (registerType: 'prompt' in vite.config.js —
  // it deliberately does NOT take over on its own, see the comment
  // there, which is exactly the gap that let a stale bundle keep serving
  // silently before this existed). updateServiceWorker() only sends the
  // waiting worker a skip-waiting message; the actual reload once it
  // takes control is already handled by a listener the library sets up
  // internally (checked its source directly rather than assumed) —
  // nothing else needed here beyond calling it.
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      const checkForUpdate = () => registration.update()
      setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkForUpdate()
      })
    },
  })

  let content
  if (session === undefined) {
    content = (
      <div className="max-w-md mx-auto min-h-screen bg-stone-50 flex items-center justify-center text-stone-400 text-sm">
        Φόρτωση…
      </div>
    )
  } else if (!session) {
    content = <LoginScreen />
  } else {
    content = children({ session, signOut: () => supabase.auth.signOut() })
  }

  return (
    <>
      {needRefresh && (
        <div className="max-w-md mx-auto bg-rust-50 text-rust-800 text-xs px-4 py-2 border-b border-rust-200 flex items-center gap-1.5">
          <RefreshCw size={13} className="shrink-0" />
          <span className="flex-1">Νέα έκδοση διαθέσιμη — πατήστε για ανανέωση.</span>
          <button onClick={() => updateServiceWorker()} className="font-semibold shrink-0">
            Ανανέωση
          </button>
        </div>
      )}
      {content}
    </>
  )
}
