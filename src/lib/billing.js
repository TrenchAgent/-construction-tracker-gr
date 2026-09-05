import { supabase } from './supabaseClient'

// The subscriptions table is read-only from the browser (see
// supabase/schema.sql) — all writes come from the Stripe webhook. Returns
// null if the user has never started a checkout (no row exists yet), which
// is a perfectly normal state, not an error.
export async function getSubscription() {
  const { data, error } = await supabase.from('subscriptions').select('*').maybeSingle()
  if (error) throw error
  return data
}

// Calls the Netlify Function that creates a Stripe Checkout Session, then
// redirects the whole page there — there's no Stripe.js on the frontend at
// all, just a redirect to Stripe's own hosted checkout page and back.
export async function startCheckout() {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('Δεν είστε συνδεδεμένοι')

  const res = await fetch('/.netlify/functions/create-checkout-session', {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}` },
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error || 'Αποτυχία δημιουργίας πληρωμής')

  window.location.href = body.url
}
