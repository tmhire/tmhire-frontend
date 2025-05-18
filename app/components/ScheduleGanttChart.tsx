import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/Spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SearchIcon,
  ArrowUpDownIcon,
} from "lucide-react";
import { convertTimeToIST } from "@/lib/utils/date-utils";

// Type definitions for the schedule data
export interface Trip {
  client: string;
  start: string;
  end: string;
  volume: string;
}

export interface ScheduleData {
  tm: string;
  trips: Trip[];
}

interface ScheduleGanttChartProps {
  scheduleData: ScheduleData[] | undefined;
  isLoading: boolean;
  onCreateSchedule?: () => void;
  startHour?: number;
  endHour?: number;
}

export function ScheduleGanttChart({
  scheduleData = [],
  isLoading,
  onCreateSchedule,
  startHour = 6,
  endHour = 20,
}: ScheduleGanttChartProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Calculate time slots for the Gantt chart (6 AM to 8 PM in 1-hour increments by default)
  const timeSlots = useMemo(() => {
    return Array.from({ length: endHour - startHour }, (_, i) => {
      const hour = i + startHour;
      return `${hour.toString().padStart(2, "0")}:00`;
    });
  }, [startHour, endHour]);

  // Helper function to calculate position and width of a trip block
  const calculateTripPosition = (start: string, end: string) => {
    // Parse hours and minutes from time strings (format: "HH:MM")
    // If these are full ISO strings, convert to Indian time first
    const startTime = convertTimeToIST(start);
    const endTime = convertTimeToIST(end);

    const [startHourStr, startMinStr] = startTime.split(":");
    const [endHourStr, endMinStr] = endTime.split(":");

    const startHourVal = parseInt(startHourStr);
    const startMinVal = parseInt(startMinStr);
    const endHourVal = parseInt(endHourStr);
    const endMinVal = parseInt(endMinStr);

    // Calculate position and width as percentages of the day
    // Each slot is 1 hour
    const totalHours = endHour - startHour;
    const totalMinutes = totalHours * 60;

    // Calculate start position
    const startPosition =
      (((startHourVal - startHour) * 60 + startMinVal) / totalMinutes) * 100;

    // Calculate width
    const durationMinutes =
      endHourVal * 60 + endMinVal - (startHourVal * 60 + startMinVal);
    const width = (durationMinutes / totalMinutes) * 100;

    return {
      left: `${Math.max(0, startPosition)}%`,
      width: `${Math.min(100, width)}%`,
    };
  };

  // Filter and sort schedules
  const filteredAndSortedSchedules = useMemo(() => {
    if (!scheduleData) return [];

    let result = [...scheduleData];

    // Filter by search term
    if (searchTerm) {
      result = result.filter(schedule => 
        schedule.tm.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort by TM ID
    result.sort((a, b) => {
      const numA = parseInt(a.tm);
      const numB = parseInt(b.tm);
      
      if (isNaN(numA) || isNaN(numB)) {
        return sortOrder === "asc" 
          ? a.tm.localeCompare(b.tm) 
          : b.tm.localeCompare(a.tm);
      }
      
      return sortOrder === "asc" ? numA - numB : numB - numA;
    });

    return result;
  }, [scheduleData, searchTerm, sortOrder]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <CardTitle>Schedule Timeline</CardTitle>
            <CardDescription>
              Gantt chart view of transit mixer schedules
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search TM..."
                className="pl-8 max-w-[200px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select
              value={sortOrder}
              onValueChange={(val) => setSortOrder(val as "asc" | "desc")}
            >
              <SelectTrigger className="w-[130px]">
                <ArrowUpDownIcon className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Ascending</SelectItem>
                <SelectItem value="desc">Descending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="small" />
          </div>
        ) : filteredAndSortedSchedules && filteredAndSortedSchedules.length > 0 ? (
          <div className="overflow-x-auto">
            {/* Time scale header */}
            <div className="flex border-b min-w-[800px]">
              <div className="w-[150px] flex-shrink-0 p-2 font-medium border-r">
                Transit Mixer
              </div>
              <div className="flex-1 flex relative">
                {timeSlots.map(time => (
                  <div
                    key={time}
                    className="flex-1 p-2 text-center text-xs font-medium"
                  >
                    {time}
                  </div>
                ))}
                {/* Vertical grid lines */}
                <div className="absolute inset-0 flex pointer-events-none">
                  {timeSlots.map((_, index) => (
                    <div
                      key={index}
                      className="flex-1 h-full border-r border-r-gray-200"
                    ></div>
                  ))}
                </div>
              </div>
            </div>

            {filteredAndSortedSchedules.map((schedule) => {
              // Combine all trips into one consolidated booking visual
              const allTrips = schedule.trips;

              // Get earliest start and latest end time
              let earliestStart = "23:59";
              let latestEnd = "00:00";

              allTrips.forEach(trip => {
                if (trip.start < earliestStart) earliestStart = trip.start;
                if (trip.end > latestEnd) latestEnd = trip.end;
              });

              // Only calculate position if there are trips
              const position =
                allTrips.length > 0
                  ? calculateTripPosition(earliestStart, latestEnd)
                  : null;

              return (
                <div
                  key={schedule.tm}
                  className="flex border-b min-w-[800px] hover:bg-gray-50"
                >
                  <div className="w-[150px] flex-shrink-0 p-2 border-r flex items-center gap-2">
                    <Label htmlFor={`tm-${schedule.tm}`}>TM-{schedule.tm}</Label>
                  </div>
                  <div className="flex-1 relative h-16">
                    {/* Background grid lines */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {timeSlots.map((_, index) => (
                        <div
                          key={index}
                          className="flex-1 h-full border-r border-r-gray-200"
                        ></div>
                      ))}
                    </div>

                    {/* Consolidated trip block */}
                    {allTrips.length > 0 && position && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className="absolute top-2 bottom-2 rounded-md border bg-blue-100 border-blue-300 flex items-center justify-center text-xs font-medium"
                              style={{
                                ...position,
                              }}
                            >
                              <div className="truncate px-2 py-1">
                                {allTrips.length}{" "}
                                {allTrips.length === 1 ? "trip" : "trips"}
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs p-0">
                            <div className="p-2 text-sm">
                              <div className="font-bold mb-1">
                                TM-{schedule.tm} Schedule
                              </div>
                              <div className="space-y-1">
                                {allTrips.map((trip, idx) => (
                                  <div key={idx} className="text-xs">
                                    <div>
                                      <span className="font-semibold">
                                        Client:
                                      </span>{" "}
                                      {trip.client}
                                    </div>
                                    <div>
                                      <span className="font-semibold">
                                        Time:
                                      </span>{" "}
                                      {convertTimeToIST(trip.start)} -{" "}
                                      {convertTimeToIST(trip.end)}
                                    </div>
                                    <div>
                                      <span className="font-semibold">
                                        Volume:
                                      </span>{" "}
                                      {trip.volume}
                                    </div>
                                    {idx < allTrips.length - 1 && (
                                      <hr className="my-1" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center">
            <p>No schedules found for this date.</p>
            {onCreateSchedule && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={onCreateSchedule}
              >
                Create New Schedule
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 