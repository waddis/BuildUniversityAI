import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Price IDs for each plan (set in your Stripe dashboard and .env.local)
const PRICE_MAP: Record<string, string> = {
  crew: process.env.STRIPE_CREW_PRICE_ID ?? '',
  company: process.env.STRIPE_COMPANY_PRICE_ID ?? '',
  enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID ?? '',
}

function isPlaceholderKey(key: string | undefined): boolean {
  return !key || key.startsWith('your_') || key === ''
}

export async function POST(req: NextRequest) {
  try {
    // Guard against placeholder Stripe keys
    if (isPlaceholderKey(process.env.STRIPE_SECRET_KEY)) {
      return NextResponse.json(
        { error: 'Stripe is not configured yet. Please add your real STRIPE_SECRET_KEY to .env.local.' },
        { status: 503 }
      )
    }
    const body = await req.json()
    const { priceId, userId, email } = body as {
      priceId: string
      userId: string
      email: string
    }

    if (!priceId || !userId || !email) {
      return NextResponse.json(
        { error: 'priceId, userId, and email are required.' },
        { status: 400 }
      )
    }

    // Resolve plan key -> actual Stripe price ID if a plan slug was passed
    const resolvedPriceId = PRICE_MAP[priceId] || priceId

    if (!resolvedPriceId) {
      return NextResponse.json(
        { error: 'Invalid priceId or plan not configured.' },
        { status: 400 }
      )
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      (req.headers.get('origin') ?? 'http://localhost:3000')

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [
        {
          price: resolvedPriceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          userId,
        },
      },
      metadata: {
        userId,
      },
      success_url: `${baseUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url: `${baseUrl}/signup?canceled=true`,
      allow_promotion_codes: true,
    })

    if (!session.url) {
      return NextResponse.json(
        { error: 'Failed to create Stripe checkout session.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[API] /api/stripe/checkout error:', error)
    const message = error instanceof Stripe.errors.StripeError
      ? error.message
      : 'Failed to create checkout session.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
