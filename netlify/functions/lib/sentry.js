import * as Sentry from '@sentry/node'

// Optional — this function works fine without it (e.g. a fresh clone with
// no Sentry project configured yet); nothing here depends on error
// reporting succeeding. Guarded the same way VITE_SENTRY_DSN is on the
// frontend (see src/main.jsx): skipped entirely, not thrown, when unset.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    // CONTEXT is Netlify's own build/deploy-context env var ('production',
    // 'deploy-preview', 'branch-deploy'); falls back to 'production' if
    // it's ever unset at function runtime rather than left undefined.
    environment: process.env.CONTEXT || 'production',
    // Stripe webhook payloads and the Supabase calls this function makes
    // both carry real customer/business data (emails, Stripe customer and
    // subscription ids, subscription status) — never send request/response
    // bodies. No cookies (a webhook call from Stripe carries no meaningful
    // ones) or headers either (a header dump would include the raw
    // Stripe-Signature value itself, no reason to forward that anywhere).
    dataCollection: {
      httpBodies: [],
      cookies: false,
      httpHeaders: false,
    },
  })
}

export default Sentry
