"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/app/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle,
  Clock,
  ShoppingCart,
  TrendingUp,
  Store,
  Shield,
  Package,
} from "lucide-react";

interface DashboardStats {
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  failedTasks: number;
  successRate: number;
  totalAccounts: number;
  activeProxies: number;
  watchedProducts: number;
}

export function DashboardStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalTasks: 0,
    activeTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    successRate: 0,
    totalAccounts: 0,
    activeProxies: 0,
    watchedProducts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    if (!user) return;

    try {
      // Load task stats
      const { data: tasks, error: tasksError } = await supabase
        .from("purchase_tasks")
        .select("status")
        .eq("user_id", user.id);

      if (tasksError) {
        console.error("Error fetching tasks:", tasksError);
        return;
      }

      const totalTasks = tasks?.length || 0;
      const activeTasks =
        tasks?.filter((t) => t.status === "running").length || 0;
      const completedTasks =
        tasks?.filter((t) => t.status === "completed").length || 0;
      const failedTasks =
        tasks?.filter((t) => t.status === "failed").length || 0;
      const successRate =
        totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      // Load account stats
      const { data: accounts, error: accountsError } = await supabase
        .from("user_store_accounts")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (accountsError) {
        console.error("Error fetching accounts:", accountsError);
        return;
      }

      // Load proxy stats
      const { data: proxies, error: proxiesError } = await supabase
        .from("proxies")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (proxiesError) {
        console.error("Error fetching proxies:", proxiesError);
        return;
      }

      // Load product stats
      const { data: products, error: productsError } = await supabase
        .from("user_watchlists")
        .select("id")
        .eq("user_id", user.id);

      if (productsError) {
        console.error("Error fetching products:", productsError);
        return;
      }

      setStats({
        totalTasks,
        activeTasks,
        completedTasks,
        failedTasks,
        successRate,
        totalAccounts: accounts?.length || 0,
        activeProxies: proxies?.length || 0,
        watchedProducts: products?.length || 0,
      });
    } catch (error) {
      console.error("Error in loadStats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statsData = [
    {
      title: "Total Tasks",
      value: stats.totalTasks.toString(),
      description: `${stats.activeTasks} active, ${stats.completedTasks} completed`,
      icon: Clock,
      trend: `${stats.failedTasks} failed`,
    },
    {
      title: "Success Rate",
      value: `${stats.successRate.toFixed(1)}%`,
      description: "Overall performance",
      icon: TrendingUp,
      trend:
        stats.successRate >= 80
          ? "Excellent"
          : stats.successRate >= 60
          ? "Good"
          : "Needs improvement",
    },
    {
      title: "Store Accounts",
      value: stats.totalAccounts.toString(),
      description: "Active accounts",
      icon: Store,
      trend: "Ready for automation",
    },
    {
      title: "Proxies",
      value: stats.activeProxies.toString(),
      description: "Active proxies",
      icon: Shield,
      trend: "Protection enabled",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statsData.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
            <p className="text-xs text-green-600 mt-1">{stat.trend}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
