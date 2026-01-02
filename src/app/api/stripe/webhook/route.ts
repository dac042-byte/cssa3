import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServerClient } from '@/lib/supabase'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe signature' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  const adminClient = createServerClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        if (session.mode === 'subscription' && session.subscription) {
          const userId = session.metadata?.supabase_user_id
          const subscriptionId = session.subscription as string

          if (userId) {
            await adminClient
              .from('profiles')
              .update({
                subscription_status: 'active',
                stripe_subscription_id: subscriptionId,
                stripe_customer_id: session.customer as string,
              })
              .eq('id', userId)

            console.log(`Subscription activated for user ${userId}`)
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Find user by Stripe customer ID
        const { data: profile } = await adminClient
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          let status: 'active' | 'canceled' | 'past_due' = 'active'

          if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
            status = 'canceled'
          } else if (subscription.status === 'past_due') {
            status = 'past_due'
          } else if (subscription.status === 'active' || subscription.status === 'trialing') {
            status = 'active'
          }

          await adminClient
            .from('profiles')
            .update({ subscription_status: status })
            .eq('id', profile.id)

          console.log(`Subscription updated for user ${profile.id}: ${status}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Find user by Stripe customer ID
        const { data: profile } = await adminClient
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          await adminClient
            .from('profiles')
            .update({
              subscription_status: 'canceled',
              stripe_subscription_id: null,
            })
            .eq('id', profile.id)

          console.log(`Subscription canceled for user ${profile.id}`)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        // Find user by Stripe customer ID
        const { data: profile } = await adminClient
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          await adminClient
            .from('profiles')
            .update({ subscription_status: 'past_due' })
            .eq('id', profile.id)

          console.log(`Payment failed for user ${profile.id}`)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        // Find user by Stripe customer ID and ensure they're active
        const { data: profile } = await adminClient
          .from('profiles')
          .select('id, subscription_status')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile && profile.subscription_status !== 'active') {
          await adminClient
            .from('profiles')
            .update({ subscription_status: 'active' })
            .eq('id', profile.id)

          console.log(`Payment succeeded, subscription reactivated for user ${profile.id}`)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
