# Environment Setup Guide

## Required Environment Variables

Create a `.env.local` file in your project root with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://gmtxywvavnfgfxjaikdb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Stripe Price IDs (create these in your Stripe dashboard)
STRIPE_BASIC_PRICE_ID=price_your_basic_price_id_here
STRIPE_PREMIUM_PRICE_ID=price_your_premium_price_id_here
STRIPE_ENTERPRISE_PRICE_ID=price_your_enterprise_price_id_here

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Redis Configuration (for BullMQ)
REDIS_URL=redis://localhost:6379

# Worker Configuration
WORKER_CONCURRENCY=5
WORKER_TIMEOUT=300000
```

## Stripe Setup Instructions

1. **Create Stripe Account**: Sign up at [stripe.com](https://stripe.com)

2. **Create Products and Prices**:

   - Go to Products in your Stripe dashboard
   - Create products for each subscription tier:
     - Basic Plan (€19.99/month)
     - Premium Plan (€49.99/month)
     - Enterprise Plan (€99.99/month)
   - Create recurring prices for each product
   - Copy the price IDs to your environment variables

3. **Set up Webhooks**:
   - Go to Webhooks in your Stripe dashboard
   - Add endpoint: `https://yourdomain.com/api/stripe/webhook`
   - Select events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_*`
   - Copy the webhook secret to your environment variables

## Supabase Setup

The database schema is already set up with the following tables:

- `user_profiles` - User subscription and profile data
- `subscription_plans` - Available subscription plans
- `license_keys` - License key management
- `webhook_events` - Webhook event tracking
- `task_logs` - Task execution logs
- `system_settings` - System configuration

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Next Steps

1. Set up your environment variables
2. Configure Stripe products and prices
3. Test the subscription flow
4. Deploy to production
