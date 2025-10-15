"use client";

import { UnifiedSettingsManagement } from "@/components/unified-settings-management";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function SettingsPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <main className="flex-1 space-y-4 p-4 md:p-6 lg:p-8">
          <UnifiedSettingsManagement />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
