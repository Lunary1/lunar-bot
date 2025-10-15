"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuthContext } from "@/components/auth-provider";
import { supabase } from "@/app/lib/supabaseClient";
import { CreditCard, Users, Zap, Shield } from "lucide-react";

interface SubscriptionStats {
  tasksUsed: number;
  tasksLimit: number;
  proxiesUsed: number;
  proxiesLimit: number;
  accountsUsed: number;
  accountsLimit: number;
}

export function SubscriptionManagement() {
  const { user, profile } = useAuthContext();
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [loading, setLoading] = useState(false);

  const getSubscriptionLimits = (tier: string) => {
    const limits = {
      free: { tasks: 5, proxies: 1, accounts: 2 },
      basic: { tasks: 50, proxies: 5, accounts: 10 },
      premium: { tasks: 200, proxies: 20, accounts: 50 },
      enterprise: { tasks: -1, proxies: 100, accounts: 200 },
    };
    return limits[tier as keyof typeof limits] || limits.free;
  };

  const fetchUsageStats = async () => {
    if (!user) return;

    try {
      // Get current month's task count
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: tasksUsed } = await supabase
        .from("purchase_tasks")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", startOfMonth.toISOString());

      // Get proxy count
      const { count: proxiesUsed } = await supabase
        .from("proxies")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_active", true);

      // Get account count
      const { count: accountsUsed } = await supabase
        .from("user_store_accounts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_active", true);

      const limits = getSubscriptionLimits(
        profile?.subscription_tier || "free"
      );

      setStats({
        tasksUsed: tasksUsed || 0,
        tasksLimit: limits.tasks,
        proxiesUsed: proxiesUsed || 0,
        proxiesLimit: limits.proxies,
        accountsUsed: accountsUsed || 0,
        accountsLimit: limits.accounts,
      });
    } catch (error) {
      console.error("Error fetching usage stats:", error);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) return;

    setLoading(true);
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
      setLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "free":
        return "bg-gray-100 text-gray-800";
      case "basic":
        return "bg-blue-100 text-blue-800";
      case "premium":
        return "bg-purple-100 text-purple-800";
      case "enterprise":
        return "bg-gold-100 text-gold-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case "free":
        return <Shield className="h-5 w-5" />;
      case "basic":
        return <Zap className="h-5 w-5" />;
      case "premium":
        return <CreditCard className="h-5 w-5" />;
      case "enterprise":
        return <Users className="h-5 w-5" />;
      default:
        return <Shield className="h-5 w-5" />;
    }
  };

  // Fetch stats on component mount
  React.useEffect(() => {
    fetchUsageStats();
  }, [user, profile]);

  if (!profile) return null;

  const limits = getSubscriptionLimits(profile.subscription_tier);
  const isUnlimited = (value: number) => value === -1;

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {getTierIcon(profile.subscription_tier)}
                {profile.subscription_tier.charAt(0).toUpperCase() +
                  profile.subscription_tier.slice(1)}{" "}
                Plan
              </CardTitle>
              <CardDescription>Your current subscription plan</CardDescription>
            </div>
            <Badge className={getTierColor(profile.subscription_tier)}>
              {profile.subscription_tier.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tasks Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Tasks</span>
                <span className="text-sm text-gray-500">
                  {stats?.tasksUsed || 0} /{" "}
                  {isUnlimited(limits.tasks) ? "∞" : limits.tasks}
                </span>
              </div>
              {!isUnlimited(limits.tasks) && (
                <Progress
                  value={((stats?.tasksUsed || 0) / limits.tasks) * 100}
                  className="h-2"
                />
              )}
            </div>

            {/* Proxies Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Proxies</span>
                <span className="text-sm text-gray-500">
                  {stats?.proxiesUsed || 0} / {limits.proxies}
                </span>
              </div>
              <Progress
                value={((stats?.proxiesUsed || 0) / limits.proxies) * 100}
                className="h-2"
              />
            </div>

            {/* Accounts Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Store Accounts</span>
                <span className="text-sm text-gray-500">
                  {stats?.accountsUsed || 0} / {limits.accounts}
                </span>
              </div>
              <Progress
                value={((stats?.accountsUsed || 0) / limits.accounts) * 100}
                className="h-2"
              />
            </div>
          </div>

          <div className="mt-6 flex gap-4">
            <Button
              onClick={handleManageSubscription}
              disabled={loading}
              className="flex-1"
            >
              {loading ? "Loading..." : "Manage Subscription"}
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/pricing")}
            >
              View Plans
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage Details */}
      <Card>
        <CardHeader>
          <CardTitle>Usage This Month</CardTitle>
          <CardDescription>
            Track your current usage against your plan limits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats?.tasksUsed || 0}
              </div>
              <div className="text-sm text-gray-500">Tasks Used</div>
              <div className="text-xs text-gray-400">
                {isUnlimited(limits.tasks)
                  ? "Unlimited"
                  : `of ${limits.tasks} tasks`}
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats?.proxiesUsed || 0}
              </div>
              <div className="text-sm text-gray-500">Active Proxies</div>
              <div className="text-xs text-gray-400">
                of {limits.proxies} proxies
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {stats?.accountsUsed || 0}
              </div>
              <div className="text-sm text-gray-500">Store Accounts</div>
              <div className="text-xs text-gray-400">
                of {limits.accounts} accounts
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
