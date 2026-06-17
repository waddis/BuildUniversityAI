import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Map Stripe price IDs to subscription tiers
const PRICE_TO_TIER: Record<string, string> = {
  [process.env.STRIPE_CREW_PRICE_ID ?? 'price_crew']: 'crew',
  [process.env.STRIPE_COMPANY_PRICE_ID ?? 'price_company']: 'company',
  [process.env.STRIPE_ENTERPRISE_PRICE_ID ?? 'price_enterprise']: 'enterprise',
}

async function updateUserSubscription(
  userId: string,
  tier: string,
  stripeCustomerId: string,
  _stripeSubscriptionId: string,
  status: 'active' | 'canceled' | 'past_due' | 'trialing'
) {
  const supabase = await createClient()

  // Look up the user's organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', userId)
    .single()

  if (profile?.organization_id) {
    // Update the organization with subscription data
    await supabase
      .from('organizations')
      .update({
        subscription_tier: tier,
        stripe_customer_id: stripeCustomerId,
        subscription_status: status,
        max_seats: tier === 'enterprise' ? 9999 : tier === 'company' ? 25 : 1,
      })
      .eq('id', profile.organization_id)
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe signature.' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('[Webhook] Signature verification failed:', err)
    return NextResponse.json(
      { error: 'Webhook signature verification failed.' },
      { status: 400 }
    )
  }

  console.log('[Webhook] Received event:', event.type)

  try {
    switch (event.type) {
      // ─── Checkout completed ──────────────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId

        if (!userId) {
          console.warn('[Webhook] checkout.session.completed: no userId in metadata')
          break
        }

        if (session.mode === 'subscription' && session.subscription) {
          const subscriptionId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription.id

          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          const priceId = subscription.items.data[0]?.price.id
          const tier = PRICE_TO_TIER[priceId] ?? 'crew'
          const customerId =
            typeof subscription.customer === 'string'
              ? subscription.customer
              : subscription.customer.id

          await updateUserSubscription(
            userId,
            tier,
            customerId,
            subscriptionId,
            subscription.status as 'active' | 'canceled' | 'past_due' | 'trialing'
          )

          console.log(`[Webhook] Subscription activated: user=${userId} tier=${tier}`)
        }
        break
      }

      // ─── Subscription updated ────────────────────────────────────────────
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.userId

        if (!userId) {
          console.warn('[Webhook] subscription.updated: no userId in metadata')
          break
        }

        const priceId = subscription.items.data[0]?.price.id
        const tier = PRICE_TO_TIER[priceId] ?? 'crew'
        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer.id

        await updateUserSubscription(
          userId,
          tier,
          customerId,
          subscription.id,
          subscription.status as 'active' | 'canceled' | 'past_due' | 'trialing'
        )

        console.log(
          `[Webhook] Subscription updated: user=${userId} tier=${tier} status=${subscription.status}`
        )
        break
      }

      // ─── Subscription deleted / canceled ────────────────────────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.userId

        if (!userId) {
          console.warn('[Webhook] subscription.deleted: no userId in metadata')
          break
        }

        const supabase = await createClient()
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', userId)
          .single()

        if (profile?.organization_id) {
          await supabase
            .from('organizations')
            .update({
              subscription_tier: null,
              subscription_status: 'canceled',
            })
            .eq('id', profile.organization_id)
        }

        console.log(`[Webhook] Subscription canceled: user=${userId}`)
        break
      }

      // ─── Payment failed ──────────────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice & {
          subscription?: string | Stripe.Subscription | null
        }
        const sub = invoice.subscription
        const subscriptionId =
          typeof sub === 'string' ? sub : sub && typeof sub === 'object' ? sub.id : null

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          const userId = subscription.metadata?.userId

          if (userId) {
            const supabase = await createClient()
            const { data: profile } = await supabase
              .from('profiles')
              .select('organization_id')
              .eq('id', userId)
              .single()

            if (profile?.organization_id) {
              await supabase
                .from('organizations')
                .update({ subscription_status: 'past_due' })
                .eq('id', profile.organization_id)
            }

            console.log(`[Webhook] Payment failed: user=${userId}`)
          }
        }
        break
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('[Webhook] Handler error:', error)
    // Return 200 to Stripe so it doesn't retry — log the error internally
    return NextResponse.json({ received: true, error: 'Internal handler error' }, { status: 200 })
  }
}
