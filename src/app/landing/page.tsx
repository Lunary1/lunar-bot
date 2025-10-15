"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Check,
  ArrowRight,
  Zap,
  Shield,
  Users,
  Star,
  Play,
  BarChart3,
  Bot,
  CreditCard,
} from "lucide-react";
import Link from "next/link";

const features = [
  {
    icon: <Zap className="h-6 w-6" />,
    title: "Lightning Fast Checkout",
    description:
      "Checkout in milliseconds with our advanced automation technology",
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: "Secure & Reliable",
    description:
      "Enterprise-grade security with encrypted credentials and proxy support",
  },
  {
    icon: <Bot className="h-6 w-6" />,
    title: "Smart Automation",
    description: "AI-powered product detection and intelligent task management",
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: "Real-time Analytics",
    description:
      "Track success rates, monitor performance, and optimize your strategy",
  },
];

const plans = [
  {
    name: "Free",
    price: { monthly: 0, yearly: 0 },
    description: "Perfect for getting started",
    features: [
      "5 tasks per month",
      "1 proxy",
      "2 store accounts",
      "Basic monitoring",
      "Email notifications",
    ],
    limitations: ["Limited to basic features", "No priority support"],
    popular: false,
    stripePriceId: null,
  },
  {
    name: "Basic",
    price: { monthly: 19.99, yearly: 199.99 },
    description: "For serious collectors",
    features: [
      "50 tasks per month",
      "5 proxies",
      "10 store accounts",
      "Advanced monitoring",
      "Discord notifications",
      "Priority support",
    ],
    limitations: [],
    popular: true,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID,
  },
  {
    name: "Premium",
    price: { monthly: 49.99, yearly: 499.99 },
    description: "For power users",
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
    popular: false,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID,
  },
  {
    name: "Enterprise",
    price: { monthly: 99.99, yearly: 999.99 },
    description: "For businesses",
    features: [
      "Unlimited tasks",
      "100 proxies",
      "200 store accounts",
      "White-label options",
      "Custom integrations",
      "Dedicated support",
    ],
    limitations: [],
    popular: false,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID,
  },
];

const testimonials = [
  {
    name: "Alex Chen",
    role: "Pokémon Collector",
    content:
      "LunarBot helped me secure rare cards that were selling out in seconds. The automation is incredible!",
    rating: 5,
  },
  {
    name: "Sarah Johnson",
    role: "Reseller",
    content:
      "Finally, a tool that actually works. I've increased my success rate by 300% since using LunarBot.",
    rating: 5,
  },
  {
    name: "Mike Rodriguez",
    role: "Collector",
    content:
      "The real-time monitoring and instant checkout saved me hours of manual work. Highly recommended!",
    rating: 5,
  },
];

export default function LandingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly"
  );
  const [email, setEmail] = useState("");

  const handleGetStarted = () => {
    if (email) {
      // Store email for later use
      localStorage.setItem("signup_email", email);
    }
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">L</span>
              </div>
              <span className="text-xl font-bold text-gray-900">LunarBot</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/login">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <Badge className="mb-4 bg-blue-100 text-blue-800">
            🚀 Now Supporting Dreamland, Pokémon Center EU & More
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Never Miss a Pokémon Drop
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600">
              Again
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            The most advanced Pokémon product automation platform. Checkout in
            milliseconds, monitor in real-time, and secure rare items before
            they sell out.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <div className="flex items-center space-x-2">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-64"
              />
              <Button onClick={handleGetStarted} size="lg">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-8 text-sm text-gray-500">
            <div className="flex items-center">
              <Check className="h-4 w-4 text-green-500 mr-2" />
              No credit card required
            </div>
            <div className="flex items-center">
              <Check className="h-4 w-4 text-green-500 mr-2" />
              Free 5 tasks to start
            </div>
            <div className="flex items-center">
              <Check className="h-4 w-4 text-green-500 mr-2" />
              Cancel anytime
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose LunarBot?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Built for speed, security, and success. Our platform gives you the
              edge you need.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="text-center hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get started in minutes with our simple 3-step process
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold mb-4">Select Products</h3>
              <p className="text-gray-600">
                Choose the Pokémon products you want to monitor from supported
                stores
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold mb-4">Configure Tasks</h3>
              <p className="text-gray-600">
                Set up your accounts, proxies, and automation preferences
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold mb-4">Automate Checkout</h3>
              <p className="text-gray-600">
                Our bots handle the rest - monitoring, detecting, and purchasing
                automatically
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose the plan that fits your needs. Upgrade or downgrade
              anytime.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 mt-8">
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
                    billingCycle === "yearly"
                      ? "translate-x-6"
                      : "translate-x-1"
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
              return (
                <Card
                  key={plan.name}
                  className={`relative ${
                    plan.popular
                      ? "border-blue-500 shadow-lg scale-105"
                      : "border-gray-200"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-blue-500 text-white">
                        Most Popular
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
                          <span className="h-5 w-5 text-red-500 mr-3 flex-shrink-0">
                            ✗
                          </span>
                          <span className="text-sm text-gray-500">
                            {limitation}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <div className="p-6 pt-0">
                    <Button
                      className="w-full"
                      variant={plan.popular ? "default" : "outline"}
                      onClick={() => (window.location.href = "/login")}
                    >
                      {plan.stripePriceId ? `Get ${plan.name}` : "Current Plan"}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Trusted by Collectors Worldwide
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              See what our users are saying about LunarBot
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-6">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-5 w-5 text-yellow-400 fill-current"
                    />
                  ))}
                </div>
                <p className="text-gray-600 mb-4">"{testimonial.content}"</p>
                <div>
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-sm text-gray-500">{testimonial.role}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-500 to-purple-600">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Never Miss a Drop?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of collectors who trust LunarBot to secure their most
            wanted items.
          </p>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => (window.location.href = "/login")}
            className="text-lg px-8 py-4"
          >
            Start Your Free Trial
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">L</span>
                </div>
                <span className="text-xl font-bold">LunarBot</span>
              </div>
              <p className="text-gray-400">
                The most advanced Pokémon product automation platform.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="/features">Features</Link>
                </li>
                <li>
                  <Link href="/pricing">Pricing</Link>
                </li>
                <li>
                  <Link href="/docs">Documentation</Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="/help">Help Center</Link>
                </li>
                <li>
                  <Link href="/contact">Contact Us</Link>
                </li>
                <li>
                  <Link href="/status">Status</Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="/privacy">Privacy Policy</Link>
                </li>
                <li>
                  <Link href="/terms">Terms of Service</Link>
                </li>
                <li>
                  <Link href="/cookies">Cookie Policy</Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 LunarBot. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}



