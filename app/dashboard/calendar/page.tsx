"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/auth-context";
import { scheduleApi } from "@/lib/api/api";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Spinner } from "@/components/Spinner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { ScheduleGanttChart } from "@/app/components/ScheduleGanttChart";

export default function DailyScheduleCalendarView() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Format date for API request
  const formattedDate = format(selectedDate, "yyyy-MM-dd");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch daily schedule data
  const {
    data: dailySchedule,
    isLoading: scheduleLoading,
    refetch,
  } = useQuery({
    queryKey: ["daily-schedule", formattedDate],
    queryFn: async () => {
      const response = await scheduleApi.getDailySchedule(formattedDate);
      return response || [];
    },
    enabled: isAuthenticated,
    staleTime: 0, // Don't use stale data
    refetchOnWindowFocus: false,
  });

  console.log("dailySchedule", dailySchedule);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-6rem)]">
        <Spinner size="small" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold">Daily Schedule</h1>
          <p className="text-muted-foreground">
            View and manage transit mixer schedules for{" "}
            {format(selectedDate, "MMMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline">
                {format(selectedDate, "MMMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={date => {
                  if (date) {
                    setSelectedDate(date);
                    setCalendarOpen(false);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={scheduleLoading}
          >
            {scheduleLoading ? <Spinner size="small" className="mr-2" /> : null}
            Refresh
          </Button>
        </div>
      </div>

      {/* Schedule Gantt Chart */}
      <ScheduleGanttChart 
        scheduleData={dailySchedule}
        isLoading={scheduleLoading}
        onCreateSchedule={() => router.push("/dashboard/schedules/new")}
      />
    </div>
  );
}
