"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/useApiClient";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { User, MapPin, Calendar, CheckCircle2, AlertCircle, Package, Gauge, Truck, Clock } from "lucide-react";

interface Schedule {
  _id: string;
  client_name: string;
  client_id: string;
  site_address: string;
  status: string;
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
  }>;
  tm_count: number;
  created_at: string;
  last_updated: string;
}

export default function ScheduleViewPage() {
  const params = useParams();
  const { fetchWithAuth } = useApiClient();

  const { data: schedule, isLoading } = useQuery<Schedule>({
    queryKey: ["schedule", params.id],
    queryFn: async () => {
      const response = await fetchWithAuth(`/schedules/${params.id}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Failed to fetch schedule");
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
    return <div className="text-center py-4 text-gray-800 dark:text-white/90">Pumping Schedule not found</div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-black dark:text-white">Pumping Schedule Details</h2>
      </div>

      <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="space-y-6">
          {/* Row 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-white/5">
              <User className="w-6 h-6 text-brand-500 dark:text-brand-400" />
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400">Client</h4>
                <p className="text-gray-800 dark:text-white/90 text-sm font-semibold">{schedule.client_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-white/5">
              <MapPin className="w-6 h-6 text-brand-500 dark:text-brand-400" />
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400">Site Location</h4>
                <p className="text-gray-800 dark:text-white/90 text-sm font-semibold">{schedule.site_address}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-white/5">
              <Calendar className="w-6 h-6 text-brand-500 dark:text-brand-400" />
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400">Schedule Date</h4>
                <p className="text-gray-800 dark:text-white/90 text-sm font-semibold">
                  {schedule.input_params.schedule_date}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-white/5">
              {schedule.status === "generated" ? (
                <CheckCircle2 className="w-6 h-6 text-success-500" />
              ) : (
                <AlertCircle className="w-6 h-6 text-warning-500" />
              )}
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400">Status</h4>
                <p
                  className={`text-gray-800 dark:text-white/90 text-sm font-semibold ${
                    schedule.status === "generated"
                      ? "text-success-600 dark:text-success-400"
                      : "text-warning-600 dark:text-warning-400"
                  }`}
                >
                  {schedule.status}
                </p>
              </div>
            </div>
          </div>
          {/* Row 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-white/5">
              <Package className="w-6 h-6 text-brand-500 dark:text-brand-400" />
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Quantity</h4>
                <p className="text-gray-800 dark:text-white/90 text-sm font-semibold">
                  {schedule.input_params.quantity} m³
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-white/5">
              <Gauge className="w-6 h-6 text-brand-500 dark:text-brand-400" />
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400">Pumping Speed</h4>
                <p className="text-gray-800 dark:text-white/90 text-sm font-semibold">
                  {schedule.input_params.pumping_speed} m³/hr
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-white/5">
              <Truck className="w-6 h-6 text-brand-500 dark:text-brand-400" />
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400">TM Count</h4>
                <p className="text-gray-800 dark:text-white/90 text-sm font-semibold">{schedule.tm_count}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-white/5">
              <Clock className="w-6 h-6 text-brand-500 dark:text-brand-400" />
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400">Last Updated</h4>
                <p className="text-gray-800 dark:text-white/90 text-sm font-semibold">
                  {new Date(schedule.last_updated).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Pumping Schedule Details</h4>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Trip No
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      TM No
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Plant Start
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Pump Start
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Unloading Time
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Return Time
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Completed Capacity
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Cycle Time (min)
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {schedule.output_table.map((trip) => (
                    <TableRow key={trip.trip_no}>
                      <TableCell className="px-5 py-4 text-start">
                        <span className="text-gray-800 dark:text-white/90">{trip.trip_no}</span>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start">
                        <span className="text-gray-800 dark:text-white/90">
                          {trip.tm_no}
                          {typeof trip.trip_no_for_tm !== "undefined" && (
                            <span className="text-xs text-gray-500 ml-1">({trip.trip_no_for_tm})</span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start">
                        <span className="text-gray-500 dark:text-gray-400">
                          {trip.plant_start
                            ? new Date(trip.plant_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : "-"}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start">
                        <span className="text-gray-500 dark:text-gray-400">
                          {trip.pump_start
                            ? new Date(trip.pump_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : "-"}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start">
                        <span className="text-gray-500 dark:text-gray-400">
                          {trip.unloading_time
                            ? new Date(trip.unloading_time).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "-"}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start">
                        <span className="text-gray-500 dark:text-gray-400">
                          {trip.return
                            ? new Date(trip.return).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : "-"}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start">
                        <span className="text-gray-800 dark:text-white/90">{trip.completed_capacity} m³</span>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start">
                        <span className="text-gray-800 dark:text-white/90">
                          {typeof trip.cycle_time !== "undefined" ? (trip.cycle_time / 60).toFixed(2) : "-"}
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
    </div>
  );
}
