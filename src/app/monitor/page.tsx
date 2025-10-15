"use client";

import { MonitoringDashboard } from "@/components/monitoring-dashboard";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function MonitorPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <main className="flex-1 space-y-4 p-4 md:p-6 lg:p-8">
          <MonitoringDashboard />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
