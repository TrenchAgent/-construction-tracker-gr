import stripe from './lib/stripeClient.js'
import supabaseAdmin from './lib/supabaseAdmin.js'
import Sentry from './lib/sentry.js'

// As of the Stripe API version this SDK defaults to, current_period_end
// lives on each subscription item, not on the subscription object itself
// (checked against node_modules/stripe's type definitions directly rather
// than assumed — this moved at some point and assuming the old shape would
// have silently written null into every subscription's renewal date).
// This app only ever creates single-item subscriptions (one flat price,
// quantity 1), so the first item is always the one that matters.
function getCurrentPeriodEnd(subscription) {
  const item = subscription.items?.data?.[0]
  return item?.current_period_end ?? null
}

function toIso(unixSeconds) {
  return unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null
}

async function upsertSubscription(userId, subscription, customerId) {
  const { error } = await supabaseAdmin.from('subscriptions').upsert({
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    current_period_end: toIso(getCurrentPeriodEnd(subscription)),
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}

async function updateSubscriptionByStripeId(subscription) {
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      status: subscription.status,
      current_period_end: toIso(getCurrentPeriodEnd(subscription)),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)
  if (error) throw error
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  const signature = event.headers['stripe-signature'] || event.headers['Stripe-Signature']
  // Signature verification needs the exact raw bytes Stripe sent — not a
  // JSON.parse()'d and re-stringified body, which would have different
  // whitespace/key order and fail verification even though the content is
  // "the same".
  const rawBody = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body

  let stripeEvent
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    Sentry.captureException(err, { tags: { stage: 'signature_verification' } })
    // Serverless functions can be frozen the instant this returns — the
    // event above is sent async, so without waiting for it here it can be
    // silently dropped before the HTTP request to Sentry ever completes.
    // Bounded so a slow/unreachable Sentry can't itself delay the actual
    // response back to Stripe.
    await Sentry.flush(2000)
    return { statusCode: 400, body: `Webhook Error: ${err.message}` }
  }

  try {
    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object
      // client_reference_id is how we know which Supabase user this
      // Stripe customer/subscription belongs to — set when the checkout
      // session was created, in create-checkout-session.js.
      if (session.client_reference_id && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription)
        await upsertSubscription(session.client_reference_id, subscription, session.customer)
      }
    } else if (
      stripeEvent.type === 'customer.subscription.updated' ||
      stripeEvent.type === 'customer.subscription.deleted'
    ) {
      // These events don't carry client_reference_id — look the row up by
      // the Stripe subscription id we already stored above instead.
      await updateSubscriptionByStripeId(stripeEvent.data.object)
    }
    // Any other event type: nothing to do here (only these three are
    // registered on the Stripe webhook endpoint anyway).
  } catch (err) {
    console.error('Webhook handling error:', err)
    // Explicit fingerprint, not left to Sentry's default stack-trace
    // grouping: a checkout-completion failure and a subscription-update
    // failure are different bugs even when the underlying thrown error
    // looks identical (e.g. both a generic Supabase network timeout,
    // which minifies down to the same couple of stack frames either way)
    // — they shouldn't get silently merged into one issue just because
    // the trace looks alike. stripe_event_type kept as a tag too, so a
    // single event type's failures are still filterable/searchable on
    // their own even before they're common enough to warrant splitting
    // the fingerprint further.
    Sentry.captureException(err, {
      tags: { stage: 'webhook_processing', stripe_event_type: stripeEvent.type },
      fingerprint: ['webhook_processing', stripeEvent.type],
    })
    await Sentry.flush(2000)
    // Non-2xx so Stripe retries with backoff — this is a real processing
    // failure (e.g. a transient database error), not something a retry
    // can't fix, unlike a bad signature above.
    return { statusCode: 500, body: 'Webhook handler failed' }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) }
}
