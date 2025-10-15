import Stripe from "stripe";
import { loadStripe } from "@stripe/stripe-js";

// Server-side Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
  typescript: true,
});

// Client-side Stripe instance
export const getStripe = () => {
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
};

// Stripe webhook signature verification
export const verifyWebhookSignature = (body: string, signature: string) => {
  try {
    return stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    throw new Error("Invalid webhook signature");
  }
};

// Create Stripe customer
export const createStripeCustomer = async (email: string, name?: string) => {
  return await stripe.customers.create({
    email,
    name,
    metadata: {
      source: "lunar-bot-saas",
    },
  });
};

// Create Stripe checkout session
export const createCheckoutSession = async (
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
  metadata?: Record<string, string>
) => {
  return await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: metadata || {},
    allow_promotion_codes: true,
    subscription_data: {
      metadata: metadata || {},
    },
  });
};

// Create Stripe portal session
export const createPortalSession = async (
  customerId: string,
  returnUrl: string
) => {
  return await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
};

// Get subscription details
export const getSubscription = async (subscriptionId: string) => {
  return await stripe.subscriptions.retrieve(subscriptionId);
};

// Cancel subscription
export const cancelSubscription = async (subscriptionId: string) => {
  return await stripe.subscriptions.cancel(subscriptionId);
};

// Update subscription
export const updateSubscription = async (
  subscriptionId: string,
  newPriceId: string
) => {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  return await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: "create_prorations",
  });
};

// Create license key product and price
export const createLicenseKeyProduct = async () => {
  const product = await stripe.products.create({
    name: "LunarBot License Key",
    description: "One-time purchase license key for LunarBot access",
    metadata: {
      type: "license_key",
    },
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: 5000, // €50.00
    currency: "eur",
    metadata: {
      type: "license_key",
    },
  });

  return { product, price };
};

// Subscription tier mapping
export const SUBSCRIPTION_TIERS = {
  free: {
    name: "Free",
    maxTasks: 5,
    maxProxies: 1,
    maxAccounts: 2,
    priceId: null,
  },
  basic: {
    name: "Basic",
    maxTasks: 50,
    maxProxies: 5,
    maxAccounts: 10,
    priceId: process.env.STRIPE_BASIC_PRICE_ID,
  },
  premium: {
    name: "Premium",
    maxTasks: 200,
    maxProxies: 20,
    maxAccounts: 50,
    priceId: process.env.STRIPE_PREMIUM_PRICE_ID,
  },
  enterprise: {
    name: "Enterprise",
    maxTasks: -1, // unlimited
    maxProxies: 100,
    maxAccounts: 200,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;
