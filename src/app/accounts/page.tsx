"use client";

import { useState, useEffect } from "react";
import { useAuthContext } from "@/components/auth-provider";
import { supabase } from "@/app/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, User } from "lucide-react";

export default function AccountsPage() {
  const { user } = useAuthContext();
  const [storeAccounts, setStoreAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStoreAccounts = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("user_store_accounts")
        .select(
          `
          *,
          store:stores(name)
        `
        )
        .eq("user_id", user.id);
      if (error) throw error;
      setStoreAccounts(data || []);
    } catch (error) {
      console.error("Error loading store accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadStoreAccounts();
    }
  }, [user]);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Store Accounts</h1>
          <p className="text-gray-600">Manage your store login credentials</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Account
        </Button>
      </div>

      <div className="grid gap-4">
        {storeAccounts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <User className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No accounts found
              </h3>
              <p className="text-gray-500 mb-4">
                Add store accounts to enable automation
              </p>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Account
              </Button>
            </CardContent>
          </Card>
        ) : (
          storeAccounts.map((account) => (
            <Card key={account.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{account.username}</h4>
                    <p className="text-sm text-gray-500">
                      {account.store?.name || "Unknown Store"}
                    </p>
                    <p className="text-sm text-gray-500">
                      Last used:{" "}
                      {account.last_used
                        ? new Date(account.last_used).toLocaleDateString()
                        : "Never"}
                    </p>
                  </div>
                  <Badge variant={account.is_active ? "default" : "secondary"}>
                    {account.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
