"use client";

import { useAuthContext } from "@/components/auth-provider";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, Users, Zap, Shield } from "lucide-react";

export default function BillingPage() {
  const { user, profile } = useAuthContext();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-gray-600">
          Manage your subscription and billing information
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>Your current subscription details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">
                  {profile?.subscription_tier || "Free"} Plan
                </h4>
                <p className="text-sm text-gray-500">
                  {profile?.subscription_status || "Active"}
                </p>
              </div>
              <Badge variant="default">
                {profile?.subscription_tier || "Free"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage This Month</CardTitle>
            <CardDescription>Track your current usage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Tasks Used</span>
                <span>
                  {profile?.tasks_used || 0} / {profile?.tasks_limit || 5}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Proxies</span>
                <span>0 / {profile?.proxy_limit || 1}</span>
              </div>
              <div className="flex justify-between">
                <span>Store Accounts</span>
                <span>0 / {profile?.account_limit || 2}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription Plans</CardTitle>
            <CardDescription>
              Upgrade your plan to unlock more features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="border rounded-lg p-4">
                <h3 className="font-medium">Free</h3>
                <p className="text-2xl font-bold">$0</p>
                <p className="text-sm text-gray-500">per month</p>
                <ul className="mt-4 space-y-2 text-sm">
                  <li>• 5 tasks per month</li>
                  <li>• 1 proxy</li>
                  <li>• 2 store accounts</li>
                </ul>
              </div>
              <div className="border-2 border-blue-500 rounded-lg p-4">
                <h3 className="font-medium">Pro</h3>
                <p className="text-2xl font-bold">$29</p>
                <p className="text-sm text-gray-500">per month</p>
                <ul className="mt-4 space-y-2 text-sm">
                  <li>• 100 tasks per month</li>
                  <li>• 10 proxies</li>
                  <li>• Unlimited accounts</li>
                </ul>
                <Button className="w-full mt-4">Upgrade to Pro</Button>
              </div>
              <div className="border rounded-lg p-4">
                <h3 className="font-medium">Enterprise</h3>
                <p className="text-2xl font-bold">$99</p>
                <p className="text-sm text-gray-500">per month</p>
                <ul className="mt-4 space-y-2 text-sm">
                  <li>• Unlimited tasks</li>
                  <li>• Unlimited proxies</li>
                  <li>• Priority support</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
