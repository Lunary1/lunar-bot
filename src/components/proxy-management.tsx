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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Edit,
  Trash2,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";

interface Proxy {
  id: string;
  host: string;
  port: number;
  username?: string;
  is_active: boolean;
  last_used?: string;
  success_rate: number;
  created_at: string;
}

export function ProxyManagement() {
  const { user } = useAuth();
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingProxy, setEditingProxy] = useState<Proxy | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    host: "",
    port: "",
    username: "",
    password: "",
  });

  useEffect(() => {
    if (user) {
      loadProxies();
    }
  }, [user]);

  const loadProxies = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("proxies")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching proxies:", error);
        return;
      }

      setProxies(data || []);
    } catch (error) {
      console.error("Error in loadProxies:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingProxy) {
        // Update existing proxy — encryption happens server-side
        const res = await fetch("/api/proxies", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingProxy.id,
            host: formData.host,
            port: formData.port,
            username: formData.username || null,
            ...(formData.password ? { password: formData.password } : {}),
          }),
        });
        if (!res.ok) {
          const { error } = await res.json();
          throw new Error(error ?? "Failed to update proxy");
        }
      } else {
        // Create new proxy — encryption happens server-side
        const res = await fetch("/api/proxies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            host: formData.host,
            port: formData.port,
            username: formData.username || null,
            password: formData.password,
          }),
        });
        if (!res.ok) {
          const { error } = await res.json();
          throw new Error(error ?? "Failed to create proxy");
        }
      }

      await loadProxies();
      resetForm();
    } catch (error) {
      console.error("Error saving proxy:", error);
    }
  };

  const handleDelete = async (proxyId: string) => {
    if (!confirm("Are you sure you want to delete this proxy?")) return;

    try {
      const { error } = await supabase
        .from("proxies")
        .delete()
        .eq("id", proxyId);

      if (error) throw error;

      await loadProxies();
    } catch (error) {
      console.error("Error deleting proxy:", error);
    }
  };

  const handleToggleActive = async (proxyId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("proxies")
        .update({ is_active: !isActive })
        .eq("id", proxyId);

      if (error) throw error;

      await loadProxies();
    } catch (error) {
      console.error("Error toggling proxy status:", error);
    }
  };

  const resetForm = () => {
    setFormData({ host: "", port: "", username: "", password: "" });
    setEditingProxy(null);
    setShowDialog(false);
  };

  const handleEdit = (proxy: Proxy) => {
    setEditingProxy(proxy);
    setFormData({
      host: proxy.host,
      port: proxy.port.toString(),
      username: proxy.username || "",
      password: "",
    });
    setShowDialog(true);
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 80) return "text-green-600";
    if (rate >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getSuccessRateIcon = (rate: number) => {
    if (rate >= 80) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (rate >= 60)
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Loading proxies...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Proxy Management</h2>
          <p className="text-muted-foreground">
            Manage your proxy servers for automated purchases
          </p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Proxy
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingProxy ? "Edit Proxy" : "Add Proxy"}
              </DialogTitle>
              <DialogDescription>
                {editingProxy
                  ? "Update your proxy server configuration"
                  : "Add a new proxy server for automated purchases"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="host">Host</Label>
                  <Input
                    id="host"
                    value={formData.host}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, host: e.target.value }))
                    }
                    placeholder="proxy.example.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    type="number"
                    value={formData.port}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, port: e.target.value }))
                    }
                    placeholder="8080"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="username">Username (Optional)</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                  placeholder="proxy_username"
                />
              </div>
              <div>
                <Label htmlFor="password">Password (Optional)</Label>
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
                    editingProxy
                      ? "Leave blank to keep current password"
                      : "proxy_password"
                  }
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">
                  {editingProxy ? "Update Proxy" : "Add Proxy"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {proxies.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Proxies</h3>
            <p className="text-muted-foreground mb-4">
              Add proxy servers to improve your success rate and avoid detection
            </p>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Proxy
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proxy</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Success Rate</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proxies.map((proxy) => (
                  <TableRow key={proxy.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {proxy.host}:{proxy.port}
                          </div>
                          {proxy.username && (
                            <div className="text-sm text-muted-foreground">
                              User: {proxy.username}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={proxy.is_active ? "default" : "secondary"}
                      >
                        {proxy.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getSuccessRateIcon(proxy.success_rate)}
                        <span
                          className={`font-medium ${getSuccessRateColor(
                            proxy.success_rate,
                          )}`}
                        >
                          {proxy.success_rate.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {proxy.last_used ? (
                        <span className="text-sm text-muted-foreground">
                          {new Date(proxy.last_used).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Never
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(proxy)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleToggleActive(proxy.id, proxy.is_active)
                          }
                        >
                          {proxy.is_active ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(proxy.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Proxy Stats */}
      {proxies.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <div className="text-2xl font-bold">
                    {proxies.filter((p) => p.is_active).length}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Active Proxies
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold">{proxies.length}</div>
                  <div className="text-sm text-muted-foreground">
                    Total Proxies
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div>
                  <div className="text-2xl font-bold">
                    {proxies.length > 0
                      ? (
                          proxies.reduce((sum, p) => sum + p.success_rate, 0) /
                          proxies.length
                        ).toFixed(1)
                      : 0}
                    %
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Avg Success Rate
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
