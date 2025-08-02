"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/useApiClient";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import Badge from "@/components/ui/badge/Badge";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button/Button";

interface SupplySchedule {
  _id: string;
  client_name: string;
  client_id: string;
  site_address: string;
  status: string;
  type: "supply";
  input_params: {
    quantity: number;
    pumping_speed: number;
    onward_time: number;
    return_time: number;
    buffer_time: number;
    pump_start: string;
    schedule_date: string;
  };
  output_table: Array<{
    trip_no: number;
    tm_no: string;
    tm_id: string;
    plant_start: string;
    pump_start: string;
    unloading_time: string;
    return: string;
    completed_capacity: number;
    cycle_time?: number;
    trip_no_for_tm?: number;
    cushion_time?: number;
    plant_name?: string;
  }>;
  tm_count: number;
  created_at: string;
  last_updated: string;
}

export default function SupplyScheduleViewPage() {
  const params = useParams();
  const { fetchWithAuth } = useApiClient();
  const router = useRouter();

  const { data: schedule, isLoading } = useQuery<SupplySchedule>({
    queryKey: ["supply-schedule", params.id],
    queryFn: async () => {
      const response = await fetchWithAuth(`/schedules/${params.id}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Failed to fetch supply schedule");
      return data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!schedule) {
    return <div className="text-center py-4 text-gray-800 dark:text-white/90">Supply Schedule not found</div>;
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "generated":
        return "success";
      case "pending":
        return "warning";
      case "completed":
        return "success";
      case "cancelled":
        return "danger";
      default:
        return "default";
    }
  };

  const formatTimeRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    const pad = (n: number) => n.toString().padStart(2, '0');
    
    return `${pad(startDate.getHours())}:${pad(startDate.getMinutes())} - ${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`;
  };

  const formatOverallRange = (trips: SupplySchedule['output_table']) => {
    if (trips.length === 0) return "N/A";
    
    const firstTrip = trips[0];
    const lastTrip = trips[trips.length - 1];
    
    const pad = (n: number) => n.toString().padStart(2, '0');
    
    const startTime = new Date(firstTrip.plant_start);
    const endTime = new Date(lastTrip.return);
    
    return `${pad(startTime.getHours())}:${pad(startTime.getMinutes())} - ${pad(endTime.getHours())}:${pad(endTime.getMinutes())}`;
  };

  const getTotalHours = (trips: SupplySchedule['output_table']) => {
    if (trips.length === 0) return 0;
    
    const firstTrip = new Date(trips[0].plant_start);
    const lastTrip = new Date(trips[trips.length - 1].return);
    
    const diffMs = lastTrip.getTime() - firstTrip.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    return diffHours;
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Supply Schedule Details</h1>
            <p className="text-gray-600 dark:text-gray-400">View supply schedule information</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/supply-schedules/${schedule._id}`)}
          >
            Edit Schedule
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Schedule Information</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Client:</span>
              <span className="font-medium text-gray-900 dark:text-white">{schedule.client_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Site Address:</span>
              <span className="font-medium text-gray-900 dark:text-white">{schedule.site_address}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Quantity:</span>
              <span className="font-medium text-gray-900 dark:text-white">{schedule.input_params.quantity} m³</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Schedule Date:</span>
              <span className="font-medium text-gray-900 dark:text-white">{formatDate(schedule.input_params.schedule_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Start Time:</span>
              <span className="font-medium text-gray-900 dark:text-white">{formatTime(schedule.input_params.pump_start)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Status:</span>
              <Badge size="sm" color={getStatusColor(schedule.status)}>
                {schedule.status}
              </Badge>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Schedule Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Total TM Count:</span>
              <span className="font-medium text-gray-900 dark:text-white">{schedule.tm_count}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Total Trips:</span>
              <span className="font-medium text-gray-900 dark:text-white">{schedule.output_table.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Overall Duration:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatOverallRange(schedule.output_table)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Total Hours:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {getTotalHours(schedule.output_table).toFixed(1)} hours
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Created:</span>
              <span className="font-medium text-gray-900 dark:text-white">{formatDate(schedule.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Last Updated:</span>
              <span className="font-medium text-gray-900 dark:text-white">{formatDate(schedule.last_updated)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Schedule Details</h3>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell
                    isHeader
                    className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Trip No
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    TM No
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Plant Name
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Plant Start
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Supply Start
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Unloading Time
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Return Time
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Completed Capacity
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Cycle Time (min)
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Cushion Time (min)
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {schedule.output_table.map((trip) => (
                  <TableRow key={trip.trip_no}>
                    <TableCell className="px-3 py-4 text-start">
                      <span className="text-gray-800 dark:text-white/90">{trip.trip_no}</span>
                    </TableCell>
                    <TableCell className="px-3 py-4 text-start">
                      <span className="text-gray-800 dark:text-white/90">
                        {trip.tm_no}
                        {typeof trip.trip_no_for_tm !== "undefined" && (
                          <span className="text-xs text-gray-500 ml-1">({trip.trip_no_for_tm})</span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-4 text-start">
                      <span className="text-gray-800 dark:text-white/90">
                        {trip.plant_name ? trip.plant_name : "N / A"}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-4 text-start">
                      <span className="text-gray-500 dark:text-gray-400">
                        {trip.plant_start
                          ? new Date(trip.plant_start).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-4 text-start">
                      <span className="text-gray-500 dark:text-gray-400">
                        {trip.pump_start
                          ? new Date(trip.pump_start).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-4 text-start">
                      <span className="text-gray-500 dark:text-gray-400">
                        {trip.unloading_time
                          ? new Date(trip.unloading_time).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-4 text-start">
                      <span className="text-gray-500 dark:text-gray-400">
                        {trip.return
                          ? new Date(trip.return).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-4 text-start">
                      <span className="text-gray-800 dark:text-white/90">{trip.completed_capacity} m³</span>
                    </TableCell>
                    <TableCell className="px-3 py-4 text-start">
                      <span className="text-gray-800 dark:text-white/90">
                        {typeof trip.cycle_time !== "undefined" ? (trip.cycle_time / 60).toFixed(0) : "-"}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-4 text-start">
                      <span className="text-gray-800 dark:text-white/90">
                        {typeof trip.cushion_time !== "undefined" ? (trip.cushion_time / 60).toFixed(0) : "-"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
} 