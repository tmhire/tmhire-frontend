"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/auth-context";
import { scheduleApi } from "@/lib/api/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Spinner } from "@/components/Spinner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

// Type definitions for the schedule data
interface Trip {
  client: string;
  start: string;
  end: string;
  volume: string;
}

interface ScheduleData {
  tm: string;
  trips: Trip[];
}

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
  const { data: dailySchedule, isLoading: scheduleLoading } = useQuery({
    queryKey: ["daily-schedule", formattedDate],
    queryFn: async () => {
      const response = await scheduleApi.getDailySchedule(formattedDate);
      return response || [];
    },
    enabled: isAuthenticated,
  });

  console.log("dailySchedule", dailySchedule);

  // Calculate time slots for the Gantt chart (3 AM to 10 PM in 30-minute increments)
  const startHour = 3;
  const endHour = 22;
  const timeSlots = Array.from({ length: (endHour - startHour) * 2 }, (_, i) => {
    const hour = Math.floor(i / 2) + startHour;
    const minute = (i % 2) * 30;
    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  });

  // Helper function to calculate position and width of a trip block
  const calculateTripPosition = (start: string, end: string) => {
    // Parse hours and minutes from time strings (format: "HH:MM")
    const [startHourStr, startMinStr] = start.split(":");
    const [endHourStr, endMinStr] = end.split(":");

    const startHourVal = parseInt(startHourStr);
    const startMinVal = parseInt(startMinStr);
    const endHourVal = parseInt(endHourStr);
    const endMinVal = parseInt(endMinStr);

    // Calculate position and width as percentages of the day
    // Each slot is 30 minutes, so there are (endHour - startHour) * 2 slots
    
    // Calculate start position
    const startPosition = (
      ((startHourVal - startHour) * 60 + startMinVal) / 
      ((endHour - startHour) * 60)
    ) * 100;
    
    // Calculate width
    const durationMinutes = (endHourVal * 60 + endMinVal) - (startHourVal * 60 + startMinVal);
    const width = (durationMinutes / ((endHour - startHour) * 60)) * 100;

    return {
      left: `${Math.max(0, startPosition)}%`,
      width: `${Math.min(100, width)}%`,
    };
  };

  // Generate a color for a client (for consistency)
  const getClientColor = (clientName: string) => {
    // Simple hash function to generate a consistent color
    let hash = 0;
    for (let i = 0; i < clientName.length; i++) {
      hash = clientName.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Use the hash to generate an HSL color with good saturation and lightness
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 85%)`;
  };

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
              <Button variant="outline">{format(selectedDate, "MMMM d, yyyy")}</Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    setCalendarOpen(false);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Schedule Gantt Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule Timeline</CardTitle>
          <CardDescription>
            Gantt chart view of transit mixer schedules
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {scheduleLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="small" />
            </div>
          ) : dailySchedule && dailySchedule.length > 0 ? (
            <div className="overflow-x-auto">
              {/* Time scale header */}
              <div className="flex border-b min-w-[800px]">
                <div className="w-[180px] flex-shrink-0 p-2 font-medium border-r">
                  Transit Mixer
                </div>
                <div className="flex-1 flex">
                  {timeSlots.map((time, index) => (
                    <div
                      key={time}
                      className={`flex-1 p-2 text-center text-xs ${
                        index % 2 === 0 ? "border-r border-r-gray-200" : ""
                      }`}
                    >
                      {time}
                    </div>
                  ))}
                </div>
              </div>

              {/* Schedule rows */}
              {dailySchedule.map((schedule: ScheduleData) => (
                <div key={schedule.tm} className="flex border-b min-w-[800px]">
                  <div className="w-[180px] flex-shrink-0 p-2 border-r">
                    TM-{schedule.tm}
                  </div>
                  <div className="flex-1 relative h-16">
                    {/* Background grid lines */}
                    <div className="absolute inset-0 flex">
                      {timeSlots.map((time, index) => (
                        <div
                          key={time}
                          className={`flex-1 h-full ${
                            index % 2 === 0 ? "border-r border-r-gray-200" : ""
                          }`}
                        ></div>
                      ))}
                    </div>

                    {/* Trip blocks */}
                    {schedule.trips.map((trip: Trip, index: number) => {
                      const position = calculateTripPosition(trip.start, trip.end);
                      const bgColor = getClientColor(trip.client);
                      
                      return (
                        <div
                          key={index}
                          className="absolute top-2 bottom-2 rounded-md border flex items-center justify-center text-xs font-medium overflow-hidden"
                          style={{
                            ...position,
                            backgroundColor: bgColor,
                            borderColor: bgColor,
                          }}
                        >
                          <div className="truncate px-1">
                            {trip.client} ({trip.volume})
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p>No schedules found for this date.</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => router.push("/dashboard/schedules/new")}
              >
                Create New Schedule
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 