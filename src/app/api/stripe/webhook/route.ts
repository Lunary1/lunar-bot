import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/stripe";
import { getSupabaseServer } from "@/app/lib/supabaseServer";
import Stripe from "stripe";

const supabase = getSupabaseServer();

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe signature" },
        { status: 400 },
      );
    }

    // Verify webhook signature
    const event = verifyWebhookSignature(body, signature);

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      case "customer.subscription.created":
        await handleSubscriptionCreated(
          event.data.object as Stripe.Subscription,
        );
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;

      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 400 },
    );
  }
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
) {
  const userId = session.metadata?.userId;
  const planId = session.metadata?.planId;

  if (!userId || !planId) {
    console.error("Missing metadata in checkout session");
    return;
  }

  // Update user subscription
  await supabase
    .from("user_profiles")
    .update({
      subscription_tier: session.metadata?.planName?.toLowerCase() || "basic",
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: session.subscription as string,
    })
    .eq("user_id", userId);
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Get user by Stripe customer ID
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (profile) {
    await supabase
      .from("user_profiles")
      .update({
        stripe_subscription_id: subscription.id,
        subscription_status: "active",
      })
      .eq("user_id", profile.user_id);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Get user by Stripe customer ID
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (profile) {
    await supabase
      .from("user_profiles")
      .update({
        subscription_status: subscription.status,
      })
      .eq("user_id", profile.user_id);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Get user by Stripe customer ID
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (profile) {
    await supabase
      .from("user_profiles")
      .update({
        subscription_tier: "free",
        subscription_status: "cancelled",
        stripe_subscription_id: null,
      })
      .eq("user_id", profile.user_id);
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // Get user by Stripe customer ID
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (profile) {
    await supabase
      .from("user_profiles")
      .update({
        subscription_status: "active",
      })
      .eq("user_id", profile.user_id);
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // Get user by Stripe customer ID
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (profile) {
    await supabase
      .from("user_profiles")
      .update({
        subscription_status: "past_due",
      })
      .eq("user_id", profile.user_id);
  }
}
