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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  Eye,
  EyeOff,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Package,
  Monitor,
} from "lucide-react";
import { useAuthContext } from "@/components/auth-provider";
import { supabase } from "@/app/lib/supabaseClient";

interface Product {
  id: string;
  name: string;
  url: string;
  current_price: number;
  is_available: boolean;
  image_url?: string;
  sku?: string;
  last_checked: string;
  store: {
    name: string;
    base_url: string;
  };
}

interface WatchlistItem {
  id: string;
  product: Product;
  max_price?: number;
  auto_purchase: boolean;
  created_at: string;
  status: "monitoring" | "purchased" | "failed" | "paused";
}

export function UnifiedProductManagement() {
  const { user } = useAuthContext();
  const [activeTab, setActiveTab] = useState("catalog");
  const [products, setProducts] = useState<Product[]>([]);
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<
    "all" | "monitoring" | "purchased" | "failed"
  >("all");

  useEffect(() => {
    if (user) {
      loadProducts();
      loadWatchlistItems();
    }
  }, [user]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select(
          `
          *,
          store:stores(name, base_url)
        `
        )
        .eq("is_available", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadWatchlistItems = async () => {
    try {
      const { data, error } = await supabase
        .from("watchlist_items")
        .select(
          `
          *,
          product:products(
            *,
            store:stores(name, base_url)
          )
        `
        )
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWatchlistItems(data || []);
    } catch (error) {
      console.error("Error loading watchlist items:", error);
    }
  };

  const searchProducts = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select(
          `
          *,
          store:stores(name, base_url)
        `
        )
        .ilike("name", `%${searchQuery}%`)
        .eq("is_available", true)
        .limit(20);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error searching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const addToWatchlist = async (productId: string) => {
    try {
      const { error } = await supabase.from("watchlist_items").insert({
        user_id: user?.id,
        product_id: productId,
        status: "paused",
        auto_purchase: false,
      });

      if (error) throw error;
      await loadWatchlistItems();
    } catch (error) {
      console.error("Error adding to watchlist:", error);
    }
  };

  const toggleMonitoring = async (itemId: string, enabled: boolean) => {
    try {
      const endpoint = enabled
        ? "/api/monitoring/start"
        : "/api/monitoring/stop";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ watchlistItemId: itemId }),
      });

      if (response.ok) {
        setWatchlistItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? { ...item, status: enabled ? "monitoring" : "paused" }
              : item
          )
        );
      }
    } catch (error) {
      console.error("Failed to toggle monitoring:", error);
    }
  };

  const toggleAutoPurchase = async (itemId: string, enabled: boolean) => {
    try {
      const response = await fetch("/api/watchlist/auto-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, autoPurchase: enabled }),
      });

      if (response.ok) {
        setWatchlistItems((prev) =>
          prev.map((item) =>
            item.id === itemId ? { ...item, auto_purchase: enabled } : item
          )
        );
      }
    } catch (error) {
      console.error("Failed to toggle auto-purchase:", error);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("nl-BE", {
      style: "currency",
      currency: "EUR",
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("nl-BE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (item: WatchlistItem) => {
    switch (item.status) {
      case "monitoring":
        return <Badge variant="default">Monitoring</Badge>;
      case "purchased":
        return <Badge variant="secondary">Purchased</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "paused":
        return <Badge variant="outline">Paused</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getAvailabilityBadge = (product: Product) => {
    if (product.is_available) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          In Stock
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary">
          <AlertCircle className="w-3 h-3 mr-1" />
          Out of Stock
        </Badge>
      );
    }
  };

  const getPriceStatus = (item: WatchlistItem) => {
    if (!item.max_price) return null;

    if (item.product.current_price <= item.max_price) {
      return (
        <div className="flex items-center text-green-600">
          <TrendingDown className="w-4 h-4 mr-1" />
          <span className="text-sm">Within budget</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center text-red-600">
          <TrendingUp className="w-4 h-4 mr-1" />
          <span className="text-sm">Over budget</span>
        </div>
      );
    }
  };

  const filteredWatchlistItems = watchlistItems.filter((item) => {
    if (filter === "all") return true;
    return item.status === filter;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Products</h1>
          <p className="text-gray-600">
            Discover Pokémon products and manage your watchlist
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="catalog" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Product Catalog
          </TabsTrigger>
          <TabsTrigger value="monitor" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Watchlist ({watchlistItems.length})
          </TabsTrigger>
        </TabsList>

        {/* Product Catalog Tab */}
        <TabsContent value="catalog" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Search Products</CardTitle>
              <CardDescription>
                Find Pokémon products from supported stores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search for products (e.g., 'Pokémon cards', 'Pikachu plush')"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && searchProducts()}
                    className="pl-10"
                  />
                </div>
                <Button onClick={searchProducts} disabled={loading}>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
            </CardContent>
          </Card>

          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-600 mt-2">Searching products...</p>
            </div>
          )}

          {products.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <Card
                  key={product.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-4">
                    {product.image_url && (
                      <div className="aspect-square mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold line-clamp-2 flex-1">
                          {product.name}
                        </h3>
                        {getAvailabilityBadge(product)}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-green-600">
                          {formatPrice(product.current_price)}
                        </span>
                        <Badge variant="outline">{product.store.name}</Badge>
                      </div>

                      {product.sku && (
                        <Badge variant="outline">SKU: {product.sku}</Badge>
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(product.url, "_blank")}
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => addToWatchlist(product.id)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add to Watchlist
                        </Button>
                      </div>

                      <div className="text-xs text-gray-500">
                        Last checked: {formatDate(product.last_checked)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {products.length === 0 && !loading && (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No products found
                </h3>
                <p className="text-gray-500">
                  {searchQuery
                    ? "Try a different search term"
                    : "Search for products to get started"}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Watchlist Tab */}
        <TabsContent value="monitor" className="space-y-6">
          <div className="flex gap-2">
            {[
              { key: "all", label: "All Items", count: watchlistItems.length },
              {
                key: "monitoring",
                label: "Monitoring",
                count: watchlistItems.filter((i) => i.status === "monitoring")
                  .length,
              },
              {
                key: "purchased",
                label: "Purchased",
                count: watchlistItems.filter((i) => i.status === "purchased")
                  .length,
              },
              {
                key: "failed",
                label: "Failed",
                count: watchlistItems.filter((i) => i.status === "failed")
                  .length,
              },
            ].map(({ key, label, count }) => (
              <Button
                key={key}
                variant={filter === key ? "default" : "outline"}
                onClick={() => setFilter(key as any)}
                className="relative"
              >
                {label}
                <Badge variant="secondary" className="ml-2">
                  {count}
                </Badge>
              </Button>
            ))}
          </div>

          {filteredWatchlistItems.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Eye className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No items found
                </h3>
                <p className="text-gray-500">
                  {filter === "all"
                    ? "Add some products to your watchlist to start monitoring"
                    : `No items with status "${filter}" found`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredWatchlistItems.map((item) => (
                <Card key={item.id} className="relative">
                  <CardContent className="p-4">
                    {item.product.image_url && (
                      <div className="aspect-square mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
                        <img
                          src={item.product.image_url}
                          alt={item.product.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold line-clamp-2 flex-1">
                          {item.product.name}
                        </h3>
                        {getStatusBadge(item)}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-green-600">
                          {formatPrice(item.product.current_price)}
                        </span>
                        {getAvailabilityBadge(item.product)}
                      </div>

                      {getPriceStatus(item)}

                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {item.product.store.name}
                        </Badge>
                        {item.product.sku && (
                          <Badge variant="outline">
                            SKU: {item.product.sku}
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label
                            htmlFor={`monitoring-${item.id}`}
                            className="text-sm"
                          >
                            Monitoring
                          </Label>
                          <Switch
                            id={`monitoring-${item.id}`}
                            checked={item.status === "monitoring"}
                            onCheckedChange={(enabled) =>
                              toggleMonitoring(item.id, enabled)
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label
                            htmlFor={`auto-purchase-${item.id}`}
                            className="text-sm"
                          >
                            Auto-purchase
                          </Label>
                          <Switch
                            id={`auto-purchase-${item.id}`}
                            checked={item.auto_purchase}
                            onCheckedChange={(enabled) =>
                              toggleAutoPurchase(item.id, enabled)
                            }
                            disabled={item.status !== "monitoring"}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            window.open(item.product.url, "_blank")
                          }
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        {item.product.is_available &&
                          item.status === "monitoring" && (
                            <Button size="sm">
                              <ShoppingCart className="w-4 h-4 mr-1" />
                              Buy Now
                            </Button>
                          )}
                      </div>

                      <div className="text-xs text-gray-500">
                        Last checked: {formatDate(item.product.last_checked)}
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
