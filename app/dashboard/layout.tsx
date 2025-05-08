"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  MenuIcon,
  HomeIcon,
  TruckIcon,
  CalendarIcon,
  PlusIcon,
  LogOutIcon,
  UserIcon,
  ChevronRightIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { useQuery } from "@tanstack/react-query";
import { useAuthApi } from "@/lib/api/use-auth-api";
import { Spinner } from "@/components/Spinner";

interface Schedule {
  _id: string;
  user_id: string;
  client_name: string;
  created_at: string;
  last_updated: string;
  input_params: {
    quantity: number;
    pumping_speed: number;
    onward_time: number;
    return_time: number;
    buffer_time: number;
  };
  output_table: unknown[];
  tm_count: number | null;
  pumping_time: number;
  status: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, logout, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const api = useAuthApi();

  useEffect(() => {
    if (!authIsLoading || !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authIsLoading, router]);

  const { data: schedulesData, isLoading: schedulesIsLoading } = useQuery({
    queryKey: ["schedules"],
    queryFn: async () => {
      return api.get<Schedule[]>("/schedules");
    },
    enabled: isAuthenticated && api.isAuthenticated,
  });

  const schedules = schedulesData || [];

  const routes = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: HomeIcon,
      active: pathname === "/dashboard",
    },
    {
      href: "/dashboard/tms",
      label: "Transit Mixers",
      icon: TruckIcon,
      active: pathname === "/dashboard/tms",
    },
    {
      href: "/dashboard/schedules",
      label: "Schedules",
      icon: CalendarIcon,
      active: pathname === "/dashboard/schedules" || pathname.startsWith("/dashboard/schedules/"),
    },
  ];

  const handleLogout = async () => {
    await logout();
  };

  const SidebarContent = () => (
    <div className="h-full flex flex-col space-y-2 py-4">
      <div className="px-6 py-2 mb-4">
        <div className="flex flex-col items-start gap-2">
          <span className="text-3xl font-bold leading-none text-left">
            Transit Mixer Calculator
          </span>
          <span className="text-base text-gray-500">by TMHire</span>
        </div>
      </div>
      <div className="space-y-1 px-3 flex-grow overflow-y-auto">
        {routes.map(route => (
          <div key={route.href}>
            <Link href={route.href}>
              <Button
                variant={route.active ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  route.active ? "bg-muted font-medium" : "font-normal"
                )}
                onClick={() => isSidebarOpen && setIsSidebarOpen(false)}
              >
                <route.icon className="h-4 w-4 mr-2" />
                {route.label}
              </Button>
            </Link>
            {route.href === "/dashboard/schedules" && (
              <div className="ml-4 mt-1 space-y-1">
                {schedulesIsLoading ? (
                  <p className="text-xs text-muted-foreground px-3 py-1">Loading schedules...</p>
                ) : schedules.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-3 py-1">No schedules yet.</p>
                ) : (
                  schedules.map(schedule => (
                    <Link href={`/dashboard/schedules/${schedule._id}`} key={schedule._id}>
                      <Button
                        variant={pathname === `/dashboard/schedules/${schedule._id}` ? "outline" : "ghost"}
                        size="sm"
                        className={cn(
                          "w-full justify-start text-sm",
                          pathname === `/dashboard/schedules/${schedule._id}` ? "font-medium border-primary/50" : "font-normal text-muted-foreground"
                        )}
                        onClick={() => isSidebarOpen && setIsSidebarOpen(false)}
                      >
                        <ChevronRightIcon className="h-3 w-3 mr-2 text-muted-foreground/70" />
                        {schedule.client_name || `Schedule ${schedule._id.substring(0, 6)}...`}
                      </Button>
                    </Link>
                  ))
                )}
                <Button asChild variant="outline" size="sm" className="w-full mt-2">
                  <Link href="/dashboard/schedules/new" onClick={() => isSidebarOpen && setIsSidebarOpen(false)}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Create New
                  </Link>
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-auto px-3 pt-2 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => {
            handleLogout();
            if (isSidebarOpen) setIsSidebarOpen(false);
          }}
        >
          <LogOutIcon className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );

  if (authIsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner size="small" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Sidebar */}
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetTrigger asChild className="lg:hidden fixed top-4 left-4 z-50">
          <Button variant="outline" size="icon">
            <MenuIcon className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-72 fixed inset-y-0 border-r bg-white z-40">
        <SidebarContent />
      </div>

      {/* Topbar */}
      <div className="lg:pl-72">
        <header className="h-16 border-b bg-white/20 backdrop-blur-xl sticky top-0 z-30 flex items-center px-6 justify-between">
          <div className="lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(true)}
            >
              <MenuIcon className="h-6 w-6" />
            </Button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <div className="text-sm text-right">
              <p className="font-medium">{user?.name || "User"}</p>
              <p className="text-muted-foreground">
                {user?.email || "No email"}
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <UserIcon className="h-4 w-4" />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
