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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Search,
  Filter,
  Plus,
  Package,
  Store,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Heart,
  ShoppingCart,
} from "lucide-react";
import { useAuthContext } from "@/components/auth-provider";
import { supabase } from "@/app/lib/supabaseClient";

interface Product {
  id: string;
  name: string;
  url: string;
  current_price: number;
  original_price?: number;
  is_available: boolean;
  image_url?: string;
  sku?: string;
  category?: string;
  brand?: string;
  description?: string;
  stock_quantity?: number;
  last_updated: string;
  store: {
    id: string;
    name: string;
    domain: string;
    logo_url?: string;
  };
  price_history?: {
    price: number;
    date: string;
  }[];
}

interface Store {
  id: string;
  name: string;
  domain: string;
  is_active: boolean;
  logo_url?: string;
}

export function ProductCatalog() {
  const { user } = useAuthContext();
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newProductUrl, setNewProductUrl] = useState("");

  useEffect(() => {
    if (user) {
      loadProducts();
      loadStores();
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
          store:stores(id, name, domain, logo_url)
        `
        )
        .order("last_updated", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStores = async () => {
    try {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setStores(data || []);
    } catch (error) {
      console.error("Error loading stores:", error);
    }
  };

  const addProduct = async () => {
    if (!newProductUrl.trim()) return;

    try {
      const response = await fetch("/api/products/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: newProductUrl,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to scrape product");
      }

      const result = await response.json();
      await loadProducts();
      setShowAddDialog(false);
      setNewProductUrl("");
    } catch (error) {
      console.error("Error adding product:", error);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.brand?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStore =
      selectedStore === "all" || product.store.id === selectedStore;
    const matchesCategory =
      selectedCategory === "all" || product.category === selectedCategory;

    return matchesSearch && matchesStore && matchesCategory;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case "price_low":
        return a.current_price - b.current_price;
      case "price_high":
        return b.current_price - a.current_price;
      case "name":
        return a.name.localeCompare(b.name);
      case "newest":
      default:
        return (
          new Date(b.last_updated).getTime() -
          new Date(a.last_updated).getTime()
        );
    }
  });

  const getPriceChange = (product: Product) => {
    if (!product.price_history || product.price_history.length < 2) return null;

    const latest = product.price_history[0];
    const previous = product.price_history[1];
    const change = latest.price - previous.price;
    const percentage = (change / previous.price) * 100;

    return { change, percentage };
  };

  const getAvailabilityBadge = (product: Product) => {
    if (!product.is_available) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    }

    if (product.stock_quantity && product.stock_quantity < 5) {
      return <Badge variant="secondary">Low Stock</Badge>;
    }

    return <Badge variant="default">In Stock</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Product Catalog</h2>
          <p className="text-gray-600">
            Discover and monitor Pokémon products across all supported stores
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>
                Enter a product URL to automatically scrape and add it to your
                catalog
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="product-url">Product URL</Label>
                <Input
                  id="product-url"
                  placeholder="https://example.com/product"
                  value={newProductUrl}
                  onChange={(e) => setNewProductUrl(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAddDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={addProduct} disabled={!newProductUrl.trim()}>
                  Add Product
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="search">Search Products</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by name or brand..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="store-filter">Store</Label>
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger>
                  <SelectValue placeholder="All Stores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stores</SelectItem>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="category-filter">Category</Label>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="cards">Trading Cards</SelectItem>
                  <SelectItem value="figures">Figures & Toys</SelectItem>
                  <SelectItem value="games">Video Games</SelectItem>
                  <SelectItem value="merchandise">Merchandise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="sort">Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="price_low">Price: Low to High</SelectItem>
                  <SelectItem value="price_high">Price: High to Low</SelectItem>
                  <SelectItem value="name">Name A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">Loading products...</p>
        </div>
      ) : sortedProducts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No products found
            </h3>
            <p className="text-gray-500 mb-4">
              {searchQuery ||
              selectedStore !== "all" ||
              selectedCategory !== "all"
                ? "Try adjusting your filters to see more products"
                : "Add your first product to get started"}
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sortedProducts.map((product) => {
            const priceChange = getPriceChange(product);

            return (
              <Card key={product.id} className="overflow-hidden">
                <div className="aspect-square relative bg-gray-100">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    {getAvailabilityBadge(product)}
                  </div>
                  {priceChange && (
                    <div className="absolute top-2 left-2">
                      <Badge
                        variant={
                          priceChange.change < 0 ? "default" : "destructive"
                        }
                        className="bg-green-500 hover:bg-green-600"
                      >
                        {priceChange.change < 0 ? "↓" : "↑"}{" "}
                        {Math.abs(priceChange.percentage).toFixed(1)}%
                      </Badge>
                    </div>
                  )}
                </div>

                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h3 className="font-medium text-sm line-clamp-2">
                        {product.name}
                      </h3>
                      <div className="flex items-center text-xs text-gray-500 ml-2">
                        <Store className="h-3 w-3 mr-1" />
                        {product.store.name}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-bold">
                          €{product.current_price}
                        </span>
                        {product.original_price &&
                          product.original_price > product.current_price && (
                            <span className="text-sm text-gray-500 line-through">
                              €{product.original_price}
                            </span>
                          )}
                      </div>
                      {product.stock_quantity && (
                        <span className="text-xs text-gray-500">
                          {product.stock_quantity} left
                        </span>
                      )}
                    </div>

                    {product.brand && (
                      <p className="text-xs text-gray-500">{product.brand}</p>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center space-x-1">
                        <Button size="sm" variant="outline">
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button size="sm" variant="outline">
                          <Heart className="h-3 w-3 mr-1" />
                          Watch
                        </Button>
                      </div>
                      <Button size="sm">
                        <ShoppingCart className="h-3 w-3 mr-1" />
                        Create Task
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
