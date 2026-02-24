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
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Play,
  Square,
  RefreshCw,
  TrendingUp,
  ShoppingCart,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
} from "lucide-react";

interface MonitoringStatus {
  isRunning: boolean;
  config: {
    checkInterval: number;
    priceChangeThreshold: number;
    stockChangeEnabled: boolean;
    priceDropEnabled: boolean;
    autoPurchaseEnabled: boolean;
    batchSize: number;
    delayBetweenBatches: number;
  };
  lastCheck: string | null;
}

interface MonitoringStats {
  totalProducts: number;
  activeWatchlists: number;
  autoPurchaseEnabled: number;
  recentAlerts: number;
  successRate: number;
}

export default function MonitoringDashboard() {
  const [monitoringStatus, setMonitoringStatus] =
    useState<MonitoringStatus | null>(null);
  const [stats, setStats] = useState<MonitoringStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch monitoring status
  const fetchMonitoringStatus = async () => {
    try {
      const response = await fetch("/api/monitoring/start");
      const data = await response.json();
      setMonitoringStatus(data.status);
    } catch (error) {
      console.error("Error fetching monitoring status:", error);
      setError("Failed to fetch monitoring status");
    }
  };

  // Fetch monitoring statistics
  const fetchStats = async () => {
    try {
      // This would be a real API call in production
      setStats({
        totalProducts: 156,
        activeWatchlists: 23,
        autoPurchaseEnabled: 8,
        recentAlerts: 12,
        successRate: 87.5,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  // Start monitoring
  const startMonitoring = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/monitoring/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          config: {
            checkInterval: 30,
            priceChangeThreshold: 5,
            stockChangeEnabled: true,
            priceDropEnabled: true,
            autoPurchaseEnabled: true,
            batchSize: 10,
            delayBetweenBatches: 5000,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMonitoringStatus(data.status);
      } else {
        setError(data.message || "Failed to start monitoring");
      }
    } catch (error) {
      console.error("Error starting monitoring:", error);
      setError("Failed to start monitoring");
    } finally {
      setIsLoading(false);
    }
  };

  // Stop monitoring
  const stopMonitoring = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/monitoring/stop", {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        setMonitoringStatus({ ...monitoringStatus!, isRunning: false });
      } else {
        setError(data.message || "Failed to stop monitoring");
      }
    } catch (error) {
      console.error("Error stopping monitoring:", error);
      setError("Failed to stop monitoring");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoringStatus();
    fetchStats();

    // Refresh status every 30 seconds
    const interval = setInterval(fetchMonitoringStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Monitoring Dashboard
          </h2>
          <p className="text-muted-foreground">
            Real-time product monitoring and auto-purchase management
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {monitoringStatus?.isRunning ? (
            <Button
              onClick={stopMonitoring}
              disabled={isLoading}
              variant="destructive"
              className="flex items-center space-x-2"
            >
              <Square className="h-4 w-4" />
              <span>Stop Monitoring</span>
            </Button>
          ) : (
            <Button
              onClick={startMonitoring}
              disabled={isLoading}
              className="flex items-center space-x-2"
            >
              <Play className="h-4 w-4" />
              <span>Start Monitoring</span>
            </Button>
          )}
          <Button
            onClick={fetchMonitoringStatus}
            disabled={isLoading}
            variant="outline"
            size="icon"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center space-x-2 p-4 text-red-600 bg-red-50 border border-red-200 rounded-md">
          <AlertTriangle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Status Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monitoring Status
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Badge
                variant={monitoringStatus?.isRunning ? "default" : "secondary"}
              >
                {monitoringStatus?.isRunning ? "Running" : "Stopped"}
              </Badge>
              {monitoringStatus?.isRunning && (
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Last check:{" "}
              {monitoringStatus?.lastCheck
                ? new Date(monitoringStatus.lastCheck).toLocaleTimeString()
                : "Never"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Products
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalProducts || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Products being monitored
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Watchlists
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.activeWatchlists || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.autoPurchaseEnabled || 0} with auto-purchase
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.successRate || 0}%</div>
            <Progress value={stats?.successRate || 0} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Configuration and Details */}
      <Tabs defaultValue="configuration" className="space-y-4">
        <TabsList>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="alerts">Recent Alerts</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="configuration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monitoring Configuration</CardTitle>
              <CardDescription>
                Current settings for product monitoring and auto-purchase
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {monitoringStatus?.config && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Check Interval
                    </label>
                    <p className="text-sm text-muted-foreground">
                      {monitoringStatus.config.checkInterval} minutes
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Price Change Threshold
                    </label>
                    <p className="text-sm text-muted-foreground">
                      {monitoringStatus.config.priceChangeThreshold}%
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Batch Size</label>
                    <p className="text-sm text-muted-foreground">
                      {monitoringStatus.config.batchSize} products per batch
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Delay Between Batches
                    </label>
                    <p className="text-sm text-muted-foreground">
                      {monitoringStatus.config.delayBetweenBatches / 1000}{" "}
                      seconds
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Features</label>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={
                      monitoringStatus?.config.stockChangeEnabled
                        ? "default"
                        : "secondary"
                    }
                  >
                    Stock Monitoring
                  </Badge>
                  <Badge
                    variant={
                      monitoringStatus?.config.priceDropEnabled
                        ? "default"
                        : "secondary"
                    }
                  >
                    Price Alerts
                  </Badge>
                  <Badge
                    variant={
                      monitoringStatus?.config.autoPurchaseEnabled
                        ? "default"
                        : "secondary"
                    }
                  >
                    Auto-Purchase
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Alerts</CardTitle>
              <CardDescription>
                Latest stock and price change notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* This would be populated with real alert data */}
                <div className="flex items-center space-x-4 p-4 border rounded-lg">
                  <div className="h-2 w-2 bg-green-500 rounded-full" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      Pokémon TCG Booster Pack
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Back in stock at Dreamland
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 inline mr-1" />2 minutes ago
                  </div>
                </div>

                <div className="flex items-center space-x-4 p-4 border rounded-lg">
                  <div className="h-2 w-2 bg-orange-500 rounded-full" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Charizard Figure</p>
                    <p className="text-xs text-muted-foreground">
                      Price dropped 15% at Pokémon Center
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 inline mr-1" />5 minutes ago
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>
                System performance and monitoring statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Average Response Time
                  </label>
                  <p className="text-2xl font-bold">1.2s</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Uptime</label>
                  <p className="text-2xl font-bold">99.8%</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Products Checked Today
                  </label>
                  <p className="text-2xl font-bold">2,847</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Auto-Purchases Today
                  </label>
                  <p className="text-2xl font-bold">12</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
