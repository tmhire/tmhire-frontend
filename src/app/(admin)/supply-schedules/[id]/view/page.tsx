"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/useApiClient";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import Badge from "@/components/ui/badge/Badge";
import { formatTimeByPreference, formatHoursAndMinutes } from "@/lib/utils";
import { useProfile } from "@/hooks/useProfile";

interface SupplySchedule {
  _id: string;
  client_name: string;
  client_id: string;
  site_address: string;
  status: string;
  type: "supply";
  input_params: {
    unloading_time: number;
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
  const { profile } = useProfile();

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

  return (
    <div className="w-full mx-auto">
      <div className="mb-3">
        <h2 className="text-xl font-semibold text-black dark:text-white flex gap-3">
          <span>Concrete Supply - Schedule Summary</span>
          <Badge size="sm" color={schedule.status === "generated" ? "success" : "warning"}>
            {schedule.status}
          </Badge>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        {/* Summary Card */}
        <div className="md:col-span-2 bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-xl p-6 flex flex-col justify-center h-full">
          <div className="grid grid-cols-4 gap-x-8 gap-y-4">
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Scheduled Date</h4>
              <p className="text-base text-gray-800 dark:text-white/90">
                {schedule.input_params.schedule_date
                  ? new Date(schedule.input_params.schedule_date).toLocaleDateString(["en-GB"], {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                    })
                  : "N/A"}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Supply Start Time</h4>
              <p className="text-base text-gray-800 dark:text-white/90">
                {schedule.input_params.pump_start
                  ? new Date(schedule.input_params.pump_start).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "N/A"}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Client Name</h4>
              <p className="text-base text-gray-800 dark:text-white/90">{schedule.client_name}</p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Site Location</h4>
              <p className="text-base text-gray-800 dark:text-white/90">{schedule.site_address}</p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Total Qty Supplied in m³</h4>
              <p className="text-base text-gray-800 dark:text-white/90">{schedule.input_params.quantity} m³</p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Load/Pre-Start Time (mins)</h4>
              <p className="text-base text-gray-800 dark:text-white/90">{schedule.input_params.buffer_time} min</p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Onward Time (mins)</h4>
              <p className="text-base text-gray-800 dark:text-white/90">{schedule.input_params.onward_time} min</p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Unloading Time (mins)</h4>
              <p className="text-base text-gray-800 dark:text-white/90">{schedule.input_params.unloading_time} min</p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Return Time (mins)</h4>
              <p className="text-base text-gray-800 dark:text-white/90">{schedule.input_params.return_time} min</p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Total TM Count</h4>
              <p className="text-base text-gray-800 dark:text-white/90">{schedule.tm_count}</p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Total Trips</h4>
              <p className="text-base text-gray-800 dark:text-white/90">{schedule.output_table.length}</p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Created</h4>
              <p className="text-base text-gray-800 dark:text-white/90">
                {new Date(schedule.created_at).toLocaleDateString(["en-GB"], {
                  month: "2-digit",
                  day: "2-digit",
                  year: "2-digit",
                })}
              </p>
            </div>
          </div>
        </div>
        {/* TM Trip Distribution Card */}
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-xl p-6 flex flex-col justify-start h-full">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">TM Trip Distribution</h3>
          {(() => {
            if (!schedule.output_table || schedule.output_table.length === 0) {
              return <div className="text-gray-500 dark:text-gray-400">No trip data available.</div>;
            }
            // 1. Count trips per TM
            const tmTripCounts: Record<string, number> = {};
            schedule.output_table.forEach((trip) => {
              if (!tmTripCounts[trip.tm_id]) tmTripCounts[trip.tm_id] = 0;
              tmTripCounts[trip.tm_id]++;
            });
            // 2. Group TMs by their trip count
            const tripsToTmCount: Record<number, number> = {};
            Object.values(tmTripCounts).forEach((tripCount) => {
              if (!tripsToTmCount[tripCount]) tripsToTmCount[tripCount] = 0;
              tripsToTmCount[tripCount]++;
            });
            // 3. Prepare rows
            const rows = Object.entries(tripsToTmCount)
              .sort((a, b) => Number(b[0]) - Number(a[0])) // Descending by trip count
              .map(([trips, tmCount]) => ({
                tmCount: Number(tmCount),
                trips: Number(trips),
                totalTrips: Number(tmCount) * Number(trips),
              }));
            const totalTMs = Object.keys(tmTripCounts).length;
            const totalTrips = schedule.output_table.length;
            return (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900/30">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      <th className="px-2 py-2 font-medium text-gray-700 dark:text-gray-200 text-left">Sl. No</th>
                      <th className="px-2 py-2 font-medium text-gray-700 dark:text-gray-200 text-left">
                        NO OF TMs (A)
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-700 dark:text-gray-200 text-left">
                        NO OF TRIPS/TM (B)
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-700 dark:text-gray-200 text-left">
                        TOTAL TRIPS (A) x (B)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <tr
                        key={idx}
                        className="border-b text-sm border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400"
                      >
                        <td className="px-2 py-2 text-left">{idx + 1}</td>
                        <td className="px-2 py-2 text-left">{row.tmCount}</td>
                        <td className="px-2 py-2 text-left">{row.trips}</td>
                        <td className="px-2 py-2 text-left">{row.totalTrips}</td>
                      </tr>
                    ))}
                    {/* Summary row */}
                    <tr className="font-semibold text-gray-500 dark:text-gray-400">
                      <td className="px-2 py-2 text-left">TOTAL</td>
                      <td className="px-2 py-2 text-left">{totalTMs}</td>
                      <td className="px-2 py-2 text-left"></td>
                      <td className="px-2 py-2 text-left">{totalTrips}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      </div>

      <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Schedule Table</h4>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-100/20 dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Trip No
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      TM No
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Plant Name
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Plant Start
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Supply Start
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Unloading Time
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Return Time
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Completed Capacity
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Cycle Time (min)
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
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
                          {(() => {
                            // Calculate total trips for this TM
                            const tmTotalTrips = schedule.output_table.filter((t) => t.tm_id === trip.tm_id).length;
                            // Find the current trip number for this TM (1-based index)
                            const tmTrips = schedule.output_table
                              .filter((t) => t.tm_id === trip.tm_id)
                              .sort((a, b) => a.trip_no - b.trip_no);
                            const currentTripIndex = tmTrips.findIndex((t) => t.trip_no === trip.trip_no) + 1;

                            return (
                              <>
                                <div className="flex w-fit rounded-lg border-2 border-black bg-yellow-500 shadow items-center gap-2 pr-2">
                                  <label className="flex flex-col justify-between bg-blue-700 rounded-l-md p-2 text-[8px]  text-white">
                                    <span className="text-xs text-white-400">
                                      ({currentTripIndex}/{tmTotalTrips})
                                    </span>
                                  </label>
                                  <label className="p-1 px-1 font-mono text-sm font-medium items-center ">
                                    {trip.tm_no}
                                  </label>
                                </div>
                              </>
                            );
                          })()}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 py-4 text-start">
                        <span className="text-gray-800 dark:text-white/90">
                          {trip.plant_name ? trip.plant_name : "N / A"}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 py-4 text-start">
                        <span className="text-gray-500 dark:text-gray-400">
                          {formatTimeByPreference(trip.plant_start, profile?.preferred_format)}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 py-4 text-start">
                        <span className="text-gray-500 dark:text-gray-400">
                          {trip.pump_start ? formatTimeByPreference(trip.pump_start, profile?.preferred_format) : "-"}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 py-4 text-start">
                        <span className="text-gray-500 dark:text-gray-400">
                          {trip.unloading_time
                            ? formatTimeByPreference(trip.unloading_time, profile?.preferred_format)
                            : "-"}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 py-4 text-start">
                        <span className="text-gray-500 dark:text-gray-400">
                          {trip.return ? formatTimeByPreference(trip.return, profile?.preferred_format) : "-"}
                        </span>
                      </TableCell>

                      <TableCell className="px-3 py-4 text-start">
                        <span className="text-gray-800 dark:text-white/90">{trip.completed_capacity} m³</span>
                      </TableCell>
                      <TableCell className="px-3 py-4 text-start">
                        <span className="text-gray-800 dark:text-white/90">
                          {typeof trip.cycle_time !== "undefined" ? (trip.cycle_time / 60).toFixed(2) : "-"}
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
      {/* TM WISE TRIP DETAILS TABLE */}
      <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mt-3">
        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">TM Wise Trip Details</h4>
        {(() => {
          if (!schedule.output_table || schedule.output_table.length === 0) {
            return <div className="text-gray-500 dark:text-gray-400">No trip data available.</div>;
          }
          // Group trips by TM
          const tmTrips: Record<string, typeof schedule.output_table> = {};
          schedule.output_table.forEach((trip) => {
            if (!tmTrips[trip.tm_id]) tmTrips[trip.tm_id] = [];
            tmTrips[trip.tm_id].push(trip);
          });
          // Sort trips for each TM by trip_no
          Object.values(tmTrips).forEach((trips) => trips.sort((a, b) => a.trip_no - b.trip_no));
          // Get all TM IDs and max number of trips
          const tmIds = Object.keys(tmTrips);
          const maxTrips = Math.max(...Object.values(tmTrips).map((trips) => trips.length));
          // Helper to format overall time range
          function formatOverallRange(trips: SupplySchedule["output_table"], preferredFormat?: string) {
            if (!trips.length) return "-";
            const starts = trips
              .map((t) => t.plant_start)
              .filter(Boolean)
              .map((t) => new Date(t));
            const ends = trips
              .map((t) => t.return)
              .filter(Boolean)
              .map((t) => new Date(t));

            if (!starts.length || !ends.length) return "-";

            const minStart = new Date(Math.min(...starts.map((d) => d.getTime())));
            const maxEnd = new Date(Math.max(...ends.map((d) => d.getTime())));

            const sTime = formatTimeByPreference(minStart, preferredFormat);
            const eTime = formatTimeByPreference(maxEnd, preferredFormat);

            return `${sTime} - ${eTime}`;
          }

          // Helper to get total hours for a TM
          function getTotalHours(trips: SupplySchedule["output_table"]) {
            if (!trips.length) return 0;
            const starts = trips
              .map((t) => t.plant_start)
              .filter(Boolean)
              .map((t) => new Date(t));
            const ends = trips
              .map((t) => t.return)
              .filter(Boolean)
              .map((t) => new Date(t));
            if (!starts.length || !ends.length) return 0;
            const minStart = new Date(Math.min(...starts.map((d) => d.getTime())));
            const maxEnd = new Date(Math.max(...ends.map((d) => d.getTime())));
            return (maxEnd.getTime() - minStart.getTime()) / (1000 * 60 * 60); // hours
          }
          // For last row: average total hours
          const totalHoursArr = tmIds.map((tmId) => getTotalHours(tmTrips[tmId]));
          const avgTotalHours = totalHoursArr.length
            ? totalHoursArr.reduce((a, b) => a + b, 0) / totalHoursArr.length
            : 0;
          // For TM label, use identifier if available
          const tmIdToIdentifier: Record<string, string> = {};
          schedule.output_table.forEach((trip) => {
            if (trip.tm_id && trip.tm_no) tmIdToIdentifier[trip.tm_id] = trip.tm_no;
          });
          return (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900/30">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800">
                    <th className="px-2 py-2 font-medium text-gray-700 dark:text-gray-200 text-left">S.No.</th>
                    <th className="px-2 py-2 font-medium text-gray-700 dark:text-gray-200 text-left">TM</th>
                    {Array.from({ length: maxTrips }).map((_, i) => (
                      <th key={i} className="px-2 py-2 font-medium text-gray-700 dark:text-gray-200 text-left">
                        Trip {i + 1}
                      </th>
                    ))}
                    <th className="px-2 py-2 font-medium text-gray-700 dark:text-gray-200 text-left">Start-End Time</th>
                    <th className="px-2 py-2 font-medium text-gray-700 dark:text-gray-200 text-right">Total Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {tmIds.map((tmId, index) => {
                    const trips = tmTrips[tmId];
                    const overallRange = formatOverallRange(trips, profile?.preferred_format);
                    const totalHours = getTotalHours(trips);
                    return (
                      <tr key={tmId} className="border-b border-gray-100 dark:border-gray-700">
                        <td className="px-2 py-2 text-gray-600 dark:text-gray-400 text-left">{index + 1}</td>
                        <td className="px-2 py-2 text-gray-800 dark:text-white/90 font-medium text-left">
                          {tmIdToIdentifier[tmId] || tmId}
                        </td>
                        {Array.from({ length: maxTrips }).map((_, i) => {
                          const trip = trips[i];
                          return (
                            <td key={i} className="px-2 py-2 text-left text-gray-800 dark:text-white/90">
                              {trip
                                ? `${formatTimeByPreference(
                                    trip.plant_start,
                                    profile?.preferred_format
                                  )} - ${formatTimeByPreference(trip.return, profile?.preferred_format)}`
                                : "-"}
                            </td>
                          );
                        })}
                        <td className="px-4 text-gray-800 dark:text-white/90 py-2 text-left">{overallRange}</td>
                        <td className="px-4 text-gray-800 dark:text-white/90 py-2 text-right">
                          {totalHours ? formatHoursAndMinutes(totalHours) : "-"}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Last row: average total hours */}
                  <tr className="font-semibold bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white/90">
                    <td className="px-2 py-2 text-left">Avg</td>
                    <td className="px-2 py-2 text-center "></td>
                    {Array.from({ length: maxTrips }).map((_, i) => (
                      <td key={i} className="px-2 py-2"></td>
                    ))}
                    <td className="px-2 py-2 text-center"></td>
                    <td className="px-2 py-2 text-right">{avgTotalHours ? formatHoursAndMinutes(avgTotalHours) : "-"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
