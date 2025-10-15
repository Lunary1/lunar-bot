"use client";

import { useState, useEffect } from "react";
import { ActiveTasks } from "@/components/active-tasks";
import { DashboardStats } from "@/components/dashboard-stats";
import { UpcomingDrops } from "@/components/upcoming-drops";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CreateTaskModal } from "@/components/ui/create-task-modal";
import { useAuthContext } from "@/components/auth-provider";
import { supabase } from "@/app/lib/supabaseClient";
// socket.io-client is a heavy dependency and connecting at module evaluation
// time forces a connection for any import. Initialize it lazily inside a
// useEffect when the Dashboard mounts.
let socket: any = null;

type Task = {
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
};

export default function Dashboard() {
  const { user, profile, hasPermission } = useAuthContext();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const reloadTasks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("purchase_tasks")
        .select(
          `
          *,
          product:products(name, url, current_price, store:stores(name)),
          store_account:user_store_accounts(username, store:stores(name)),
          proxy:proxies(host, port)
        `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching tasks:", error);
        return;
      }

      setTasks(data || []);
    } catch (error) {
      console.error("Error in reloadTasks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);

  const loadAllData = async () => {
    await reloadTasks();
  };

  useEffect(() => {
    // Listen for real-time updates
    const channel = supabase
      .channel("purchase_tasks_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "purchase_tasks",
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          console.log("🔄 Task update received:", payload);
          reloadTasks();
        }
      )
      .subscribe();

    // Lazily initialize socket.io only when the dashboard is mounted and a
    // user exists. This prevents module-evaluation side effects and reduces
    // initial bundle/connect overhead.
    let mounted = true;
    (async () => {
      if (!user) return;
      try {
        const { default: io } = await import("socket.io-client");
        if (!mounted) return;
        socket = io("http://localhost:3001");
        socket.on("connect", () => {
          console.log("socket connected", socket.id);
        });
        // Example: listen for server task events and trigger a reload
        socket.on("task:update", (data: any) => {
          console.log("socket task:update", data);
          reloadTasks();
        });
      } catch (err) {
        console.warn("Failed to load socket.io-client dynamically", err);
      }
    })();

    return () => {
      mounted = false;
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        // ignore
      }
      try {
        socket?.disconnect?.();
        socket = null;
      } catch (e) {
        // ignore
      }
    };
  }, [user]);

  const addTask = async (taskData: {
    product_id: string;
    store_account_id: string;
    proxy_id?: string;
    priority?: number;
  }) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("purchase_tasks")
        .insert({
          user_id: user.id,
          product_id: taskData.product_id,
          store_account_id: taskData.store_account_id,
          proxy_id: taskData.proxy_id,
          priority: taskData.priority || 0,
          status: "queued",
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating task:", error);
        return;
      }

      await reloadTasks();
    } catch (error) {
      console.error("Error in addTask:", error);
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <main className="flex-1 space-y-4 p-4 md:p-6 lg:p-8">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Task
            </Button>
          </div>

          {/* Dashboard Overview */}
          <div className="space-y-6">
            <DashboardStats />
            <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
              <ActiveTasks tasks={tasks} reloadTasks={reloadTasks} />
              <UpcomingDrops />
            </div>
          </div>

          <CreateTaskModal
            open={showModal}
            onClose={() => setShowModal(false)}
            onSubmit={addTask}
          />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
