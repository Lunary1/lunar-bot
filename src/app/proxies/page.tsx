"use client";

import { useState, useEffect } from "react";
import { useAuthContext } from "@/components/auth-provider";
import { supabase } from "@/app/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Shield } from "lucide-react";

export default function ProxiesPage() {
  const { user } = useAuthContext();
  const [proxies, setProxies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProxies = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("proxies")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      setProxies(data || []);
    } catch (error) {
      console.error("Error loading proxies:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadProxies();
    }
  }, [user]);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Proxy Management</h1>
          <p className="text-gray-600">
            Manage your proxy servers for automation
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Proxy
        </Button>
      </div>

      <div className="grid gap-4">
        {proxies.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No proxies found
              </h3>
              <p className="text-gray-500 mb-4">
                Add proxy servers to enhance your automation
              </p>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Proxy
              </Button>
            </CardContent>
          </Card>
        ) : (
          proxies.map((proxy) => (
            <Card key={proxy.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{proxy.name}</h4>
                    <p className="text-sm text-gray-500">
                      {proxy.host}:{proxy.port}
                    </p>
                    <p className="text-sm text-gray-500">
                      Success rate: {Math.round(proxy.success_rate * 100)}%
                    </p>
                  </div>
                  <Badge variant={proxy.is_active ? "default" : "secondary"}>
                    {proxy.is_active ? "Active" : "Inactive"}
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
