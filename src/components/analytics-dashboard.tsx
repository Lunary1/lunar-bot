"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Package,
  Activity,
  Target,
  Zap,
} from "lucide-react";

interface AnalyticsData {
  overview: {
    totalTasks: number;
    successfulTasks: number;
    failedTasks: number;
    successRate: number;
    totalSpent: number;
    averageOrderValue: number;
    productsPurchased: number;
    autoPurchases: number;
  };
  performance: {
    averageResponseTime: number;
    uptime: number;
    productsMonitored: number;
    alertsSent: number;
  };
  trends: {
    dailyTasks: Array<{ date: string; count: number }>;
    successRate: Array<{ date: string; rate: number }>;
    spending: Array<{ date: string; amount: number }>;
  };
  topProducts: Array<{
    id: string;
    name: string;
    store: string;
    purchases: number;
    successRate: number;
  }>;
  recentActivity: Array<{
    id: string;
    type: "purchase" | "alert" | "monitoring";
    message: string;
    timestamp: string;
    status: "success" | "failed" | "pending";
  }>;
}

export default function AnalyticsDashboard() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("7d");

  // Fetch analytics data
  const fetchAnalyticsData = async () => {
    try {
      setIsLoading(true);

      // Mock data - in production, this would be a real API call
      const mockData: AnalyticsData = {
        overview: {
          totalTasks: 1247,
          successfulTasks: 1089,
          failedTasks: 158,
          successRate: 87.3,
          totalSpent: 12450.75,
          averageOrderValue: 89.45,
          productsPurchased: 1089,
          autoPurchases: 234,
        },
        performance: {
          averageResponseTime: 1.2,
          uptime: 99.8,
          productsMonitored: 156,
          alertsSent: 89,
        },
        trends: {
          dailyTasks: [
            { date: "2024-01-01", count: 45 },
            { date: "2024-01-02", count: 52 },
            { date: "2024-01-03", count: 38 },
            { date: "2024-01-04", count: 67 },
            { date: "2024-01-05", count: 73 },
            { date: "2024-01-06", count: 58 },
            { date: "2024-01-07", count: 61 },
          ],
          successRate: [
            { date: "2024-01-01", rate: 85.2 },
            { date: "2024-01-02", rate: 88.1 },
            { date: "2024-01-03", rate: 82.3 },
            { date: "2024-01-04", rate: 90.5 },
            { date: "2024-01-05", rate: 87.8 },
            { date: "2024-01-06", rate: 89.2 },
            { date: "2024-01-07", rate: 87.3 },
          ],
          spending: [
            { date: "2024-01-01", amount: 1250.5 },
            { date: "2024-01-02", amount: 1890.25 },
            { date: "2024-01-03", amount: 980.75 },
            { date: "2024-01-04", amount: 2100.0 },
            { date: "2024-01-05", amount: 1750.3 },
            { date: "2024-01-06", amount: 1420.8 },
            { date: "2024-01-07", amount: 1658.15 },
          ],
        },
        topProducts: [
          {
            id: "1",
            name: "Pokémon TCG Booster Pack",
            store: "Dreamland",
            purchases: 45,
            successRate: 92.3,
          },
          {
            id: "2",
            name: "Charizard Figure",
            store: "Pokémon Center",
            purchases: 38,
            successRate: 88.7,
          },
          {
            id: "3",
            name: "Pikachu Plush",
            store: "Bol.com",
            purchases: 32,
            successRate: 95.1,
          },
          {
            id: "4",
            name: "Pokémon Cards Set",
            store: "Dreamland",
            purchases: 28,
            successRate: 85.4,
          },
          {
            id: "5",
            name: "Poké Ball Replica",
            store: "Pokémon Center",
            purchases: 25,
            successRate: 90.2,
          },
        ],
        recentActivity: [
          {
            id: "1",
            type: "purchase",
            message: "Successfully purchased Pokémon TCG Booster Pack",
            timestamp: "2024-01-07T10:30:00Z",
            status: "success",
          },
          {
            id: "2",
            type: "alert",
            message: "Price drop alert: Charizard Figure - 15% off",
            timestamp: "2024-01-07T09:15:00Z",
            status: "success",
          },
          {
            id: "3",
            type: "monitoring",
            message: "Started monitoring Pikachu Plush",
            timestamp: "2024-01-07T08:45:00Z",
            status: "success",
          },
          {
            id: "4",
            type: "purchase",
            message: "Failed to purchase Pokémon Cards Set - Out of stock",
            timestamp: "2024-01-07T07:20:00Z",
            status: "failed",
          },
          {
            id: "5",
            type: "purchase",
            message: "Auto-purchase completed: Poké Ball Replica",
            timestamp: "2024-01-07T06:10:00Z",
            status: "success",
          },
        ],
      };

      setAnalyticsData(mockData);
    } catch (error) {
      console.error("Error fetching analytics data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Analytics Dashboard
            </h2>
            <p className="text-muted-foreground">Loading analytics data...</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded animate-pulse mb-2" />
                <div className="h-3 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Analytics Dashboard
            </h2>
            <p className="text-muted-foreground">
              Failed to load analytics data
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Analytics Dashboard
          </h2>
          <p className="text-muted-foreground">
            Performance metrics and insights for your Pokémon shopping bot
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">Last 7 days</Badge>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.overview.totalTasks.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {analyticsData.overview.successfulTasks} successful,{" "}
              {analyticsData.overview.failedTasks} failed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.overview.successRate}%
            </div>
            <Progress
              value={analyticsData.overview.successRate}
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{analyticsData.overview.totalSpent.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg: €{analyticsData.overview.averageOrderValue}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Auto-Purchases
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.overview.autoPurchases}
            </div>
            <p className="text-xs text-muted-foreground">
              {(
                (analyticsData.overview.autoPurchases /
                  analyticsData.overview.productsPurchased) *
                100
              ).toFixed(1)}
              % of total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.performance.averageResponseTime}s
            </div>
            <p className="text-xs text-muted-foreground">
              Average response time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.performance.uptime}%
            </div>
            <p className="text-xs text-muted-foreground">System availability</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Products Monitored
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.performance.productsMonitored}
            </div>
            <p className="text-xs text-muted-foreground">Active monitoring</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alerts Sent</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.performance.alertsSent}
            </div>
            <p className="text-xs text-muted-foreground">Notifications sent</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="products">Top Products</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Daily Tasks</CardTitle>
                <CardDescription>
                  Number of tasks executed per day
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analyticsData.trends.dailyTasks.map((day, index) => (
                    <div
                      key={day.date}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm">
                        {new Date(day.date).toLocaleDateString()}
                      </span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${(day.count / 80) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8">
                          {day.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Success Rate Trend</CardTitle>
                <CardDescription>Daily success rate over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analyticsData.trends.successRate.map((day, index) => (
                    <div
                      key={day.date}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm">
                        {new Date(day.date).toLocaleDateString()}
                      </span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${day.rate}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12">
                          {day.rate}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Products</CardTitle>
              <CardDescription>
                Products with highest purchase success rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.topProducts.map((product, index) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {product.store}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-medium">
                          {product.purchases} purchases
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {product.successRate}% success
                        </p>
                      </div>
                      <div className="w-16 bg-muted rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${product.successRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest bot activities and events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center space-x-4 p-4 border rounded-lg"
                  >
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full ${
                        activity.status === "success"
                          ? "bg-green-100 text-green-600"
                          : activity.status === "failed"
                          ? "bg-red-100 text-red-600"
                          : "bg-yellow-100 text-yellow-600"
                      }`}
                    >
                      {activity.type === "purchase" && (
                        <ShoppingCart className="h-4 w-4" />
                      )}
                      {activity.type === "alert" && (
                        <TrendingUp className="h-4 w-4" />
                      )}
                      {activity.type === "monitoring" && (
                        <Activity className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{activity.message}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <Badge
                      variant={
                        activity.status === "success"
                          ? "default"
                          : activity.status === "failed"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {activity.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
