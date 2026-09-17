import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.jsx'
import AuthGate from './components/AuthGate.jsx'
import CrashFallback from './components/CrashFallback.jsx'

// Optional — this app works fine without it (e.g. a fresh clone with no
// Sentry project configured yet); nothing else here depends on error
// reporting succeeding. Skipped entirely, not thrown, when unset — unlike
// supabaseClient.js's required env vars, which the app genuinely can't
// run without.
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    // Error capture only, on purpose — no session replay (explicitly not
    // wanted) and no performance tracing (a separate concern from "did
    // something break"), so no other integrations/sample rates to set.
    dataCollection: {
      // This app's requests carry real people's business data — entry
      // amounts, vendor names, notes, project names — every time it talks
      // to Supabase. None of that belongs going to a third party just to
      // get a stack trace and a "which endpoint failed"; the URL and
      // status code alone are enough to debug from. Cookies aren't
      // meaningful here either (auth is a bearer token in localStorage,
      // not a cookie), and headers can carry that bearer token itself.
      httpBodies: [],
      cookies: false,
      httpHeaders: false,
    },
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<CrashFallback />}>
      <AuthGate>{({ session, signOut }) => <App session={session} onSignOut={signOut} />}</AuthGate>
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
