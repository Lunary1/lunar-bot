"use client";

import { useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Users,
  Activity,
  CreditCard,
  Settings,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  Plus,
  BarChart3,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useAuthContext } from "@/components/auth-provider";
import { supabase } from "@/app/lib/supabaseClient";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

interface User {
  id: string;
  email: string;
  created_at: string;
  profile?: {
    subscription_tier: string;
    subscription_status: string;
    tasks_used: number;
    tasks_limit: number;
  };
}

interface SystemMetrics {
  totalUsers: number;
  activeUsers: number;
  totalTasks: number;
  successfulTasks: number;
  revenue: number;
  growthRate: number;
}

export default function AdminPage() {
  const { user, profile } = useAuthContext();
  const [users, setUsers] = useState<User[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("users");

  // Check if user is admin
  const isAdmin =
    profile?.subscription_tier === "admin" || profile?.role === "admin";

  useEffect(() => {
    if (user && isAdmin) {
      fetchUsers();
      fetchMetrics();
    }
  }, [user, isAdmin]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select(
          `
          *,
          auth_user:auth.users(email, created_at)
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedUsers =
        data?.map((user) => ({
          id: user.user_id,
          email: user.auth_user?.email || "Unknown",
          created_at: user.auth_user?.created_at || user.created_at,
          profile: {
            subscription_tier: user.subscription_tier,
            subscription_status: user.subscription_status,
            tasks_used: user.tasks_used || 0,
            tasks_limit: user.tasks_limit || 0,
          },
        })) || [];

      setUsers(formattedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      // Fetch user metrics
      const { data: users, error: usersError } = await supabase
        .from("user_profiles")
        .select("created_at, subscription_tier");

      if (usersError) throw usersError;

      // Fetch task metrics
      const { data: tasks, error: tasksError } = await supabase
        .from("purchase_tasks")
        .select("status, created_at");

      if (tasksError) throw tasksError;

      const totalUsers = users?.length || 0;
      const activeUsers =
        users?.filter((u) => u.subscription_tier !== "free").length || 0;
      const totalTasks = tasks?.length || 0;
      const successfulTasks =
        tasks?.filter((t) => t.status === "completed").length || 0;

      // Calculate growth rate (mock data for now)
      const growthRate = 15.2; // percentage
      const revenue = activeUsers * 29.99; // estimated monthly revenue

      setMetrics({
        totalUsers,
        activeUsers,
        totalTasks,
        successfulTasks,
        revenue,
        growthRate,
      });
    } catch (error) {
      console.error("Error fetching metrics:", error);
    }
  };

  const handleUserAction = async (userId: string, action: string) => {
    try {
      switch (action) {
        case "suspend":
          await supabase
            .from("user_profiles")
            .update({ subscription_status: "suspended" })
            .eq("user_id", userId);
          break;
        case "activate":
          await supabase
            .from("user_profiles")
            .update({ subscription_status: "active" })
            .eq("user_id", userId);
          break;
        case "upgrade":
          await supabase
            .from("user_profiles")
            .update({ subscription_tier: "premium" })
            .eq("user_id", userId);
          break;
        case "downgrade":
          await supabase
            .from("user_profiles")
            .update({ subscription_tier: "free" })
            .eq("user_id", userId);
          break;
      }
      await fetchUsers();
    } catch (error) {
      console.error(`Error ${action} user:`, error);
    }
  };

  const getSubscriptionBadge = (tier: string, status: string) => {
    if (status === "suspended") {
      return <Badge className="bg-red-100 text-red-800">Suspended</Badge>;
    }

    switch (tier) {
      case "enterprise":
        return (
          <Badge className="bg-purple-100 text-purple-800">Enterprise</Badge>
        );
      case "premium":
        return <Badge className="bg-blue-100 text-blue-800">Premium</Badge>;
      case "basic":
        return <Badge className="bg-green-100 text-green-800">Basic</Badge>;
      default:
        return <Badge variant="outline">Free</Badge>;
    }
  };

  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <main className="flex-1 space-y-4 p-4 md:p-6 lg:p-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Admin Dashboard
                </h1>
                <p className="text-gray-600">
                  Manage users, monitor system performance, and configure
                  settings
                </p>
              </div>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger
                  value="overview"
                  className="flex items-center gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="users" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Users
                </TabsTrigger>
                <TabsTrigger value="system" className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  System
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {metrics && (
                  <>
                    {/* Metrics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">
                                Total Users
                              </p>
                              <p className="text-2xl font-bold">
                                {metrics.totalUsers}
                              </p>
                            </div>
                            <Users className="h-8 w-8 text-blue-500" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">
                                Active Users
                              </p>
                              <p className="text-2xl font-bold text-green-600">
                                {metrics.activeUsers}
                              </p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-green-500" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">
                                Total Tasks
                              </p>
                              <p className="text-2xl font-bold">
                                {metrics.totalTasks}
                              </p>
                            </div>
                            <Activity className="h-8 w-8 text-purple-500" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">
                                Revenue
                              </p>
                              <p className="text-2xl font-bold text-green-600">
                                €{metrics.revenue.toFixed(2)}
                              </p>
                            </div>
                            <CreditCard className="h-8 w-8 text-green-500" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Growth Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Growth Metrics</CardTitle>
                        <CardDescription>
                          System performance and user growth
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <p className="font-medium">User Growth Rate</p>
                              <p className="text-sm text-gray-600">
                                Monthly growth percentage
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-5 w-5 text-green-500" />
                              <span className="text-2xl font-bold text-green-600">
                                +{metrics.growthRate}%
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <p className="font-medium">Task Success Rate</p>
                              <p className="text-sm text-gray-600">
                                Overall automation success
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-2xl font-bold">
                                {metrics.totalTasks > 0
                                  ? (
                                      (metrics.successfulTasks /
                                        metrics.totalTasks) *
                                      100
                                    ).toFixed(1)
                                  : 0}
                                %
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </TabsContent>

              {/* Users Tab */}
              <TabsContent value="users" className="space-y-6">
                {/* Search */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            placeholder="Search users by email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Users List */}
                <div className="space-y-4">
                  {filteredUsers.map((user) => (
                    <Card
                      key={user.id}
                      className="hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-medium">{user.email}</h3>
                              {getSubscriptionBadge(
                                user.profile?.subscription_tier || "free",
                                user.profile?.subscription_status || "active"
                              )}
                            </div>
                            <p className="text-sm text-gray-500">
                              Joined{" "}
                              {new Date(user.created_at).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-gray-500">
                              Tasks: {user.profile?.tasks_used || 0} /{" "}
                              {user.profile?.tasks_limit || 0}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleUserAction(user.id, "upgrade")
                              }
                            >
                              <TrendingUp className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleUserAction(user.id, "suspend")
                              }
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleUserAction(user.id, "activate")
                              }
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* System Tab */}
              <TabsContent value="system" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>System Status</CardTitle>
                    <CardDescription>
                      Monitor system health and performance
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <div>
                            <p className="font-medium">Database</p>
                            <p className="text-sm text-gray-600">
                              Supabase PostgreSQL
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-800">
                          Healthy
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <div>
                            <p className="font-medium">Task Queue</p>
                            <p className="text-sm text-gray-600">
                              Redis + BullMQ
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-800">
                          Running
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <div>
                            <p className="font-medium">Workers</p>
                            <p className="text-sm text-gray-600">
                              Playwright Automation
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-800">
                          Active
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <div>
                            <p className="font-medium">Payments</p>
                            <p className="text-sm text-gray-600">
                              Stripe Integration
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-800">
                          Connected
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>System Configuration</CardTitle>
                    <CardDescription>
                      Configure system-wide settings and limits
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">Task Rate Limits</p>
                          <p className="text-sm text-gray-600">
                            Maximum tasks per user per hour
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-2" />
                          Configure
                        </Button>
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">Proxy Pool</p>
                          <p className="text-sm text-gray-600">
                            Manage proxy server pool
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-2" />
                          Manage
                        </Button>
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">Store Configurations</p>
                          <p className="text-sm text-gray-600">
                            Update store bot settings
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-2" />
                          Update
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
