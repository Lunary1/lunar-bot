"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Package,
  Clock,
  Bell,
  Settings,
  Eye,
  Heart,
} from "lucide-react";
import { useAuthContext } from "@/components/auth-provider";
import { supabase } from "@/app/lib/supabaseClient";

interface ProductAlert {
  id: string;
  product_id: string;
  alert_type: "stock_change" | "price_change" | "new_product";
  old_value: any;
  new_value: any;
  message: string;
  created_at: string;
  product: {
    name: string;
    current_price: number;
    image_url?: string;
    store: {
      name: string;
    };
  };
}

interface MonitoringStats {
  totalProducts: number;
  monitoredProducts: number;
  priceAlerts: number;
  stockAlerts: number;
  recentAlerts: number;
}

export function MonitoringDashboard() {
  const { user } = useAuthContext();
  const [alerts, setAlerts] = useState<ProductAlert[]>([]);
  const [stats, setStats] = useState<MonitoringStats>({
    totalProducts: 0,
    monitoredProducts: 0,
    priceAlerts: 0,
    stockAlerts: 0,
    recentAlerts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadMonitoringData();
    }
  }, [user]);

  const loadMonitoringData = async () => {
    try {
      // Load recent alerts
      const { data: alertsData, error: alertsError } = await supabase
        .from("product_alerts")
        .select(
          `
          *,
          product:products(name, current_price, image_url, store:stores(name))
        `
        )
        .order("created_at", { ascending: false })
        .limit(50);

      if (alertsError) throw alertsError;
      setAlerts(alertsData || []);

      // Load monitoring stats
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("id, is_active");

      if (productsError) throw productsError;

      const { data: watchlistsData, error: watchlistsError } = await supabase
        .from("user_watchlists")
        .select("id, user_id")
        .eq("user_id", user.id);

      if (watchlistsError) throw watchlistsError;

      const { data: priceAlertsData, error: priceAlertsError } = await supabase
        .from("product_alerts")
        .select("id")
        .eq("alert_type", "price_change")
        .gte(
          "created_at",
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        );

      if (priceAlertsError) throw priceAlertsError;

      const { data: stockAlertsData, error: stockAlertsError } = await supabase
        .from("product_alerts")
        .select("id")
        .eq("alert_type", "stock_change")
        .gte(
          "created_at",
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        );

      if (stockAlertsError) throw stockAlertsError;

      setStats({
        totalProducts: productsData?.length || 0,
        monitoredProducts: watchlistsData?.length || 0,
        priceAlerts: priceAlertsData?.length || 0,
        stockAlerts: stockAlertsData?.length || 0,
        recentAlerts: alertsData?.length || 0,
      });
    } catch (error) {
      console.error("Error loading monitoring data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case "stock_change":
        return <Package className="h-4 w-4" />;
      case "price_change":
        return <TrendingDown className="h-4 w-4" />;
      case "new_product":
        return <Bell className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getAlertBadge = (alertType: string) => {
    switch (alertType) {
      case "stock_change":
        return <Badge variant="secondary">Stock Change</Badge>;
      case "price_change":
        return <Badge variant="default">Price Change</Badge>;
      case "new_product":
        return <Badge variant="outline">New Product</Badge>;
      default:
        return <Badge variant="outline">Alert</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="text-sm text-gray-500 mt-2">Loading monitoring data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Product Monitoring
          </h2>
          <p className="text-gray-600">
            Track price changes, stock updates, and new product alerts
          </p>
        </div>
        <Button>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Products
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">In catalog</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monitored</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.monitoredProducts}</div>
            <p className="text-xs text-muted-foreground">In watchlist</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Price Alerts</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.priceAlerts}</div>
            <p className="text-xs text-muted-foreground">Last 24h</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Alerts</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.stockAlerts}</div>
            <p className="text-xs text-muted-foreground">Last 24h</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Alerts</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentAlerts}</div>
            <p className="text-xs text-muted-foreground">Total alerts</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Alerts</TabsTrigger>
          <TabsTrigger value="price">Price Changes</TabsTrigger>
          <TabsTrigger value="stock">Stock Updates</TabsTrigger>
          <TabsTrigger value="new">New Products</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {alerts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No alerts yet
                </h3>
                <p className="text-gray-500">
                  Alerts will appear here when products you're monitoring change
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <Card key={alert.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        {getAlertIcon(alert.alert_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-gray-900">
                            {alert.product?.name || "Unknown Product"}
                          </h4>
                          <div className="flex items-center space-x-2">
                            {getAlertBadge(alert.alert_type)}
                            <span className="text-xs text-gray-500">
                              {new Date(alert.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {alert.message}
                        </p>
                        {alert.product && (
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span>€{alert.product.current_price}</span>
                            <span>{alert.product.store?.name}</span>
                            {alert.product.image_url && (
                              <img
                                src={alert.product.image_url}
                                alt={alert.product.name}
                                className="w-8 h-8 object-cover rounded"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="price" className="space-y-4">
          {alerts.filter((alert) => alert.alert_type === "price_change")
            .length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <TrendingDown className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No price alerts
                </h3>
                <p className="text-gray-500">
                  Price change alerts will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {alerts
                .filter((alert) => alert.alert_type === "price_change")
                .map((alert) => (
                  <Card key={alert.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-4">
                        <TrendingDown className="h-4 w-4 text-green-500" />
                        <div className="flex-1">
                          <h4 className="text-sm font-medium">
                            {alert.product?.name}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {alert.message}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span>
                              €{alert.old_value} → €{alert.new_value}
                            </span>
                            <span>
                              {new Date(alert.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="stock" className="space-y-4">
          {alerts.filter((alert) => alert.alert_type === "stock_change")
            .length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No stock alerts
                </h3>
                <p className="text-gray-500">
                  Stock change alerts will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {alerts
                .filter((alert) => alert.alert_type === "stock_change")
                .map((alert) => (
                  <Card key={alert.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-4">
                        <Package className="h-4 w-4 text-blue-500" />
                        <div className="flex-1">
                          <h4 className="text-sm font-medium">
                            {alert.product?.name}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {alert.message}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span>
                              {alert.old_value ? "In Stock" : "Out of Stock"} →{" "}
                              {alert.new_value ? "In Stock" : "Out of Stock"}
                            </span>
                            <span>
                              {new Date(alert.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="new" className="space-y-4">
          {alerts.filter((alert) => alert.alert_type === "new_product")
            .length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No new product alerts
                </h3>
                <p className="text-gray-500">
                  New product alerts will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {alerts
                .filter((alert) => alert.alert_type === "new_product")
                .map((alert) => (
                  <Card key={alert.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-4">
                        <Bell className="h-4 w-4 text-purple-500" />
                        <div className="flex-1">
                          <h4 className="text-sm font-medium">
                            {alert.product?.name}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {alert.message}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span>€{alert.product?.current_price}</span>
                            <span>
                              {new Date(alert.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
