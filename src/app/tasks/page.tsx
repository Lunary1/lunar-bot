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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskCreationWizard } from "@/components/task-creation-wizard";
import { useAuthContext } from "@/components/auth-provider";
import { supabase } from "@/app/lib/supabaseClient";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
  Plus,
  Search,
  Filter,
  Play,
  Pause,
  Trash2,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

interface Task {
  id: string;
  product_id: string;
  store_account_id: string;
  proxy_id?: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  priority: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  product?: {
    name: string;
    url: string;
    current_price: number;
    is_available: boolean;
    image_url?: string;
    store: {
      name: string;
    };
  };
  store_account?: {
    username: string;
    store: {
      name: string;
    };
  };
  proxy?: {
    host: string;
    port: number;
  };
}

export default function TasksPage() {
  const { user } = useAuthContext();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_at");

  const fetchTasks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("purchase_tasks")
        .select(
          `
          *,
          product:products(
            name,
            url,
            current_price,
            is_available,
            image_url,
            store:stores(name)
          ),
          store_account:user_store_accounts(
            username,
            store:stores(name)
          ),
          proxy:proxies(host, port)
        `
        )
        .eq("user_id", user.id)
        .order(sortBy, { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user, sortBy]);

  // Real-time updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("tasks_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "purchase_tasks",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleCreateTask = async (config: any) => {
    if (!user) return;

    try {
      const { error } = await supabase.from("purchase_tasks").insert({
        user_id: user.id,
        product_id: config.productId,
        store_account_id: config.storeAccountId,
        proxy_id: config.proxyId,
        priority: config.priority,
        status: "queued",
      });

      if (error) throw error;
      await fetchTasks();
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  const handleTaskAction = async (taskId: string, action: string) => {
    try {
      let updateData: any = {};

      switch (action) {
        case "start":
          updateData = {
            status: "running",
            started_at: new Date().toISOString(),
          };
          break;
        case "pause":
          updateData = { status: "cancelled" };
          break;
        case "delete":
          await supabase.from("purchase_tasks").delete().eq("id", taskId);
          await fetchTasks();
          return;
      }

      if (Object.keys(updateData).length > 0) {
        await supabase
          .from("purchase_tasks")
          .update(updateData)
          .eq("id", taskId);
        await fetchTasks();
      }
    } catch (error) {
      console.error(`Error ${action} task:`, error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "queued":
        return <Clock className="h-4 w-4" />;
      case "running":
        return <Play className="h-4 w-4" />;
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "failed":
        return <XCircle className="h-4 w-4" />;
      case "cancelled":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "queued":
        return "bg-yellow-100 text-yellow-800";
      case "running":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.product?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.store_account?.username
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <main className="flex-1 space-y-4 p-4 md:p-6 lg:p-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Task Management
                </h1>
                <p className="text-gray-600">
                  Create and manage your automated purchase tasks
                </p>
              </div>
              <Button onClick={() => setShowWizard(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Task
              </Button>
            </div>

            {/* Filters and Search */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search tasks by product name or account..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Select
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="queued">Queued</SelectItem>
                        <SelectItem value="running">Running</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="created_at">Created Date</SelectItem>
                        <SelectItem value="priority">Priority</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tasks List */}
            <div className="grid gap-4">
              {filteredTasks.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="text-gray-400 mb-4">
                      <Clock className="h-12 w-12 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No tasks found
                    </h3>
                    <p className="text-gray-500 mb-4">
                      {searchQuery || statusFilter !== "all"
                        ? "Try adjusting your filters to see more tasks."
                        : "Create your first automated purchase task to get started."}
                    </p>
                    {!searchQuery && statusFilter === "all" && (
                      <Button onClick={() => setShowWizard(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Task
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                filteredTasks.map((task) => (
                  <Card
                    key={task.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          {task.product?.image_url && (
                            <img
                              src={task.product.image_url}
                              alt={task.product.name}
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                          )}

                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-medium text-lg">
                                {task.product?.name}
                              </h3>
                              <Badge className={getStatusColor(task.status)}>
                                {getStatusIcon(task.status)}
                                <span className="ml-1 capitalize">
                                  {task.status}
                                </span>
                              </Badge>
                              {task.priority > 0 && (
                                <Badge variant="outline">
                                  Priority {task.priority}
                                </Badge>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                              <div>
                                <span className="font-medium">Store:</span>{" "}
                                {task.product?.store.name}
                                <br />
                                <span className="font-medium">
                                  Account:
                                </span>{" "}
                                {task.store_account?.username}
                              </div>
                              <div>
                                <span className="font-medium">Price:</span> €
                                {task.product?.current_price}
                                <br />
                                <span className="font-medium">Proxy:</span>{" "}
                                {task.proxy
                                  ? `${task.proxy.host}:${task.proxy.port}`
                                  : "None"}
                              </div>
                              <div>
                                <span className="font-medium">Created:</span>{" "}
                                {new Date(task.created_at).toLocaleDateString()}
                                <br />
                                {task.started_at && (
                                  <span className="font-medium">Started:</span>
                                )}{" "}
                                {task.started_at &&
                                  new Date(
                                    task.started_at
                                  ).toLocaleDateString()}
                              </div>
                            </div>

                            {task.error_message && (
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                                <strong>Error:</strong> {task.error_message}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          {task.status === "queued" && (
                            <Button
                              size="sm"
                              onClick={() => handleTaskAction(task.id, "start")}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}

                          {task.status === "running" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTaskAction(task.id, "pause")}
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTaskAction(task.id, "delete")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Task Creation Wizard */}
            {showWizard && (
              <TaskCreationWizard
                onClose={() => setShowWizard(false)}
                onSubmit={handleCreateTask}
              />
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
