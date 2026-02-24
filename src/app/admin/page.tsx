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
  ExternalLink,
  Package,
  Store,
  Loader2,
} from "lucide-react";
import { useAuthContext } from "@/components/auth-provider";
import { supabase } from "@/app/lib/supabaseClient";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import ProtectedRoute from "@/components/protected-route";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

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

interface Store {
  id: string;
  name: string;
  base_url: string;
  is_active: boolean;
}

interface Product {
  id: string;
  store_id: string;
  name: string;
  sku?: string;
  current_price?: number;
  url: string;
  image_url?: string;
  is_available: boolean;
  created_at: string;
  stores?: Store;
}

interface ScrapedProduct {
  name: string;
  price: number | null;
  imageUrl: string | null;
  sku?: string;
  isAvailable: boolean;
}

export default function AdminPage() {
  return (
    <ProtectedRoute>
      <AdminPageContent />
    </ProtectedRoute>
  );
}

function AdminPageContent() {
  const { user, profile } = useAuthContext();
  const [users, setUsers] = useState<User[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("users");

  // Helper function to get task limits based on subscription tier
  const getTaskLimit = (tier: string) => {
    switch (tier) {
      case "basic":
        return 50;
      case "premium":
        return 200;
      case "enterprise":
        return -1; // unlimited
      default:
        return 5; // free tier
    }
  };

  // Check if user is admin
  const isAdmin = profile?.role === "admin";

  // Debug logging
  console.log("Admin Debug:", {
    profile,
    isAdmin,
    subscription_tier: profile?.subscription_tier,
    role: profile?.role,
  });

  useEffect(() => {
    if (user && isAdmin) {
      fetchUsers();
      fetchMetrics();
    }
  }, [user, isAdmin]);

  const fetchUsers = async () => {
    try {
      // Use RPC or direct query to get user data with emails
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "get_users_with_profiles"
      );

      if (rpcError) {
        // Fallback to basic profile data if RPC fails
        console.log("RPC failed, using fallback:", rpcError);
        const { data: profiles, error: profilesError } = await supabase
          .from("user_profiles")
          .select("*")
          .order("created_at", { ascending: false });

        if (profilesError) throw profilesError;

        const formattedUsers =
          profiles?.map((profile) => ({
            id: profile.user_id,
            email: "Email not available",
            created_at: profile.created_at,
            profile: {
              subscription_tier: profile.subscription_tier,
              subscription_status: profile.subscription_status,
              tasks_used: 0,
              tasks_limit: getTaskLimit(profile.subscription_tier),
            },
          })) || [];

        setUsers(formattedUsers);
      } else {
        setUsers(rpcData || []);
      }
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
              <TabsList className="grid w-full grid-cols-5">
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
                <TabsTrigger
                  value="products"
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Products
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

              {/* Products Tab */}
              <TabsContent value="products" className="space-y-6">
                <ProductManagement />
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

function ProductManagement() {
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [scrapedProduct, setScrapedProduct] = useState<ScrapedProduct | null>(
    null
  );
  const [scraping, setScraping] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStores();
    fetchProducts();
  }, []);

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setStores(data || []);
    } catch (error) {
      console.error("Error fetching stores:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select(
          `
          *,
          stores:store_id (
            id,
            name,
            base_url
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleScrapeProduct = async () => {
    if (!productUrl || !selectedStore) return;

    try {
      setScraping(true);
      const response = await fetch("/api/products/scrape-new", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: productUrl,
          storeId: selectedStore,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to scrape product");
      }

      setScrapedProduct(result.product);
    } catch (error) {
      console.error("Error scraping product:", error);
      alert("Failed to scrape product. Please check the URL and try again.");
    } finally {
      setScraping(false);
    }
  };

  const handleSaveProduct = async () => {
    if (!scrapedProduct || !selectedStore) return;

    try {
      setSaving(true);
      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          store_id: selectedStore,
          name: scrapedProduct.name,
          sku: scrapedProduct.sku,
          current_price: scrapedProduct.price,
          url: productUrl,
          image_url: scrapedProduct.imageUrl,
          is_available: scrapedProduct.isAvailable,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save product");
      }

      // Reset form and refresh products
      setAddProductOpen(false);
      setSelectedStore("");
      setProductUrl("");
      setScrapedProduct(null);
      fetchProducts();
      alert("Product added successfully!");
    } catch (error) {
      console.error("Error saving product:", error);
      alert("Failed to save product. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete product");
      }

      fetchProducts();
      alert("Product deleted successfully!");
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Failed to delete product. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Product Management</h2>
          <p className="text-gray-600">
            Manage products available for user tasks
          </p>
        </div>
        <Dialog open={addProductOpen} onOpenChange={setAddProductOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>
                Select a store and paste the product URL to automatically scrape
                product details.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="store">Store</Label>
                <Select value={selectedStore} onValueChange={setSelectedStore}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a store" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="url">Product URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="url"
                    placeholder="https://www.store.com/product/..."
                    value={productUrl}
                    onChange={(e) => setProductUrl(e.target.value)}
                  />
                  <Button
                    onClick={handleScrapeProduct}
                    disabled={!productUrl || !selectedStore || scraping}
                  >
                    {scraping ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Scrape"
                    )}
                  </Button>
                </div>
              </div>

              {scrapedProduct && (
                <div className="border rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold">Scraped Product Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Name</Label>
                      <Input value={scrapedProduct.name} readOnly />
                    </div>
                    <div>
                      <Label>Price</Label>
                      <Input
                        value={
                          scrapedProduct.price
                            ? `€${scrapedProduct.price}`
                            : "No price found"
                        }
                        readOnly
                      />
                    </div>
                    {scrapedProduct.sku && (
                      <div>
                        <Label>SKU</Label>
                        <Input value={scrapedProduct.sku} readOnly />
                      </div>
                    )}
                    <div>
                      <Label>Image</Label>
                      <Input
                        value={scrapedProduct.imageUrl || "No image found"}
                        readOnly
                      />
                    </div>
                  </div>
                  {scrapedProduct.imageUrl && (
                    <div>
                      <Label>Preview</Label>
                      <img
                        src={scrapedProduct.imageUrl}
                        alt={scrapedProduct.name}
                        className="w-32 h-32 object-cover border rounded"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                  )}
                  <Button
                    onClick={handleSaveProduct}
                    disabled={saving}
                    className="w-full"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Product"
                    )}
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
          <CardDescription>
            {products.length} products available across {stores.length} stores
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center p-8 text-gray-500">
              No products found. Add your first product to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-start justify-between p-4 border rounded-lg"
                >
                  <div className="flex gap-4">
                    {product.image_url && (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-16 h-16 object-cover rounded"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                    <div>
                      <h3 className="font-medium">{product.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                        <Store className="h-4 w-4" />
                        <span>{product.stores?.name}</span>
                        {product.current_price && (
                          <>
                            <span>•</span>
                            <span>€{product.current_price}</span>
                          </>
                        )}
                        {product.sku && (
                          <>
                            <span>•</span>
                            <span>SKU: {product.sku}</span>
                          </>
                        )}
                      </div>
                      <Badge
                        variant={product.is_available ? "default" : "secondary"}
                        className="mt-2"
                      >
                        {product.is_available ? "Available" : "Out of Stock"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(product.url, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteProduct(product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
