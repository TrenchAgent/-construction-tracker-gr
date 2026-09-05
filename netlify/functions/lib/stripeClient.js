const Stripe = require('stripe')

// ---------------------------------------------------------------------------
// TEST-MODE SAFETY GUARD
//
// Stripe secret keys are always prefixed sk_test_... or sk_live_... — the
// prefix IS the mode, there's no separate flag to remember to flip. This
// guard refuses to create a Stripe client at all unless the key is a test
// key, which means no code path in this app can ever create a real,
// money-moving Checkout Session by accident.
//
// TO GO LIVE (only after business registration is finished): delete this
// "if" block below, and put your sk_live_... key in Netlify's
// STRIPE_SECRET_KEY environment variable. That's the entire change — no
// other code in this file, or in create-checkout-session.js /
// stripe-webhook.js, needs to change.
// ---------------------------------------------------------------------------
const secretKey = process.env.STRIPE_SECRET_KEY || ''
if (!secretKey.startsWith('sk_test_')) {
  throw new Error(
    'Refusing to start: STRIPE_SECRET_KEY is not a Stripe TEST key (must start with sk_test_). ' +
      'This app is deliberately restricted to Stripe test mode — see the comment in this file.',
  )
}

// No pinned apiVersion here on purpose — let the installed SDK version use
// its own matching default rather than guessing a version string that
// might drift out of sync with whatever SDK version is actually installed.
module.exports = new Stripe(secretKey)
