const { createClient } = require('@supabase/supabase-js')

// Uses the service_role key — bypasses Row Level Security entirely. Only
// ever used server-side, in these Netlify Functions, never sent to the
// browser. This is deliberate and necessary here: the webhook has no
// signed-in user to act as (Stripe is calling us, not a logged-in
// customer), and create-checkout-session needs to look up/store a
// stripe_customer_id across the one row a user is allowed to read but not
// write (see supabase/schema.sql's policy on the subscriptions table).
module.exports = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
