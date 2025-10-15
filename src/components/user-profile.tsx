"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Crown, CreditCard, Settings, User } from "lucide-react";

const SUBSCRIPTION_TIERS = {
  free: {
    name: "Free",
    price: "€0/month",
    features: ["5 tasks/month", "1 proxy", "2 store accounts"],
    color: "bg-gray-100 text-gray-800",
  },
  basic: {
    name: "Basic",
    price: "€19.99/month",
    features: ["50 tasks/month", "5 proxies", "10 store accounts"],
    color: "bg-blue-100 text-blue-800",
  },
  premium: {
    name: "Premium",
    price: "€49.99/month",
    features: ["200 tasks/month", "20 proxies", "50 store accounts"],
    color: "bg-purple-100 text-purple-800",
  },
  enterprise: {
    name: "Enterprise",
    price: "€99.99/month",
    features: ["Unlimited tasks", "100 proxies", "200 store accounts"],
    color: "bg-gold-100 text-gold-800",
  },
};

export function UserProfile() {
  const { user, profile, updateProfile, hasPermission } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [newTier, setNewTier] = useState(profile?.subscription_tier || "free");

  if (!user || !profile) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Loading profile...
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleTierUpdate = async () => {
    try {
      await updateProfile({ subscription_tier: newTier as any });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating subscription tier:", error);
    }
  };

  const currentTier = SUBSCRIPTION_TIERS[profile.subscription_tier];

  return (
    <div className="space-y-6">
      {/* User Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Manage your account settings and subscription
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user.email}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div>
              <Label htmlFor="user-id">User ID</Label>
              <Input
                id="user-id"
                value={user.id}
                disabled
                className="bg-gray-50"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Subscription
          </CardTitle>
          <CardDescription>Your current plan and usage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge className={currentTier.color}>{currentTier.name}</Badge>
              <span className="font-medium">{currentTier.price}</span>
            </div>
            {hasPermission("admin") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Settings className="h-4 w-4 mr-2" />
                {isEditing ? "Cancel" : "Edit"}
              </Button>
            )}
          </div>

          {isEditing && (
            <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
              <div>
                <Label htmlFor="tier-select">Subscription Tier</Label>
                <Select value={newTier} onValueChange={setNewTier}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SUBSCRIPTION_TIERS).map(([key, tier]) => (
                      <SelectItem key={key} value={key}>
                        {tier.name} - {tier.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleTierUpdate} size="sm">
                  Update Tier
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {profile.credits_remaining}
              </div>
              <div className="text-sm text-muted-foreground">
                Credits Remaining
              </div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {currentTier.features[0]}
              </div>
              <div className="text-sm text-muted-foreground">Monthly Tasks</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {currentTier.features[1]}
              </div>
              <div className="text-sm text-muted-foreground">Proxies</div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Plan Features:</h4>
            <ul className="space-y-1">
              {currentTier.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Usage Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Usage Statistics
          </CardTitle>
          <CardDescription>Track your account usage and limits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Tasks Used This Month</span>
                <span className="font-medium">
                  0 / {currentTier.features[0].split("/")[0]}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: "0%" }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Proxies Active</span>
                <span className="font-medium">
                  0 / {currentTier.features[1].split(" ")[0]}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: "0%" }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

