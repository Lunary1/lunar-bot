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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Shield,
  Users,
  Bot,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Settings,
} from "lucide-react";
import { useAuthContext } from "@/components/auth-provider";
import { supabase } from "@/app/lib/supabaseClient";
import { SubscriptionManagement } from "@/components/subscription-management";

interface StoreAccount {
  id: string;
  username: string;
  email?: string;
  is_active: boolean;
  created_at: string;
  store: {
    name: string;
    base_url: string;
  };
}

interface Proxy {
  id: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
  is_active: boolean;
  success_rate: number;
  created_at: string;
}

interface BotConfig {
  id: string;
  name: string;
  store: string;
  is_active: boolean;
  settings: any;
  created_at: string;
}

export function UnifiedSettingsManagement() {
  const { user, profile } = useAuthContext();
  const [activeTab, setActiveTab] = useState("accounts");
  const [storeAccounts, setStoreAccounts] = useState<StoreAccount[]>([]);
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [botConfigs, setBotConfigs] = useState<BotConfig[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showProxyDialog, setShowProxyDialog] = useState(false);
  const [showBotDialog, setShowBotDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);

  const loadAllData = async () => {
    await Promise.all([loadStoreAccounts(), loadProxies(), loadBotConfigs()]);
  };

  const loadStoreAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from("user_store_accounts")
        .select(
          `
          *,
          store:stores(name, base_url)
        `
        )
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setStoreAccounts(data || []);
    } catch (error) {
      console.error("Error loading store accounts:", error);
    }
  };

  const loadProxies = async () => {
    try {
      const { data, error } = await supabase
        .from("proxies")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProxies(data || []);
    } catch (error) {
      console.error("Error loading proxies:", error);
    }
  };

  const loadBotConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from("bot_configurations")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBotConfigs(data || []);
    } catch (error) {
      console.error("Error loading bot configs:", error);
    }
  };

  const handleAccountSubmit = async (formData: any) => {
    try {
      if (editingItem) {
        const { error } = await supabase
          .from("user_store_accounts")
          .update(formData)
          .eq("id", editingItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_store_accounts").insert({
          ...formData,
          user_id: user?.id,
        });

        if (error) throw error;
      }

      await loadStoreAccounts();
      setShowAccountDialog(false);
      setEditingItem(null);
    } catch (error) {
      console.error("Error saving account:", error);
    }
  };

  const handleProxySubmit = async (formData: any) => {
    try {
      if (editingItem) {
        const { error } = await supabase
          .from("proxies")
          .update(formData)
          .eq("id", editingItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("proxies").insert({
          ...formData,
          user_id: user?.id,
        });

        if (error) throw error;
      }

      await loadProxies();
      setShowProxyDialog(false);
      setEditingItem(null);
    } catch (error) {
      console.error("Error saving proxy:", error);
    }
  };

  const handleBotSubmit = async (formData: any) => {
    try {
      if (editingItem) {
        const { error } = await supabase
          .from("bot_configurations")
          .update(formData)
          .eq("id", editingItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("bot_configurations").insert({
          ...formData,
          user_id: user?.id,
        });

        if (error) throw error;
      }

      await loadBotConfigs();
      setShowBotDialog(false);
      setEditingItem(null);
    } catch (error) {
      console.error("Error saving bot config:", error);
    }
  };

  const deleteAccount = async (id: string) => {
    try {
      const { error } = await supabase
        .from("user_store_accounts")
        .delete()
        .eq("id", id);

      if (error) throw error;
      await loadStoreAccounts();
    } catch (error) {
      console.error("Error deleting account:", error);
    }
  };

  const deleteProxy = async (id: string) => {
    try {
      const { error } = await supabase.from("proxies").delete().eq("id", id);

      if (error) throw error;
      await loadProxies();
    } catch (error) {
      console.error("Error deleting proxy:", error);
    }
  };

  const deleteBotConfig = async (id: string) => {
    try {
      const { error } = await supabase
        .from("bot_configurations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      await loadBotConfigs();
    } catch (error) {
      console.error("Error deleting bot config:", error);
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Active
      </Badge>
    ) : (
      <Badge variant="secondary">
        <AlertCircle className="w-3 h-3 mr-1" />
        Inactive
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">
            Manage your accounts, proxies, bots, and subscription
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="accounts" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Accounts
          </TabsTrigger>
          <TabsTrigger value="proxies" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Proxies
          </TabsTrigger>
          <TabsTrigger value="bots" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Bots
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Subscription
          </TabsTrigger>
        </TabsList>

        {/* Store Accounts Tab */}
        <TabsContent value="accounts" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Store Accounts</CardTitle>
                  <CardDescription>
                    Manage your store account credentials
                  </CardDescription>
                </div>
                <Dialog
                  open={showAccountDialog}
                  onOpenChange={setShowAccountDialog}
                >
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Account
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingItem ? "Edit Account" : "Add New Account"}
                      </DialogTitle>
                      <DialogDescription>
                        Configure your store account credentials
                      </DialogDescription>
                    </DialogHeader>
                    <AccountForm
                      onSubmit={handleAccountSubmit}
                      editingItem={editingItem}
                      onCancel={() => {
                        setShowAccountDialog(false);
                        setEditingItem(null);
                      }}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {storeAccounts.map((account) => (
                  <Card key={account.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium">{account.username}</h3>
                          {getStatusBadge(account.is_active)}
                        </div>
                        <p className="text-sm text-gray-500">
                          {account.store.name} • {account.email}
                        </p>
                        <p className="text-xs text-gray-400">
                          Added{" "}
                          {new Date(account.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingItem(account);
                            setShowAccountDialog(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteAccount(account.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
                {storeAccounts.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No accounts found
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Add your first store account to get started
                    </p>
                    <Button onClick={() => setShowAccountDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Account
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Proxies Tab */}
        <TabsContent value="proxies" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Proxy Servers</CardTitle>
                  <CardDescription>
                    Configure proxy servers for automation
                  </CardDescription>
                </div>
                <Dialog
                  open={showProxyDialog}
                  onOpenChange={setShowProxyDialog}
                >
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Proxy
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingItem ? "Edit Proxy" : "Add New Proxy"}
                      </DialogTitle>
                      <DialogDescription>
                        Configure your proxy server settings
                      </DialogDescription>
                    </DialogHeader>
                    <ProxyForm
                      onSubmit={handleProxySubmit}
                      editingItem={editingItem}
                      onCancel={() => {
                        setShowProxyDialog(false);
                        setEditingItem(null);
                      }}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {proxies.map((proxy) => (
                  <Card key={proxy.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium">
                            {proxy.host}:{proxy.port}
                          </h3>
                          {getStatusBadge(proxy.is_active)}
                        </div>
                        <p className="text-sm text-gray-500">
                          Success Rate: {Math.round(proxy.success_rate * 100)}%
                        </p>
                        <p className="text-xs text-gray-400">
                          Added{" "}
                          {new Date(proxy.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingItem(proxy);
                            setShowProxyDialog(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteProxy(proxy.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
                {proxies.length === 0 && (
                  <div className="text-center py-8">
                    <Shield className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No proxies found
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Add your first proxy server to get started
                    </p>
                    <Button onClick={() => setShowProxyDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Proxy
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bots Tab */}
        <TabsContent value="bots" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Bot Configurations</CardTitle>
                  <CardDescription>
                    Configure your automation bot settings
                  </CardDescription>
                </div>
                <Dialog open={showBotDialog} onOpenChange={setShowBotDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Bot
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingItem ? "Edit Bot" : "Add New Bot"}
                      </DialogTitle>
                      <DialogDescription>
                        Configure your bot automation settings
                      </DialogDescription>
                    </DialogHeader>
                    <BotForm
                      onSubmit={handleBotSubmit}
                      editingItem={editingItem}
                      onCancel={() => {
                        setShowBotDialog(false);
                        setEditingItem(null);
                      }}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {botConfigs.map((bot) => (
                  <Card key={bot.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium">{bot.name}</h3>
                          {getStatusBadge(bot.is_active)}
                        </div>
                        <p className="text-sm text-gray-500">
                          Store: {bot.store}
                        </p>
                        <p className="text-xs text-gray-400">
                          Created{" "}
                          {new Date(bot.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingItem(bot);
                            setShowBotDialog(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteBotConfig(bot.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
                {botConfigs.length === 0 && (
                  <div className="text-center py-8">
                    <Bot className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No bot configurations found
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Add your first bot configuration to get started
                    </p>
                    <Button onClick={() => setShowBotDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Bot
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-6">
          <SubscriptionManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Form components (simplified for brevity)
function AccountForm({ onSubmit, editingItem, onCancel }: any) {
  const [formData, setFormData] = useState({
    username: editingItem?.username || "",
    password: "",
    email: editingItem?.email || "",
    store_id: editingItem?.store_id || "",
    is_active: editingItem?.is_active ?? true,
  });

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          value={formData.username}
          onChange={(e) =>
            setFormData({ ...formData, username: e.target.value })
          }
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
        />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) =>
            setFormData({ ...formData, is_active: checked })
          }
        />
        <Label htmlFor="is_active">Active</Label>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onSubmit(formData)}>
          {editingItem ? "Update" : "Create"}
        </Button>
      </div>
    </div>
  );
}

function ProxyForm({ onSubmit, editingItem, onCancel }: any) {
  const [formData, setFormData] = useState({
    host: editingItem?.host || "",
    port: editingItem?.port || 8080,
    username: editingItem?.username || "",
    password: editingItem?.password || "",
    is_active: editingItem?.is_active ?? true,
  });

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="host">Host</Label>
        <Input
          id="host"
          value={formData.host}
          onChange={(e) => setFormData({ ...formData, host: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="port">Port</Label>
        <Input
          id="port"
          type="number"
          value={formData.port}
          onChange={(e) =>
            setFormData({ ...formData, port: parseInt(e.target.value) })
          }
        />
      </div>
      <div>
        <Label htmlFor="proxy_username">Username (Optional)</Label>
        <Input
          id="proxy_username"
          value={formData.username}
          onChange={(e) =>
            setFormData({ ...formData, username: e.target.value })
          }
        />
      </div>
      <div>
        <Label htmlFor="proxy_password">Password (Optional)</Label>
        <Input
          id="proxy_password"
          type="password"
          value={formData.password}
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
        />
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="proxy_is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) =>
            setFormData({ ...formData, is_active: checked })
          }
        />
        <Label htmlFor="proxy_is_active">Active</Label>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onSubmit(formData)}>
          {editingItem ? "Update" : "Create"}
        </Button>
      </div>
    </div>
  );
}

function BotForm({ onSubmit, editingItem, onCancel }: any) {
  const [formData, setFormData] = useState({
    name: editingItem?.name || "",
    store: editingItem?.store || "",
    is_active: editingItem?.is_active ?? true,
  });

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="bot_name">Bot Name</Label>
        <Input
          id="bot_name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="store">Store</Label>
        <Select
          value={formData.store}
          onValueChange={(value) => setFormData({ ...formData, store: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select store" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dreamland">Dreamland</SelectItem>
            <SelectItem value="pokemon-center">Pokémon Center EU</SelectItem>
            <SelectItem value="bol">Bol.com</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="bot_is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) =>
            setFormData({ ...formData, is_active: checked })
          }
        />
        <Label htmlFor="bot_is_active">Active</Label>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onSubmit(formData)}>
          {editingItem ? "Update" : "Create"}
        </Button>
      </div>
    </div>
  );
}
