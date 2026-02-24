"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/app/lib/supabaseClient";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Eye, EyeOff, Store, Shield } from "lucide-react";

interface StoreAccount {
  id: string;
  store_id: string;
  username: string;
  is_active: boolean;
  last_used?: string;
  created_at: string;
  store: {
    name: string;
    base_url: string;
  };
}

interface Store {
  id: string;
  name: string;
  base_url: string;
  is_active: boolean;
}

export function StoreAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<StoreAccount[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingAccount, setEditingAccount] = useState<StoreAccount | null>(
    null,
  );
  const [showPasswords, setShowPasswords] = useState<{
    [key: string]: boolean;
  }>({});

  // Form state
  const [formData, setFormData] = useState({
    store_id: "",
    username: "",
    password: "",
  });

  useEffect(() => {
    if (user) {
      loadAccounts();
      loadStores();
    }
  }, [user]);

  const loadAccounts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("user_store_accounts")
        .select(
          `
          *,
          store:stores(name, base_url)
        `,
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching accounts:", error);
        return;
      }

      setAccounts(data || []);
    } catch (error) {
      console.error("Error in loadAccounts:", error);
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

      if (error) {
        console.error("Error fetching stores:", error);
        return;
      }

      setStores(data || []);
    } catch (error) {
      console.error("Error in loadStores:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingAccount) {
        // Update existing account — encryption happens server-side
        const res = await fetch("/api/accounts", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingAccount.id,
            store_id: formData.store_id,
            username: formData.username,
            ...(formData.password ? { password: formData.password } : {}),
          }),
        });
        if (!res.ok) {
          const { error } = await res.json();
          throw new Error(error ?? "Failed to update account");
        }
      } else {
        // Create new account — encryption happens server-side
        const res = await fetch("/api/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            store_id: formData.store_id,
            username: formData.username,
            password: formData.password,
          }),
        });
        if (!res.ok) {
          const { error } = await res.json();
          throw new Error(error ?? "Failed to create account");
        }
      }

      await loadAccounts();
      resetForm();
    } catch (error) {
      console.error("Error saving account:", error);
    }
  };

  const handleDelete = async (accountId: string) => {
    if (!confirm("Are you sure you want to delete this account?")) return;

    try {
      const { error } = await supabase
        .from("user_store_accounts")
        .delete()
        .eq("id", accountId);

      if (error) throw error;

      await loadAccounts();
    } catch (error) {
      console.error("Error deleting account:", error);
    }
  };

  const handleToggleActive = async (accountId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("user_store_accounts")
        .update({ is_active: !isActive })
        .eq("id", accountId);

      if (error) throw error;

      await loadAccounts();
    } catch (error) {
      console.error("Error toggling account status:", error);
    }
  };

  const resetForm = () => {
    setFormData({ store_id: "", username: "", password: "" });
    setEditingAccount(null);
    setShowDialog(false);
  };

  const handleEdit = (account: StoreAccount) => {
    setEditingAccount(account);
    setFormData({
      store_id: account.store_id,
      username: account.username,
      password: "",
    });
    setShowDialog(true);
  };

  const togglePasswordVisibility = (accountId: string) => {
    setShowPasswords((prev) => ({
      ...prev,
      [accountId]: !prev[accountId],
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Loading store accounts...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Store Accounts</h2>
          <p className="text-muted-foreground">
            Manage your store account credentials for automated purchases
          </p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingAccount ? "Edit Store Account" : "Add Store Account"}
              </DialogTitle>
              <DialogDescription>
                {editingAccount
                  ? "Update your store account credentials"
                  : "Add credentials for a new store account"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="store">Store</Label>
                <Select
                  value={formData.store_id}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, store_id: value }))
                  }
                  required
                >
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
                <Label htmlFor="username">Username/Email</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  placeholder={
                    editingAccount ? "Leave blank to keep current password" : ""
                  }
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">
                  {editingAccount ? "Update Account" : "Add Account"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Store Accounts</h3>
            <p className="text-muted-foreground mb-4">
              Add your store account credentials to start automating purchases
            </p>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Store className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <h3 className="font-medium">{account.store.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {account.username}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={account.is_active ? "default" : "secondary"}
                    >
                      {account.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(account)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleToggleActive(account.id, account.is_active)
                      }
                    >
                      {account.is_active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(account.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {account.last_used && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Last used: {new Date(account.last_used).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
