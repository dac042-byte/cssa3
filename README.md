# Clearhold

A CBT-inspired thought interrogation tool that helps users examine and reframe looping thoughts with clarity.

## Features

- **Three-Step Thought Flow**: Classify thoughts, identify cognitive distortions, and check evidence
- **AI-Powered Reframing**: Uses Gemini AI for neutral, grounded perspective
- **Clarity Points**: Gamified participation-based points system
- **Usage Limits**: 5 free sessions/day for registered users, unlimited for $1/month subscribers
- **Guest Access**: One free session without account creation
- **Supabase Auth**: Email/password authentication
- **Stripe Payments**: $1/month subscription for unlimited access

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI**: Google Gemini API
- **Payments**: Stripe
- **Hosting**: Vercel

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Get your API keys from **Settings > API**

### 3. Set Up Stripe

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Create a product with a $1/month recurring price:
   - Go to **Products** > **Add product**
   - Name: "Clearhold Unlimited"
   - Pricing: $1.00 USD, Recurring, Monthly
   - Copy the **Price ID** (starts with `price_`)

3. Get your API keys from **Developers > API keys**

### 4. Get Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create an API key

### 5. Configure Environment Variables

Create `.env.local` in the project root:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Gemini
GEMINI_API_KEY=your-gemini-api-key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 6. Run Locally

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### 7. Test Stripe Webhooks Locally (Optional)

Install Stripe CLI and forward webhooks:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the webhook signing secret and add it to `.env.local` as `STRIPE_WEBHOOK_SECRET`.

## Deploying to Vercel

### 1. Push to GitHub

Ensure your code is pushed to a GitHub repository.

### 2. Import to Vercel

1. Go to [vercel.com](https://vercel.com) and import your repository
2. Add all environment variables from `.env.local`
3. Deploy

### 3. Configure Stripe Webhook

1. In Stripe Dashboard, go to **Developers > Webhooks**
2. Add endpoint: `https://your-domain.vercel.app/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.payment_succeeded`
4. Copy the signing secret and update `STRIPE_WEBHOOK_SECRET` in Vercel

### 4. Update App URL

Set `NEXT_PUBLIC_APP_URL` to your production domain in Vercel environment variables.

## Database Schema

### Tables

- **profiles**: User data, Clarity Points, subscription status
- **daily_usage**: Tracks authenticated user session counts per day
- **guest_usage**: Tracks anonymous session counts per day

### Functions

- `handle_new_user()`: Auto-creates profile on signup
- `increment_daily_usage(user_id)`: Safely increments daily usage
- `add_clarity_points(user_id, points)`: Adds points to user

## Usage Flow

1. User enters a looping thought
2. **Step A**: Classify as Fact/Thought/Prediction (+5 points)
3. **Step B**: Select 1-2 cognitive distortions (+5 points)
4. **Step C**: Evaluate evidence (+10 points)
5. **Results**: AI-generated reframe (+5 points)

### Usage Limits

| User Type | Daily Limit |
|-----------|-------------|
| Guest | 1 session |
| Free Account | 5 sessions |
| Subscriber ($1/mo) | Unlimited |

## API Routes

- `POST /api/reflect`: Process thought with Gemini AI
- `POST /api/stripe/checkout`: Create Stripe Checkout session
- `POST /api/stripe/webhook`: Handle Stripe webhook events

## Security Notes

- API keys are server-side only (never exposed to client)
- Supabase RLS policies protect user data
- Stripe webhook signatures are verified
- `.env.local` is gitignored

## License

MIT
