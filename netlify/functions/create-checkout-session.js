const stripe = require('./lib/stripeClient')
const supabaseAdmin = require('./lib/supabaseAdmin')

// How long the free trial lasts. One number, one place — change this and
// redeploy to adjust it. (Stripe runs the trial itself: the customer's
// card is collected at checkout, but nothing is charged until this many
// days pass and the subscription leaves "trialing" status.)
const TRIAL_DAYS = 14

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  const authHeader = event.headers.authorization || event.headers.Authorization || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Λείπει η σύνδεση χρήστη' }) }
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token)
  if (userError || !user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Μη έγκυρη σύνδεση' }) }
  }

  if (!process.env.STRIPE_PRICE_ID) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Λείπει το STRIPE_PRICE_ID' }) }
  }

  try {
    // Reuse the same Stripe customer across repeat checkout attempts
    // (e.g. someone who cancels partway through and tries again) instead
    // of creating a new one every time.
    const { data: existing } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle()

    const siteUrl = process.env.URL || event.headers.origin || ''

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      ...(existing?.stripe_customer_id
        ? { customer: existing.stripe_customer_id }
        : { customer_email: user.email }),
      client_reference_id: user.id,
      subscription_data: { trial_period_days: TRIAL_DAYS },
      success_url: `${siteUrl}/?checkout=success`,
      cancel_url: `${siteUrl}/?checkout=cancelled`,
    })

    return { statusCode: 200, body: JSON.stringify({ url: session.url }) }
  } catch (err) {
    console.error('create-checkout-session error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Αποτυχία δημιουργίας πληρωμής' }) }
  }
}
