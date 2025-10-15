"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { useAuthContext } from "@/components/auth-provider";
import { getStripe } from "@/lib/stripe";

const plans = [
  {
    name: "Free",
    description: "Perfect for getting started",
    price: { monthly: 0, yearly: 0 },
    features: [
      "5 tasks per month",
      "1 proxy",
      "2 store accounts",
      "Basic monitoring",
      "Email notifications",
    ],
    limitations: ["Limited to basic features", "No priority support"],
    stripePriceId: null,
    popular: false,
  },
  {
    name: "Basic",
    description: "For serious collectors",
    price: { monthly: 19.99, yearly: 199.99 },
    features: [
      "50 tasks per month",
      "5 proxies",
      "10 store accounts",
      "Advanced monitoring",
      "Discord notifications",
      "Priority support",
    ],
    limitations: [],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID,
    popular: true,
  },
  {
    name: "Premium",
    description: "For power users",
    price: { monthly: 49.99, yearly: 499.99 },
    features: [
      "200 tasks per month",
      "20 proxies",
      "50 store accounts",
      "AI-powered features",
      "Custom notifications",
      "API access",
      "Priority support",
    ],
    limitations: [],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID,
    popular: false,
  },
  {
    name: "Enterprise",
    description: "For businesses",
    price: { monthly: 99.99, yearly: 999.99 },
    features: [
      "Unlimited tasks",
      "100 proxies",
      "200 store accounts",
      "White-label options",
      "Custom integrations",
      "Dedicated support",
    ],
    limitations: [],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID,
    popular: false,
  },
];

export default function PricingPage() {
  const { user, profile } = useAuthContext();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly"
  );
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (
    planName: string,
    stripePriceId: string | null
  ) => {
    if (!user) {
      // Redirect to login
      window.location.href = "/login";
      return;
    }

    if (!stripePriceId) {
      // Free plan - no payment required
      return;
    }

    setLoading(planName);

    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId: planName.toLowerCase(),
          userId: user.id,
        }),
      });

      const { sessionId } = await response.json();

      if (sessionId) {
        const stripe = await getStripe();
        await stripe?.redirectToCheckout({ sessionId });
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
    } finally {
      setLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) return;

    setLoading("manage");

    try {
      const response = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      });

      const { url } = await response.json();

      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error("Error creating portal session:", error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Start automating your Pokémon product purchases today
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <span
              className={
                billingCycle === "monthly" ? "text-gray-900" : "text-gray-500"
              }
            >
              Monthly
            </span>
            <button
              onClick={() =>
                setBillingCycle(
                  billingCycle === "monthly" ? "yearly" : "monthly"
                )
              }
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <span
                className={`${
                  billingCycle === "yearly" ? "translate-x-6" : "translate-x-1"
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
              />
            </button>
            <span
              className={
                billingCycle === "yearly" ? "text-gray-900" : "text-gray-500"
              }
            >
              Yearly
              <Badge variant="secondary" className="ml-2">
                Save 17%
              </Badge>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan) => {
            const price =
              billingCycle === "yearly"
                ? plan.price.yearly
                : plan.price.monthly;
            const isCurrentPlan =
              profile?.subscription_tier === plan.name.toLowerCase();

            return (
              <Card
                key={plan.name}
                className={`relative ${
                  plan.popular
                    ? "border-blue-500 shadow-lg scale-105"
                    : "border-gray-200"
                } ${isCurrentPlan ? "ring-2 ring-green-500" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-500 text-white">
                      Most Popular
                    </Badge>
                  </div>
                )}

                {isCurrentPlan && (
                  <div className="absolute -top-3 right-4">
                    <Badge
                      variant="outline"
                      className="bg-green-50 text-green-700 border-green-200"
                    >
                      Current Plan
                    </Badge>
                  </div>
                )}

                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">€{price}</span>
                    <span className="text-gray-500">
                      /{billingCycle === "yearly" ? "year" : "month"}
                    </span>
                  </div>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                    {plan.limitations.map((limitation, index) => (
                      <li key={index} className="flex items-center">
                        <X className="h-5 w-5 text-red-500 mr-3 flex-shrink-0" />
                        <span className="text-sm text-gray-500">
                          {limitation}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  {isCurrentPlan ? (
                    <Button
                      onClick={handleManageSubscription}
                      disabled={loading === "manage"}
                      className="w-full"
                      variant="outline"
                    >
                      {loading === "manage"
                        ? "Loading..."
                        : "Manage Subscription"}
                    </Button>
                  ) : (
                    <Button
                      onClick={() =>
                        handleSubscribe(plan.name, plan.stripePriceId)
                      }
                      disabled={loading === plan.name}
                      className="w-full"
                      variant={plan.popular ? "default" : "outline"}
                    >
                      {loading === plan.name
                        ? "Loading..."
                        : plan.stripePriceId
                        ? `Subscribe to ${plan.name}`
                        : "Current Plan"}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Additional Info */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Need a custom solution?
          </h3>
          <p className="text-gray-600 mb-6">
            Contact us for enterprise pricing and custom integrations
          </p>
          <Button variant="outline" size="lg">
            Contact Sales
          </Button>
        </div>
      </div>
    </div>
  );
}
