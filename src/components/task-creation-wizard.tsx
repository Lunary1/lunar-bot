"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuthContext } from "@/components/auth-provider";
import { supabase } from "@/app/lib/supabaseClient";
import {
  Store,
  Package,
  User,
  Shield,
  Settings,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Search,
  Plus,
  Link as LinkIcon,
} from "lucide-react";

interface StoreData {
  id: string;
  name: string;
  domain: string;
  is_active: boolean;
  requires_proxy: boolean;
  logo_url?: string;
}

interface Product {
  id: string;
  name: string;
  url: string;
  current_price: number;
  is_available: boolean;
  image_url?: string;
  store: {
    name: string;
  };
}

interface UserProfile {
  id: string;
  profile_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  billing_street?: string;
  billing_city?: string;
  billing_state?: string;
  billing_postal_code?: string;
  billing_country?: string;
  shipping_street?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_postal_code?: string;
  shipping_country?: string;
  is_default?: boolean;
  same_as_billing?: boolean;
}

interface StoreAccount {
  id: string;
  username: string;
  store: {
    name: string;
  };
}

interface Proxy {
  id: string;
  name: string;
  host: string;
  port: number;
  success_rate: number;
  is_active: boolean;
}

interface TaskConfig {
  storeId: string;
  productId?: string;
  productUrl?: string;
  profileId: string;
  storeAccountId: string;
  proxyId?: string;
  quantity: number;
  maxPrice?: number;
  autoPurchase: boolean;
  delay: number;
  retries: number;
  priority: number;
  mode: "monitor" | "purchase";
}

const steps = [
  { id: 1, title: "Select Store", icon: Store },
  { id: 2, title: "Select Product", icon: Package },
  { id: 3, title: "Assign Profile", icon: User },
  { id: 4, title: "Assign Proxy", icon: Shield },
  { id: 5, title: "Configure Task", icon: Settings },
  { id: 6, title: "Review & Confirm", icon: CheckCircle },
];

export function TaskCreationWizard({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (config: TaskConfig) => void;
}) {
  const { user, profile } = useAuthContext();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Data states
  const [stores, setStores] = useState<StoreData[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [storeAccounts, setStoreAccounts] = useState<StoreAccount[]>([]);
  const [proxies, setProxies] = useState<Proxy[]>([]);

  // Selection states
  const [selectedStore, setSelectedStore] = useState<StoreData | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(
    null
  );
  const [selectedStoreAccount, setSelectedStoreAccount] =
    useState<StoreAccount | null>(null);
  const [selectedProxy, setSelectedProxy] = useState<Proxy | null>(null);

  // Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [useManualUrl, setUseManualUrl] = useState(false);

  // Task configuration
  const [taskConfig, setTaskConfig] = useState<TaskConfig>({
    storeId: "",
    productId: "",
    productUrl: "",
    profileId: "",
    storeAccountId: "",
    proxyId: "",
    quantity: 1,
    maxPrice: undefined,
    autoPurchase: false,
    delay: 2000,
    retries: 3,
    priority: 0,
    mode: "monitor",
  });

  // Fetch initial data
  useEffect(() => {
    if (user) {
      fetchInitialData();
    }
  }, [user]);

  // Load products automatically when a store is selected
  useEffect(() => {
    if (selectedStore) {
      setProducts([]); // Clear previous products
      setSelectedProduct(null); // Clear previous selection
      loadStoreProducts();
    } else {
      setProducts([]);
      setSelectedProduct(null);
    }
  }, [selectedStore]);

  const fetchInitialData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch stores
      const { data: storesData } = await supabase
        .from("stores")
        .select("*")
        .eq("is_active", true)
        .order("name");

      // Fetch shipping profiles
      const { data: profilesData } = await supabase
        .from("shipping_profiles")
        .select(
          `
          id,
          profile_name,
          first_name,
          last_name,
          email,
          phone,
          billing_street,
          billing_city,
          billing_state,
          billing_postal_code,
          billing_country,
          shipping_street,
          shipping_city,
          shipping_state,
          shipping_postal_code,
          shipping_country,
          is_default,
          same_as_billing
        `
        )
        .eq("user_id", user.id);

      // Fetch store accounts
      const { data: accountsData } = await supabase
        .from("user_store_accounts")
        .select(
          `
          id,
          username,
          store_id,
          stores(name)
        `
        )
        .eq("user_id", user.id)
        .eq("is_active", true);

      // Fetch proxies
      const { data: proxiesData } = await supabase
        .from("proxies")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true);

      // Transform store accounts data
      const transformedAccounts =
        accountsData?.map((account) => ({
          id: account.id,
          username: account.username,
          store: {
            name:
              Array.isArray(account.stores) && account.stores.length > 0
                ? account.stores[0].name
                : "Unknown Store",
          },
        })) || [];

      setStores(storesData || []);
      setProfiles(profilesData || []);
      setStoreAccounts(transformedAccounts);
      setProxies(proxiesData || []);
    } catch (error) {
      console.error("Error fetching initial data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStoreProducts = async () => {
    if (!selectedStore) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select(
          `
          id,
          name,
          url,
          current_price,
          is_available,
          image_url
        `
        )
        .eq("store_id", selectedStore.id)
        .eq("is_available", true)
        .order("name")
        .limit(20);

      if (error) throw error;

      // Transform the data to match our Product interface
      const transformedProducts =
        data?.map((product) => ({
          ...product,
          store: { name: selectedStore.name },
        })) || [];

      setProducts(transformedProducts);
    } catch (error) {
      console.error("Error loading store products:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const searchProducts = async () => {
    if (!searchQuery.trim() || !selectedStore) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select(
          `
          id,
          name,
          url,
          current_price,
          is_available,
          image_url
        `
        )
        .ilike("name", `%${searchQuery}%`)
        .eq("store_id", selectedStore.id)
        .eq("is_available", true)
        .limit(10);

      if (error) throw error;

      // Transform the data to match our Product interface
      const transformedProducts =
        data?.map((product) => ({
          ...product,
          store: { name: selectedStore.name },
        })) || [];

      setProducts(transformedProducts);
    } catch (error) {
      console.error("Error searching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Create task via API
      const response = await fetch("/api/tasks/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user?.id,
          storeId: selectedStore?.id,
          productId: selectedProduct?.id,
          productUrl: useManualUrl ? productUrl : undefined,
          profileId: selectedProfile?.id,
          storeAccountId: selectedStoreAccount?.id,
          proxyId: selectedProxy?.id,
          quantity: taskConfig.quantity,
          maxPrice: taskConfig.maxPrice,
          autoPurchase: taskConfig.autoPurchase,
          delay: taskConfig.delay,
          retries: taskConfig.retries,
          priority: taskConfig.priority,
          mode: taskConfig.mode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create task");
      }

      const result = await response.json();
      onSubmit(result);
      onClose();
    } catch (error) {
      console.error("Error creating task:", error);
      // You might want to show an error message to the user here
    } finally {
      setSubmitting(false);
    }
  };

  const getStepProgress = () => {
    return (currentStep / steps.length) * 100;
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return selectedStore !== null;
      case 2:
        return (
          selectedProduct !== null || (useManualUrl && productUrl.trim() !== "")
        );
      case 3:
        return selectedProfile !== null;
      case 4:
        // Proxy is optional for most stores, but required for some (like Bol.com)
        if (selectedStore?.requires_proxy) {
          return selectedProxy !== null;
        }
        return true; // Optional for stores that don't require proxy
      case 5:
        return selectedStoreAccount !== null; // Store account is required for task configuration
      case 6:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Create New Task</CardTitle>
              <CardDescription>
                Set up an automated purchase task for Pokémon products
              </CardDescription>
            </div>
            <Button variant="ghost" onClick={onClose}>
              ×
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                Step {currentStep} of {steps.length}
              </span>
              <span className="text-sm text-gray-500">
                {Math.round(getStepProgress())}%
              </span>
            </div>
            <Progress value={getStepProgress()} className="h-2" />
          </div>

          {/* Step Indicators */}
          <div className="flex items-center justify-between mt-4">
            {steps.map((step) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    currentStep >= step.id
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  <step.icon className="h-4 w-4" />
                </div>
                <span
                  className={`ml-2 text-sm ${
                    currentStep >= step.id ? "text-blue-600" : "text-gray-500"
                  }`}
                >
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Select Store */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label className="text-lg font-medium">Select Store</Label>
                <p className="text-sm text-gray-600 mb-4">
                  Choose the store where you want to monitor products
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stores.map((store) => (
                  <div
                    key={store.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedStore?.id === store.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedStore(store)}
                  >
                    <div className="flex items-center gap-3">
                      {store.logo_url ? (
                        <img
                          src={store.logo_url}
                          alt={store.name}
                          className="w-12 h-12 object-contain"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                          <Store className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <h4 className="font-medium">{store.name}</h4>
                        <p className="text-sm text-gray-500">{store.domain}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Select Product */}
          {currentStep === 2 && selectedStore && (
            <div className="space-y-4">
              <div>
                <Label className="text-lg font-medium">Select Product</Label>
                <p className="text-sm text-gray-600 mb-4">
                  Choose a product from {selectedStore.name} or enter a manual
                  URL
                </p>
              </div>

              {/* Toggle between search and manual URL */}
              <div className="flex gap-4 mb-4">
                <Button
                  variant={!useManualUrl ? "default" : "outline"}
                  onClick={() => setUseManualUrl(false)}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search Products
                </Button>
                <Button
                  variant={useManualUrl ? "default" : "outline"}
                  onClick={() => setUseManualUrl(true)}
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Manual URL
                </Button>
              </div>

              {!useManualUrl ? (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search for products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && searchProducts()}
                    />
                    <Button onClick={searchProducts} disabled={loading}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>

                  {loading && (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                      <p className="text-sm text-gray-500 mt-2">
                        Loading products from {selectedStore.name}...
                      </p>
                    </div>
                  )}

                  {!loading && products.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium mb-2">
                        No products found
                      </p>
                      <p className="text-sm">
                        No products available for {selectedStore.name} or try
                        searching for specific items.
                      </p>
                    </div>
                  )}

                  {!loading && products.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 mb-3">
                        {products.length} products available from{" "}
                        {selectedStore.name}
                      </p>
                      <div className="grid gap-3 max-h-60 overflow-y-auto">
                        {products.map((product) => (
                          <div
                            key={product.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              selectedProduct?.id === product.id
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                            onClick={() => setSelectedProduct(product)}
                          >
                            <div className="flex items-center gap-3">
                              {product.image_url && (
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  className="w-12 h-12 object-cover rounded"
                                />
                              )}
                              <div className="flex-1">
                                <h4 className="font-medium text-sm">
                                  {product.name}
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-sm font-medium">
                                    €{product.current_price}
                                  </span>
                                  <Badge
                                    variant={
                                      product.is_available
                                        ? "default"
                                        : "secondary"
                                    }
                                  >
                                    {product.is_available
                                      ? "In Stock"
                                      : "Out of Stock"}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="productUrl">Product URL</Label>
                    <Input
                      id="productUrl"
                      placeholder="https://example.com/product"
                      value={productUrl}
                      onChange={(e) => setProductUrl(e.target.value)}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Enter the direct URL to the product you want to monitor
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Assign Profile */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <Label className="text-lg font-medium">Assign Profile</Label>
                <p className="text-sm text-gray-600 mb-4">
                  Select the billing and shipping profile to use for this task
                </p>
              </div>

              <div className="space-y-4">
                {profiles.length > 0 && (
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">
                      Select a profile or create a new one
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onClose();
                        router.push("/profiles");
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Profile
                    </Button>
                  </div>
                )}
                <div className="grid gap-3">
                  {profiles.length > 0 ? (
                    profiles.map((profile) => (
                      <div
                        key={profile.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedProfile?.id === profile.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => setSelectedProfile(profile)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">
                              {profile.profile_name}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {profile.first_name} {profile.last_name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {profile.email}
                            </p>
                            <p className="text-sm text-gray-500">
                              {profile.billing_city || "N/A"},{" "}
                              {profile.billing_country || "N/A"}
                            </p>
                            {profile.is_default && (
                              <Badge variant="secondary" className="mt-1">
                                Default
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <User className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No profiles found
                      </h3>
                      <p className="text-gray-500 mb-4">
                        You need to create a profile before creating tasks.
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          onClose();
                          router.push("/profiles");
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Profile
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Assign Proxy */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <Label className="text-lg font-medium">
                  Assign Proxy{" "}
                  {selectedStore?.requires_proxy ? "(Required)" : "(Optional)"}
                </Label>
                <p className="text-sm text-gray-600 mb-4">
                  {selectedStore?.requires_proxy
                    ? `${selectedStore.name} requires a proxy for bot protection. Please select a proxy to continue.`
                    : "Select a proxy to use for this task, or skip to use no proxy"}
                </p>
                {selectedStore?.requires_proxy && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <p className="text-sm text-amber-800">
                        <strong>Proxy Required:</strong> {selectedStore.name}{" "}
                        has anti-bot protection that requires proxy usage.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-3">
                {!selectedStore?.requires_proxy && (
                  <div
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedProxy === null
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedProxy(null)}
                  >
                    <div className="flex items-center gap-3">
                      <Shield className="h-6 w-6 text-gray-400" />
                      <div>
                        <h4 className="font-medium">No Proxy</h4>
                        <p className="text-sm text-gray-500">
                          Use direct connection
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {proxies.map((proxy) => (
                  <div
                    key={proxy.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedProxy?.id === proxy.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedProxy(proxy)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{proxy.name}</h4>
                        <p className="text-sm text-gray-500">
                          {proxy.host}:{proxy.port}
                        </p>
                        <p className="text-sm text-gray-500">
                          {Math.round(proxy.success_rate * 100)}% success rate
                        </p>
                      </div>
                      <Badge
                        variant={proxy.is_active ? "default" : "secondary"}
                      >
                        {proxy.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                ))}

                {selectedStore?.requires_proxy && proxies.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Proxies Available
                    </h3>
                    <p className="text-gray-500 mb-4">
                      {selectedStore.name} requires a proxy, but you haven't set
                      up any proxies yet.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        onClose();
                        router.push("/proxies");
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Set Up Proxies
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Configure Task */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <Label className="text-lg font-medium">Configure Task</Label>
                <p className="text-sm text-gray-600 mb-4">
                  Set up the task parameters and automation settings
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="storeAccount">Store Account</Label>
                  <Select
                    value={selectedStoreAccount?.id || ""}
                    onValueChange={(value) => {
                      const account = storeAccounts.find((a) => a.id === value);
                      setSelectedStoreAccount(account || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select store account" />
                    </SelectTrigger>
                    <SelectContent>
                      {storeAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.username} ({account.store.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="mode">Task Mode</Label>
                  <Select
                    value={taskConfig.mode}
                    onValueChange={(value) =>
                      setTaskConfig({
                        ...taskConfig,
                        mode: value as "monitor" | "purchase",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monitor">Monitor Only</SelectItem>
                      <SelectItem value="purchase">Auto Purchase</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={taskConfig.quantity}
                    onChange={(e) =>
                      setTaskConfig({
                        ...taskConfig,
                        quantity: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="maxPrice">Max Price (Optional)</Label>
                  <Input
                    id="maxPrice"
                    type="number"
                    step="0.01"
                    placeholder="No limit"
                    value={taskConfig.maxPrice || ""}
                    onChange={(e) =>
                      setTaskConfig({
                        ...taskConfig,
                        maxPrice: e.target.value
                          ? parseFloat(e.target.value)
                          : undefined,
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={taskConfig.priority.toString()}
                    onValueChange={(value) =>
                      setTaskConfig({
                        ...taskConfig,
                        priority: parseInt(value),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Normal (0)</SelectItem>
                      <SelectItem value="1">High (1)</SelectItem>
                      <SelectItem value="2">Critical (2)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="delay">Delay (ms)</Label>
                  <Input
                    id="delay"
                    type="number"
                    min="1000"
                    step="500"
                    value={taskConfig.delay}
                    onChange={(e) =>
                      setTaskConfig({
                        ...taskConfig,
                        delay: parseInt(e.target.value) || 2000,
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="retries">Retry Attempts</Label>
                  <Input
                    id="retries"
                    type="number"
                    min="1"
                    max="10"
                    value={taskConfig.retries}
                    onChange={(e) =>
                      setTaskConfig({
                        ...taskConfig,
                        retries: parseInt(e.target.value) || 3,
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoPurchase"
                  checked={taskConfig.autoPurchase}
                  onChange={(e) =>
                    setTaskConfig({
                      ...taskConfig,
                      autoPurchase: e.target.checked,
                    })
                  }
                  className="rounded"
                />
                <Label htmlFor="autoPurchase">
                  Enable automatic purchase when in stock
                </Label>
              </div>
            </div>
          )}

          {/* Step 6: Review & Confirm */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <div>
                <Label className="text-lg font-medium">Review & Confirm</Label>
                <p className="text-sm text-gray-600 mb-4">
                  Review your task configuration before creating
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Store & Product</h4>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="text-gray-500">Store:</span>{" "}
                        {selectedStore?.name}
                      </p>
                      {selectedProduct ? (
                        <>
                          <p>
                            <span className="text-gray-500">Product:</span>{" "}
                            {selectedProduct.name}
                          </p>
                          <p>
                            <span className="text-gray-500">Price:</span> €
                            {selectedProduct.current_price}
                          </p>
                        </>
                      ) : (
                        <p>
                          <span className="text-gray-500">URL:</span>{" "}
                          {productUrl}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Profile & Account</h4>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="text-gray-500">Profile:</span>{" "}
                        {selectedProfile?.profile_name}
                      </p>
                      <p>
                        <span className="text-gray-500">Account:</span>{" "}
                        {selectedStoreAccount?.username}
                      </p>
                      <p>
                        <span className="text-gray-500">Proxy:</span>{" "}
                        {selectedProxy?.name || "None"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Task Configuration</h4>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="text-gray-500">Mode:</span>{" "}
                        {taskConfig.mode}
                      </p>
                      <p>
                        <span className="text-gray-500">Quantity:</span>{" "}
                        {taskConfig.quantity}
                      </p>
                      <p>
                        <span className="text-gray-500">Max Price:</span>{" "}
                        {taskConfig.maxPrice
                          ? `€${taskConfig.maxPrice}`
                          : "No limit"}
                      </p>
                      <p>
                        <span className="text-gray-500">Auto Purchase:</span>{" "}
                        {taskConfig.autoPurchase ? "Yes" : "No"}
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Settings</h4>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="text-gray-500">Delay:</span>{" "}
                        {taskConfig.delay}ms
                      </p>
                      <p>
                        <span className="text-gray-500">Retries:</span>{" "}
                        {taskConfig.retries}
                      </p>
                      <p>
                        <span className="text-gray-500">Priority:</span>{" "}
                        {taskConfig.priority}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              Back
            </Button>

            {currentStep < 6 ? (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed() || submitting}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Create Task
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
