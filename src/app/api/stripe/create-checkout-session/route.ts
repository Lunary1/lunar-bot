import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession, createStripeCustomer } from "@/lib/stripe";
import { getSupabaseServer } from "@/app/lib/supabaseServer";

const supabase = getSupabaseServer();

export async function POST(request: NextRequest) {
  try {
    const { planId, userId } = await request.json();

    if (!planId || !userId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Get user details
    const { data: user, error: userError } =
      await supabase.auth.admin.getUserById(userId);
    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get subscription plan details
    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Create or get Stripe customer
    let customerId: string;
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .single();

    if (profile?.stripe_customer_id) {
      customerId = profile.stripe_customer_id;
    } else {
      const customer = await createStripeCustomer(
        user.user.email!,
        user.user.user_metadata?.full_name,
      );
      customerId = customer.id;

      // Update user profile with Stripe customer ID
      await supabase
        .from("user_profiles")
        .update({ stripe_customer_id: customerId })
        .eq("user_id", userId);
    }

    // Create checkout session
    const session = await createCheckoutSession(
      customerId,
      plan.stripe_price_id, // This should be set in the database
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      `${process.env.NEXT_PUBLIC_APP_URL}/pricing?cancelled=true`,
      {
        userId,
        planId,
        planName: plan.name,
      },
    );

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
