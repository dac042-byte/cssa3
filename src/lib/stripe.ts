import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
})

export const SUBSCRIPTION_PRICE_ID = process.env.STRIPE_PRICE_ID || 'price_xxx'
