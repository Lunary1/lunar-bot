"use client";

import { WatchlistManagement } from "@/components/watchlist-management";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function WatchlistPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <main className="flex-1 space-y-4 p-4 md:p-6 lg:p-8">
          <WatchlistManagement />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
