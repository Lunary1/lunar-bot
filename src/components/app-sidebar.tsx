"use client";

import {
  Bot,
  Home,
  Settings,
  Shield,
  Users,
  Zap,
  CreditCard,
  Package,
  Activity,
  ShieldCheck,
  Bell,
  LogOut,
  User,
  UserCheck,
  Eye,
  BarChart3,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthContext } from "@/components/auth-provider";
import { useRouter, usePathname } from "next/navigation";

const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Tasks",
    url: "/tasks",
    icon: Zap,
  },
  {
    title: "Products",
    url: "/products",
    icon: Package,
  },
  {
    title: "Profiles",
    url: "/profiles",
    icon: UserCheck,
  },
  {
    title: "Proxies",
    url: "/proxies",
    icon: Shield,
  },
  {
    title: "Accounts",
    url: "/accounts",
    icon: Users,
  },
  {
    title: "Monitor",
    url: "/monitor",
    icon: Activity,
  },
  {
    title: "Watchlist",
    url: "/watchlist",
    icon: Eye,
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: BarChart3,
  },
  {
    title: "Logs",
    url: "/logs",
    icon: Activity,
  },
  {
    title: "Billing",
    url: "/billing",
    icon: CreditCard,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
  {
    title: "Pricing",
    url: "/pricing",
    icon: CreditCard,
  },
  {
    title: "Admin",
    url: "/admin",
    icon: ShieldCheck,
  },
];

export function AppSidebar() {
  const { user, profile, signOut } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  const handleSettings = () => {
    router.push("/settings");
  };

  const getUserInitials = (email: string) => {
    return email?.split("@")[0]?.substring(0, 2).toUpperCase() || "U";
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-4 py-2">
          <Bot className="h-6 w-6 text-primary" />
          <span className="font-semibold text-lg">LunarBot</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={user?.user_metadata?.avatar_url}
                      alt="User"
                    />
                    <AvatarFallback>
                      {getUserInitials(user?.email)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.user_metadata?.full_name ||
                        user?.email?.split("@")[0]}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                    {profile && (
                      <p className="text-xs leading-none text-blue-600 font-medium">
                        {profile.subscription_tier.toUpperCase()} Plan
                      </p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSettings}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {user?.user_metadata?.full_name || user?.email?.split("@")[0]}
              </span>
              <span className="text-xs text-muted-foreground">
                {profile?.subscription_tier?.toUpperCase()} Plan
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon">
            <Bell className="h-4 w-4" />
          </Button>
        </div>
        <div className="px-4 pb-4 text-xs text-muted-foreground">
          v2.1.0 • Online
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
