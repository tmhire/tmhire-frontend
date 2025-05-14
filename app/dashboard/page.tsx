"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusIcon, CalendarIcon, TruckIcon, UsersIcon } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { useRouter } from "next/navigation";
import { useAuthApi } from "@/lib/api/use-auth-api";
import { Spinner } from "@/components/Spinner";

// Type definitions from our API
interface TransitMixer {
  _id: string;
  user_id: string;
  identifier: string;
  capacity: number;
  created_at: string;
}

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

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const api = useAuthApi();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  const { data: tmsData, isLoading: tmsLoading } = useQuery({
    queryKey: ["tms"],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; message: string; data: TransitMixer[] }>("/tms");
      return response.data;
    },
    enabled: isAuthenticated && api.isAuthenticated,
  });

  const { data: schedulesData, isLoading: schedulesLoading } = useQuery({
    queryKey: ["schedules"],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; message: string; data: Schedule[] }>("/schedules");
      return response.data;
    },
    enabled: isAuthenticated && api.isAuthenticated,
  });

  // Extracted data from the response
  const tms = tmsData || [];
  const schedules = schedulesData || [];
  const totalTMs = tms.length || 0;
  const totalSchedules = schedules.length || 0;
  const recentSchedules = schedules.slice(0, 3) || [];
  const uniqueClientCount = new Set(
    schedules.map(schedule => schedule.client_name)
  ).size;

  const isPageLoading = tmsLoading || schedulesLoading || isLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-6rem)]">
        <Spinner size="small" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button asChild>
          <Link href="/dashboard/schedules/new">
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Schedule
          </Link>
        </Button>
      </div>

      {/* Auth API Example - add this to test */}
      {/* <ApiExample /> */}

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">
              Total Transit Mixers
              <p className="text-xs text-muted-foreground">
                Available for scheduling
              </p>
            </CardTitle>
            <TruckIcon className="h-8 w-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-left">
              {isPageLoading ? <Spinner size="small" left={true} /> : totalTMs}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">
              Total Schedules
              <p className="text-xs text-muted-foreground">Created schedules</p>
            </CardTitle>
            <CalendarIcon className="h-8 w-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isPageLoading ? (
                <Spinner size="small" left={true} />
              ) : (
                totalSchedules
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">
              Unique Clients
              <p className="text-xs text-muted-foreground">
                Unique in schedules
              </p>
            </CardTitle>
            <UsersIcon className="h-8 w-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isPageLoading ? (
                <Spinner size="small" left={true} />
              ) : (
                uniqueClientCount
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Schedules */}
      <div>
        <Card className="bg-transparent border-none shadow-none p-0 ">
          <CardHeader className="p-0 px-2">
            <CardTitle >Recent Schedules</CardTitle>
            <CardDescription>Your recently created schedules</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isPageLoading ? (
              <div>
                <Spinner size="small" />
              </div>
            ) : recentSchedules.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No schedules found</p>
                <Button asChild>
                  <Link href="/dashboard/schedules/new">
                    Create your first schedule
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentSchedules.map(schedule => (
                  <Card key={schedule._id}>
                    <CardContent>
                      <div className=" flex items-center justify-between">
                        <div>
                          <div className="font-medium text-base">
                            {schedule.client_name || "Unnamed Schedule"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Created on{" "}
                            {new Date(schedule.created_at).toLocaleDateString()}
                          </div>
                          {/* <div className="text-sm text-muted-foreground mt-2 space-y-1">
                            <div>
                              Status:{" "}
                              <span className="capitalize">
                                {schedule.status}
                              </span>
                            </div>
                            <div>TM Count: {schedule.tm_count}</div>
                            <div>
                              Quantity: {schedule.input_params?.quantity}
                            </div>
                          </div> */}
                        </div>
                        <div className="ml-4">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/schedules/${schedule._id}`}>
                              View
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <div className="pt-2">
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/dashboard/schedules">View all schedules</Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
