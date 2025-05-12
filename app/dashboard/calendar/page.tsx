"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { calendarApi, tmApi} from "@/lib/api/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/Spinner";
import Link from "next/link";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export default function CalendarPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedTmId, setSelectedTmId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch transit mixers for the filter
  const { data: tms, isLoading: tmsLoading } = useQuery({
    queryKey: ["tms"],
    queryFn: async () => {
      const response = await tmApi.getAllTMs();
      return response;
    },
    enabled: isAuthenticated,
  });

  const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

  // Fetch calendar data
  const { data: calendarData, isLoading: calendarLoading } = useQuery({
    queryKey: ["calendar", startDate, endDate, selectedTmId],
    queryFn: async () => {
      const response = await calendarApi.getCalendar(startDate, endDate, selectedTmId);
      return response;
    },
    enabled: isAuthenticated,
  });

  // Generate calendar days for the current month view
  const calendarDays = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  // Prepare the weekday headers
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const goToCurrentMonth = () => {
    setCurrentMonth(new Date());
  };

  // Find calendar data for a specific day
  const getDayData = (date: Date) => {
    if (!calendarData) return null;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    return calendarData.find(day => day.date.startsWith(dateStr));
  };

  const isLoading = authLoading || tmsLoading || calendarLoading;

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-6rem)]">
        <Spinner size="small" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Schedule Calendar</h1>
        <Button asChild>
          <Link href="/dashboard/schedules/new">
            Create New Schedule
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Calendar</CardTitle>
              <CardDescription>
                View and manage transit mixer schedules
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={selectedTmId || ""}
                onValueChange={(value) => setSelectedTmId(value || undefined)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Transit Mixers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Transit Mixers</SelectItem>
                  {tms?.map((tm) => (
                    <SelectItem key={tm._id} value={tm._id}>
                      {tm.identifier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousMonth}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">
                {format(currentMonth, "MMMM yyyy")}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={goToCurrentMonth}
                className="h-8 px-2"
              >
                Today
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextMonth}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="small" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {/* Weekday headers */}
              {weekdays.map((day) => (
                <div
                  key={day}
                  className="h-8 flex justify-center items-center text-sm font-medium text-muted-foreground"
                >
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {calendarDays.map((day) => {
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isToday = isSameDay(day, new Date());
                const dayData = getDayData(day);
                
                const totalTms = dayData?.total_count || 0;
                const bookedTms = dayData?.booked_count || 0;
                const availableTms = totalTms - bookedTms;
                
                const fillPercentage = totalTms > 0 
                  ? Math.min(100, Math.round((bookedTms / totalTms) * 100)) 
                  : 0;
                
                return (
                  <div
                    key={day.toString()}
                    className={cn(
                      "min-h-24 p-2 border hover:bg-muted/50 transition-colors",
                      !isCurrentMonth && "opacity-50 bg-muted/20",
                      isToday && "border-primary",
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          isToday && "text-primary font-bold"
                        )}
                      >
                        {format(day, "d")}
                      </span>
                      
                      {dayData && totalTms > 0 && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="h-5 w-14 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className={cn(
                                    "h-full",
                                    fillPercentage >= 75 ? "bg-red-500" : 
                                    fillPercentage >= 50 ? "bg-orange-400" : 
                                    "bg-green-500"
                                  )}
                                  style={{ width: `${fillPercentage}%` }}
                                ></div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{bookedTms} of {totalTms} TMs booked</p>
                              <p>{availableTms} available</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    
                    {dayData?.schedules && dayData.schedules.length > 0 && (
                      <div className="mt-1 space-y-1">
                        {dayData.schedules.slice(0, 2).map(schedule => (
                          <Link 
                            href={`/dashboard/schedules/${schedule._id}`}
                            key={schedule._id}
                            className="block text-xs bg-primary/10 hover:bg-primary/20 text-primary-foreground p-1 rounded truncate"
                          >
                            {schedule.client_name} ({schedule.tm_count} TMs)
                          </Link>
                        ))}
                        
                        {dayData.schedules.length > 2 && (
                          <div className="text-xs text-muted-foreground text-center">
                            + {dayData.schedules.length - 2} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 