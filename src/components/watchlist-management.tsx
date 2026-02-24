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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  ShoppingCart,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface WatchlistItem {
  id: string;
  product: {
    id: string;
    name: string;
    current_price: number;
    is_available: boolean;
    url: string;
    image_url: string;
    store: {
      id: string;
      name: string;
    };
  };
  max_price: number | null;
  auto_purchase: boolean;
  quantity: number;
  status: "monitoring" | "purchasing" | "paused";
  created_at: string;
  last_auto_purchase_attempt: string | null;
}

interface Product {
  id: string;
  name: string;
  current_price: number;
  is_available: boolean;
  url: string;
  image_url: string;
  store: {
    id: string;
    name: string;
  };
}

export default function WatchlistManagement() {
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [autoPurchaseSettings, setAutoPurchaseSettings] = useState({
    enabled: false,
    maxPrice: "",
    quantity: 1,
  });

  // Fetch watchlist items
  const fetchWatchlistItems = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/watchlist/items");
      const data = await response.json();

      if (data.success) {
        setWatchlistItems(data.data);
      } else {
        setError(data.message || "Failed to fetch watchlist items");
      }
    } catch (error) {
      console.error("Error fetching watchlist items:", error);
      setError("Failed to fetch watchlist items");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch available products
  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products/search");
      const data = await response.json();

      if (data.success) {
        setProducts(data.data);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  // Add item to watchlist
  const addToWatchlist = async () => {
    if (!selectedProduct) return;

    try {
      setIsLoading(true);
      const response = await fetch("/api/watchlist/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: selectedProduct.id,
          maxPrice: autoPurchaseSettings.maxPrice
            ? parseFloat(autoPurchaseSettings.maxPrice)
            : null,
          autoPurchase: autoPurchaseSettings.enabled,
          quantity: autoPurchaseSettings.quantity,
        }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchWatchlistItems();
        setIsAddDialogOpen(false);
        setSelectedProduct(null);
        setAutoPurchaseSettings({
          enabled: false,
          maxPrice: "",
          quantity: 1,
        });
      } else {
        setError(data.message || "Failed to add item to watchlist");
      }
    } catch (error) {
      console.error("Error adding to watchlist:", error);
      setError("Failed to add item to watchlist");
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle auto-purchase
  const toggleAutoPurchase = async (itemId: string, enabled: boolean) => {
    try {
      const response = await fetch("/api/watchlist/auto-purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          watchlistId: itemId,
          autoPurchase: enabled,
        }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchWatchlistItems();
      } else {
        setError(data.message || "Failed to update auto-purchase settings");
      }
    } catch (error) {
      console.error("Error toggling auto-purchase:", error);
      setError("Failed to update auto-purchase settings");
    }
  };

  // Remove item from watchlist
  const removeFromWatchlist = async (itemId: string) => {
    try {
      const response = await fetch(`/api/watchlist/items/${itemId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        await fetchWatchlistItems();
      } else {
        setError(data.message || "Failed to remove item from watchlist");
      }
    } catch (error) {
      console.error("Error removing from watchlist:", error);
      setError("Failed to remove item from watchlist");
    }
  };

  useEffect(() => {
    fetchWatchlistItems();
    fetchProducts();
  }, []);

  // Filter watchlist items
  const filteredItems = watchlistItems.filter((item) => {
    const matchesSearch =
      item.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product.store.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === "all" || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Watchlist Management
          </h2>
          <p className="text-muted-foreground">
            Monitor products and manage auto-purchase settings
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add Product</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Product to Watchlist</DialogTitle>
              <DialogDescription>
                Select a product to monitor and configure auto-purchase settings
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Search Products</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    className="pl-10"
                    onChange={(e) => {
                      const term = e.target.value.toLowerCase();
                      // Filter products based on search term
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Available Products</Label>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {products.slice(0, 10).map((product) => (
                    <div
                      key={product.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedProduct?.id === product.id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => setSelectedProduct(product)}
                    >
                      <div className="flex items-center space-x-3">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1">
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {product.store.name} • €{product.current_price}
                          </p>
                        </div>
                        <Badge
                          variant={
                            product.is_available ? "default" : "secondary"
                          }
                        >
                          {product.is_available ? "In Stock" : "Out of Stock"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedProduct && (
                <div className="space-y-4 p-4 border rounded-lg">
                  <h4 className="font-medium">Auto-Purchase Settings</h4>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="auto-purchase"
                      checked={autoPurchaseSettings.enabled}
                      onCheckedChange={(checked) =>
                        setAutoPurchaseSettings({
                          ...autoPurchaseSettings,
                          enabled: checked,
                        })
                      }
                    />
                    <Label htmlFor="auto-purchase">Enable Auto-Purchase</Label>
                  </div>

                  {autoPurchaseSettings.enabled && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="max-price">Maximum Price (€)</Label>
                        <Input
                          id="max-price"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={autoPurchaseSettings.maxPrice}
                          onChange={(e) =>
                            setAutoPurchaseSettings({
                              ...autoPurchaseSettings,
                              maxPrice: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input
                          id="quantity"
                          type="number"
                          min="1"
                          value={autoPurchaseSettings.quantity}
                          onChange={(e) =>
                            setAutoPurchaseSettings({
                              ...autoPurchaseSettings,
                              quantity: parseInt(e.target.value),
                            })
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={addToWatchlist}
                  disabled={!selectedProduct || isLoading}
                >
                  Add to Watchlist
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="flex items-center space-x-2 p-4 text-red-600 bg-red-50 border border-red-200 rounded-md">
          <AlertTriangle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search watchlist..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items</SelectItem>
            <SelectItem value="monitoring">Monitoring</SelectItem>
            <SelectItem value="purchasing">Purchasing</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Watchlist Table */}
      <Card>
        <CardHeader>
          <CardTitle>Watchlist Items ({filteredItems.length})</CardTitle>
          <CardDescription>
            Products you're monitoring with auto-purchase settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Auto-Purchase</TableHead>
                <TableHead>Last Check</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                      <div>
                        <p className="font-medium">{item.product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Qty: {item.quantity}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.product.store.name}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <span>€{item.product.current_price}</span>
                      {item.max_price && (
                        <span className="text-sm text-muted-foreground">
                          (max: €{item.max_price})
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          item.product.is_available
                            ? "bg-green-500"
                            : "bg-red-500"
                        }`}
                      />
                      <Badge
                        variant={
                          item.product.is_available ? "default" : "secondary"
                        }
                      >
                        {item.product.is_available
                          ? "In Stock"
                          : "Out of Stock"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={item.auto_purchase}
                        onCheckedChange={(checked) =>
                          toggleAutoPurchase(item.id, checked)
                        }
                      />
                      <span className="text-sm">
                        {item.auto_purchase ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {item.last_auto_purchase_attempt
                          ? new Date(
                              item.last_auto_purchase_attempt
                            ).toLocaleDateString()
                          : "Never"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(item.product.url, "_blank")}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromWatchlist(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
