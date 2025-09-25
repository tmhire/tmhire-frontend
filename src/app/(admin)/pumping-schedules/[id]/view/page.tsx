"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/useApiClient";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { Pencil, Trash2, Download, CopyX } from "lucide-react";
import { formatTimeByPreference, formatHoursAndMinutes } from "@/lib/utils";
import { useProfile } from "@/hooks/useProfile";
import { useState } from "react";
import * as XLSX from "xlsx";
import { CanceledBy, CancelReason, DeleteType } from "@/types/common.types";
import Radio from "@/components/form/input/Radio";

interface Schedule {
  pumping_job: string;
  _id: string;
  user_id: string;
  project_id: string;
  project_name: string;
  client_name: string;
  schedule_no: string;
  client_id: string;
  site_supervisor_id: string;
  site_supervisor_name: string;
  mother_plant_name: string;
  site_address: string;
  status: string;
  pump: string;
  pump_type: string;
  pump_site_reach_time: string;
  concreteGrade: number;
  floor_height: number;
  pumping_speed: number;
  cycle_time: number;
  total_trips: number;
  trips_per_tm: number;
  type: string;
  slump_at_site: number;
  mother_plant_km: number;
  created_at: string;
  last_updated: string;
  input_params: {
    quantity: number;
    pumping_speed: number;
    onward_time: number;
    return_time: number;
    buffer_time: number;
    load_time: number;
    pump_start: string;
    schedule_date: string;
    pump_start_time_from_plant: string;
    pump_fixing_time: number;
    pump_removal_time: number;
    unloading_time: number;
    pump_onward_time?: number;
  };
  output_table: Array<{
    trip_no: number;
    tm_no: string;
    tm_id: string;
    plant_load: string;
    plant_buffer: string;
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
  available_pumps: Array<{
    id: string;
    identifier: string;
    type: string;
    capacity: number;
    make?: string;
    driver_name?: string;
    driver_contact?: string;
    remarks?: string;
    status: string;
    availability: boolean;
  }>;
  burst_table?: Array<{
    trip_no: number;
    tm_no: string;
    tm_id: string;
    plant_load: string;
    plant_buffer: string;
    plant_start: string;
    pump_start: string;
    unloading_time: string;
    return: string;
    completed_capacity: number;
    cycle_time?: number;
    trip_no_for_tm?: number;
    cushion_time?: number | null;
    plant_name?: string | null;
    site_reach?: string;
    waiting_time?: number;
    queue?: number;
  }>;
}

type TripRow = Schedule["output_table"][number] & {
  site_reach?: string;
  waiting_time?: number;
  queue?: number;
  plant_name?: string | null;
  cushion_time?: number | null;
};

// Utility function to calculate pump start time from plant
const calculatePumpStartTimeFromPlant = (schedule: Schedule, preferredFormat?: string): string => {
  const pump_start = schedule.output_table?.length > 0 ? schedule.output_table[0].pump_start : null;
  if (!pump_start) return "N/A";

  const pumpStart = new Date(pump_start);
  const pumpFixingTime = schedule.input_params.pump_fixing_time || 0;
  const pumpOnwardTime = schedule.input_params.pump_onward_time || 0;

  const totalMinutesToSubtract = pumpFixingTime + pumpOnwardTime;
  const calculatedTime = new Date(pumpStart.getTime() - totalMinutesToSubtract * 60 * 1000);

  return formatTimeByPreference(calculatedTime, preferredFormat);
};

const calculatePumpSiteReachTime = (schedule: Schedule, preferredFormat?: string): string => {
  const pump_start = schedule.output_table?.length > 0 ? schedule.output_table[0].pump_start : null;
  if (!pump_start) return "N/A";

  const pumpStart = new Date(pump_start);
  const pumpFixingTime = schedule.input_params.pump_fixing_time || 0;

  const calculatedTime = new Date(pumpStart.getTime() - pumpFixingTime * 60 * 1000);

  return formatTimeByPreference(calculatedTime, preferredFormat);
};

export default function ScheduleViewPage() {
  const params = useParams();
  const router = useRouter();
  const { fetchWithAuth } = useApiClient();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [canceledBy, setCanceledBy] = useState<CanceledBy>(CanceledBy.client);
  const [reasonForCancel, setReasonForCancel] = useState<CancelReason>(CancelReason.ecl);
  const [useBurstModel, setUseBurstModel] = useState(false);

  // Delete schedule mutation
  const deleteScheduleMutation = useMutation({
    mutationFn: async (variables: { id: string; deleteType: DeleteType }) => {
      let query = `/schedules/${variables.id}?delete_type=${variables.deleteType}`;
      if (variables.deleteType === DeleteType.cancel) {
        query += `&canceled_by=${canceledBy}&cancel_reason=${reasonForCancel}`;
      }
      const response = await fetchWithAuth(query, { method: "DELETE" });
      if (!response) throw new Error("No response from server");
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Failed to delete schedule");
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      setIsCancelModalOpen(false);
      setIsDeleteModalOpen(false);
      router.push("/pumping-schedules");
    },
  });

  const handleEdit = () => {
    router.push(`/pumping-schedules/${params.id}`);
  };

  const handleCancel = () => {
    setIsCancelModalOpen(true);
  };

  const handleDelete = () => {
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (deleteType: DeleteType = DeleteType.cancel) => {
    try {
      await deleteScheduleMutation.mutateAsync({ id: params.id as string, deleteType });
    } catch (error) {
      console.error("Error deleting schedule:", error);
    }
  };

  const { data: schedule, isLoading } = useQuery<Schedule>({
    queryKey: ["schedule", params.id],
    queryFn: async () => {
      const response = await fetchWithAuth(`/schedules/${params.id}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Failed to fetch schedule");
      return data.data;
    },
  });

  const handleExportExcel = () => {
    if (!schedule) return;

    const wb = XLSX.utils.book_new();

    // Summary Sheet with TM Trip Distribution and TM Wise Trip Details
    const summaryData: (string | number)[][] = [
      [
        "Scheduled Date",
        schedule.input_params.schedule_date
          ? new Date(schedule.input_params.schedule_date).toLocaleDateString(["en-GB"], {
              day: "2-digit",
              month: "2-digit",
              year: "2-digit",
            })
          : "-",
      ],
      [
        "Pump Start Time at Site",
        schedule.input_params.pump_start
          ? new Date(schedule.input_params.pump_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "-",
      ],
      ["Type of Pump", schedule.pump_type || "-"],
      ["Pumping Speed m³/hour", `${schedule.input_params.pumping_speed}`],
      ["Client Name", schedule.client_name || "-"],
      ["Project Name & Site Location", `${schedule.project_name || "-"}, ${schedule.site_address || "-"}`],
      ["Placement Zone", schedule.pumping_job || "-"],
      ["Mother Plant", schedule.mother_plant_name || "-"],
      ["Site Supervisor", schedule.site_supervisor_name || "-"],
      ["Slump at Site", `${schedule.slump_at_site ?? "-"}`],
      ["One way Km from Mother Plant", `${schedule.mother_plant_km ?? "-"}`],
      ["Floor Height", `${schedule.floor_height ?? "-"}`],
      ["RMC Grade", schedule.concreteGrade ? `M ${schedule.concreteGrade}` : "-"],
      ["Total Qty Pumped in m³", `${schedule.input_params.quantity}`],
      ["Pre-Start Time (mins) (A)", `${schedule.input_params.buffer_time}`],
      ["Load Time (mins) (B)", `${schedule.input_params.load_time}`],
      ["Onward Time (mins) (C)", `${schedule.input_params.onward_time}`],
      ["Unloading Time (mins) (D)", `${schedule.input_params.unloading_time}`],
      ["Return Time (mins) (E)", `${schedule.input_params.return_time}`],
      ["Total TM Cycle Time (A+B+C+D+E)", `${formatHoursAndMinutes(schedule.cycle_time)}`],
      ["Status", schedule.status],
      ["Schedule Name", schedule.schedule_no || "-"],
    ];
    // Add TM Trip Distribution data
    if (schedule.output_table && schedule.output_table.length > 0) {
      const tmTripCounts: Record<string, number> = {};
      schedule.output_table.forEach((trip) => {
        if (!tmTripCounts[trip.tm_id]) tmTripCounts[trip.tm_id] = 0;
        tmTripCounts[trip.tm_id]++;
      });
      const tripsToTmCount: Record<number, number> = {};
      Object.values(tmTripCounts).forEach((tripCount) => {
        if (!tripsToTmCount[tripCount]) tripsToTmCount[tripCount] = 0;
        tripsToTmCount[tripCount]++;
      });
      const rows = Object.entries(tripsToTmCount)
        .sort((a, b) => Number(b[0]) - Number(a[0]))
        .map(([trips, tmCount], idx) => [idx + 1, Number(tmCount), Number(trips), Number(tmCount) * Number(trips)]);
      const totalTMs = Object.keys(tmTripCounts).length;
      const totalTrips = schedule.output_table.length;

      // Add spacing after summary data
      summaryData.push(["", ""], ["TM Trip Distribution", ""]);
      summaryData.push(["Sl. No", "NO OF TMs (A)", "NO OF TRIPS/TM (B)", "TOTAL TRIPS (A) x (B)"]);
      rows.forEach((row) => summaryData.push(row));
      summaryData.push(["TOTAL", totalTMs, "", totalTrips]);
    }

    // Helper functions for time calculations
    function formatOverallRange(trips: Schedule["output_table"], preferredFormat?: string) {
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

    function getTotalHours(trips: Schedule["output_table"]) {
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
      return (maxEnd.getTime() - minStart.getTime()) / (1000 * 60 * 60);
    }

    // Add TM Wise Trip Details
    if (schedule.output_table && schedule.output_table.length > 0) {
      const preferred = profile?.preferred_format;
      const tmTrips: Record<string, Schedule["output_table"]> = {};
      schedule.output_table.forEach((trip) => {
        if (!tmTrips[trip.tm_id]) tmTrips[trip.tm_id] = [];
        tmTrips[trip.tm_id].push(trip);
      });
      Object.values(tmTrips).forEach((trips) => trips.sort((a, b) => a.trip_no - b.trip_no));
      const tmIds = Object.keys(tmTrips);
      const maxTrips = Math.max(...Object.values(tmTrips).map((trips) => trips.length));
      const tmIdToIdentifier: Record<string, string> = {};
      schedule.output_table.forEach((trip) => {
        if (trip.tm_id && trip.tm_no) tmIdToIdentifier[trip.tm_id] = trip.tm_no;
      });

      // Add spacing before TM Wise Trip Details
      summaryData.push(["", ""], ["TM Wise Trip Details", ""]);
      const header = [
        "S.No.",
        "TM",
        ...Array.from({ length: maxTrips }, (_, i) => `Trip ${i + 1}`),
        "Start-End Time",
        "Total Hours",
      ];
      summaryData.push(header);

      tmIds.forEach((tmId, index) => {
        const trips = tmTrips[tmId];
        const tripTimes = Array.from({ length: maxTrips }).map((_, i) => {
          const trip = trips[i];
          return trip
            ? `${formatTimeByPreference(trip.plant_start, preferred)} - ${formatTimeByPreference(
                trip.return,
                preferred
              )}`
            : "-";
        });
        const overallRange = formatOverallRange(trips);
        const totalHours = getTotalHours(trips);
        summaryData.push([
          index + 1,
          tmIdToIdentifier[tmId] || tmId,
          ...tripTimes,
          overallRange,
          totalHours ? formatHoursAndMinutes(totalHours) : "-",
        ]);
      });

      const totalHoursArr = tmIds.map((tmId) => getTotalHours(tmTrips[tmId]));
      const avgTotalHours = totalHoursArr.length ? totalHoursArr.reduce((a, b) => a + b, 0) / totalHoursArr.length : 0;
      summaryData.push([
        "Avg",
        "",
        ...Array.from({ length: maxTrips }).map(() => ""),
        "",
        avgTotalHours ? formatHoursAndMinutes(avgTotalHours) : "-",
      ]);
    }

    const wsSummary = XLSX.utils.aoa_to_sheet([["Field", "Value"], ...summaryData]);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    // Schedule Table Sheet with Pump Details
    if (schedule.output_table && schedule.output_table.length > 0) {
      const preferred = profile?.preferred_format;
      const pump = schedule.available_pumps.find((p) => p.id === schedule.pump);
      const pumpIdentifier = pump ? pump.identifier : "N/A";
      const pumpStartFromPlant = calculatePumpStartTimeFromPlant(schedule, preferred);
      const siteReachTime = calculatePumpSiteReachTime(schedule, preferred);
      const pumpStart = schedule.output_table[0]?.pump_start;
      const pumpStartTime = pumpStart ? formatTimeByPreference(pumpStart, preferred) : "N/A";
      const pumpingHours = schedule.input_params.quantity / schedule.input_params.pumping_speed;
      const pumpEndTime = (() => {
        if (!pumpStart) return "N/A";
        const ps = new Date(pumpStart);
        const pe = new Date(ps.getTime() + pumpingHours * 60 * 60 * 1000);
        return formatTimeByPreference(pe, preferred);
      })();
      const siteLeaveTime = (() => {
        if (!pumpStart) return "N/A";
        const ps = new Date(pumpStart);
        const pe = new Date(ps.getTime() + pumpingHours * 60 * 60 * 1000);
        const sl = new Date(pe.getTime() + (schedule.input_params.pump_removal_time || 0) * 60 * 1000);
        return formatTimeByPreference(sl, preferred);
      })();
      const totalHoursEngaged = (() => {
        if (!pumpStart) return "N/A";
        const ps = new Date(pumpStart);
        const fixing = schedule.input_params.pump_fixing_time || 0;
        const onward = schedule.input_params.pump_onward_time || 0;
        const startFromPlant = new Date(ps.getTime() - (fixing + onward) * 60 * 1000);
        const pe = new Date(ps.getTime() + pumpingHours * 60 * 60 * 1000);
        const sl = new Date(pe.getTime() + (schedule.input_params.pump_removal_time || 0) * 60 * 1000);
        const hours = (sl.getTime() - startFromPlant.getTime()) / (1000 * 60 * 60);
        return formatHoursAndMinutes(hours);
      })();

      // Add pump details at the top of schedule table
      const pumpDetailsHeader = [
        "Pump",
        "Start Time from Plant",
        "Site Reach Time",
        "Fixing Time (min)",
        "Pump Start Time",
        "Pumping Hours",
        "Pump End Time",
        "Removal Time (min)",
        "Site Leave Time",
        "Total Hours Engaged",
      ];
      const pumpDetailsRow = [
        pumpIdentifier,
        pumpStartFromPlant,
        siteReachTime,
        schedule.input_params.pump_fixing_time || 0,
        pumpStartTime,
        formatHoursAndMinutes(pumpingHours),
        pumpEndTime,
        schedule.input_params.pump_removal_time || 0,
        siteLeaveTime,
        totalHoursEngaged,
      ];

      // Schedule table data
      const scheduleHeader = [
        "Trip No",
        "TM No",
        "Plant - Name",
        "Plant - Prepare Time",
        "Plant - Load Time",
        "Plant - Start Time",
        "Pump - Start Time",
        "Pump - End Time",
        "Return Time",
        "Cum. Volume",
        "Cycle Time (min)",
        "Cushion Time (min)",
      ];
      const scheduleRows = schedule.output_table.map((trip) => [
        trip.trip_no,
        trip.tm_no,
        trip.plant_name ? trip.plant_name : "N / A",
        trip.plant_buffer ? formatTimeByPreference(trip.plant_buffer, preferred) : "-",
        trip.plant_load ? formatTimeByPreference(trip.plant_load, preferred) : "-",
        formatTimeByPreference(trip.plant_start, preferred),
        trip.pump_start ? formatTimeByPreference(trip.pump_start, preferred) : "-",
        trip.unloading_time ? formatTimeByPreference(trip.unloading_time, preferred) : "-",
        trip.return ? formatTimeByPreference(trip.return, preferred) : "-",
        `${trip.completed_capacity} m³`,
        typeof trip.cycle_time !== "undefined" ? (trip.cycle_time / 60).toFixed(2) : "-",
        typeof trip.cushion_time !== "undefined" ? (trip.cushion_time / 60).toFixed(0) : "-",
      ]);

      // Combine pump details and schedule table with spacing
      const wsSchedule = XLSX.utils.aoa_to_sheet([
        ["Pump Details"],
        pumpDetailsHeader,
        pumpDetailsRow,
        [""], // Empty row for spacing
        ["Schedule Table"],
        scheduleHeader,
        ...scheduleRows,
      ]);
      XLSX.utils.book_append_sheet(wb, wsSchedule, "Schedule Details");
    }

    XLSX.writeFile(wb, `${schedule.schedule_no || "pumping-schedule"}-${schedule._id}.xlsx`);
  };

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
    <div className="w-full mx-">
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-black dark:text-white flex gap-3">
            <span>Concrete Pumping - Schedule Summary</span>
            <Badge size="sm" color={schedule.status === "generated" ? "success" : "warning"}>
              {schedule.status}
            </Badge>
            {schedule.schedule_no && (
              <Badge size="sm" color={"info"}>
                {schedule.schedule_no}
              </Badge>
            )}
          </h2>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportExcel}
              className="flex items-center gap-1"
              disabled={schedule.status !== "generated"}
            >
              <Download size={14} />
              Export
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleEdit}
              className="flex items-center gap-1"
              disabled={schedule.status !== "generated" && schedule.status !== "draft"}
            >
              <Pencil size={14} />
              Edit
            </Button>
            {schedule.status === "draft" && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleDelete}
                className="flex items-center gap-1 text-red-600 hover:text-red-700"
              >
                <Trash2 size={14} />
                Delete
              </Button>
            )}

            {schedule.status === "generated" && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                className="flex items-center gap-1 text-red-600 hover:text-red-700"
              >
                <CopyX size={14} />
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        {/* Summary Card */}
        <div className="md:col-span-2 bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-xl p-6 flex flex-col justify-start h-full">
          <div className="grid grid-cols-4 gap-x-8 gap-y-4">
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Scheduled Date</h4>
              <p className="text-base text-gray-800 dark:text-white/90">
                {schedule.input_params.schedule_date &&
                  new Date(schedule.input_params.schedule_date).toLocaleDateString(["en-GB"], {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                  })}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Pump Start Time at Site</h4>
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
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Type of Pump</h4>
              <p className="text-base text-gray-800 dark:text-white/90">{schedule.pump_type || "N/A"}</p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Pumping Speed m³/hour</h4>
              <p className="text-base text-gray-800 dark:text-white/90">{schedule.input_params.pumping_speed} m³/hr</p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Client Name</h4>
              <p className="text-base text-gray-800 dark:text-white/90">{schedule.client_name}</p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Project Name & Site Location
              </h4>
              <p
                className="text-base text-gray-800 dark:text-white/90 truncate"
                title={`${schedule.project_name}, ${schedule.site_address}`}
              >
                {schedule.project_name}, {schedule.site_address}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Placement Zone</h4>
              <p className="text-base text-gray-800 dark:text-white/90">{schedule.pumping_job}</p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Mother Plant</h4>
              <p className="text-base text-gray-800 dark:text-white/90">{schedule.mother_plant_name}</p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Site Supervisor</h4>
              <p className="text-base text-gray-800 dark:text-white/90">{schedule.site_supervisor_name}</p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Slump at Site</h4>
              <p className="text-base text-gray-800 dark:text-white/90">{schedule.slump_at_site}</p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                One way Km from Mother Plant
              </h4>
              <p className="text-base text-gray-800 dark:text-white/90">{schedule.mother_plant_km}</p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Floor Height</h4>
              <p className="text-base text-gray-800 dark:text-white/90">{schedule.floor_height}</p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">RMC Grade</h4>
              <p className="text-base text-gray-800 dark:text-white/90">
                {schedule.concreteGrade && `M ${schedule.concreteGrade}`}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Total Qty Pumped in m³</h4>
              <p className="text-base text-gray-800 dark:text-white/90">{schedule.input_params.quantity} m³</p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Pre-Start Time (mins) (A)</h4>
              <p className="text-base text-gray-800 dark:text-white/90">{schedule.input_params.buffer_time} min</p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Load Time (mins) (B)</h4>
              <p className="text-base text-gray-800 dark:text-white/90">{schedule.input_params.load_time} min</p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Onward Time (mins) (C)</h4>
              <p className="text-base text-gray-800 dark:text-white/90">{schedule.input_params.onward_time} min</p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Unloading Time (mins) (D)</h4>
              <p className="text-base text-gray-800 dark:text-white/90">{schedule.input_params.unloading_time} min</p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Return Time (mins) (E)</h4>
              <p className="text-base text-gray-800 dark:text-white/90">{schedule.input_params.return_time} min</p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Total TM Cycle Time (A+B+C+D+E)
              </h4>
              <p className="text-base text-gray-800 dark:text-white/90">{formatHoursAndMinutes(schedule.cycle_time)}</p>
            </div>
            {/* <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</h4>
              <Badge size="sm" color={schedule.status === "generated" ? "success" : "warning"}>
                {schedule.status}
              </Badge>
            </div> */}
          </div>
        </div>
        {/* TM Trip Distribution Card */}
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-md p-6 flex flex-col justify-start h-full">
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
                <table className="min-w-full text-xs border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800/30">
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

          {/* Model Toggle and Info */}
          {schedule.burst_table && schedule.burst_table[0] && (
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Schedule Model</h4>
                <button
                  type="button"
                  onClick={() => setUseBurstModel((v) => !v)}
                  className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    useBurstModel
                      ? "border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-300"
                      : "border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-300"
                  }`}
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor: useBurstModel ? "#2563eb" : "#9ca3af",
                    }}
                  />
                  {useBurstModel ? "Burst model" : "0 Wait model"}
                </button>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <p>
                  <strong>0 Wait model:</strong> Considers unloading time and assumes no wait between consecutive pours.
                </p>
                <p>
                  <strong>Burst model:</strong> Uses extra TMs as backup waiting system with calculated max wait limit
                  from user input.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Pump Details</h4>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-100/20 dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      No.
                    </TableCell>
                    {/* <TableCell
                      isHeader
                      className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Type
                    </TableCell> */}
                    <TableCell
                      isHeader
                      className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Start Time from Plant
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Site Reach Time
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Fixing Time (min)
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Pump Start Time
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Pumping Hours
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Pump End Time
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Removal Time (min)
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Site Leave Time
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Total Hours Engaged
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  <TableRow>
                    <TableCell className="px-3 py-4 text-start">
                      <span className="text-gray-800 dark:text-white/90">
                        {(() => {
                          const pump = schedule.available_pumps.find((pump) => pump.id === schedule.pump);
                          if (!pump) return "N/A";

                          // Color coding based on pump type
                          const isLinePump = schedule.pump_type === "line";
                          const bgColor = isLinePump ? "bg-blue-500" : "bg-green-500";

                          return (
                            <div
                              className={`flex w-fit rounded-md border-2 border-black shadow items-center gap-2 pr-2  ${bgColor}`}
                            >
                              <label
                                className={`flex flex-col justify-between bg-blue-700 rounded-l-sm p-2 text-[8px]`}
                              >
                                <span className="text-xs text-white">{isLinePump ? "LINE" : "BOOM"}</span>
                              </label>
                              <label className={`p-1 px-1 font-mono text-sm font-medium items-center text-black`}>
                                {pump.identifier}
                              </label>
                            </div>
                          );
                        })()}
                      </span>
                    </TableCell>
                    {/* <TableCell className="px-3 py-4 text-start">
                      <span className="text-gray-800 dark:text-white/90">{schedule.pump_type || "N/A"}</span>
                    </TableCell> */}
                    <TableCell className="px-3 py-4 text-start">
                      <span className="text-gray-500 dark:text-gray-400">
                        {calculatePumpStartTimeFromPlant(schedule, profile?.preferred_format)}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-4 text-start">
                      <span className="text-gray-500 dark:text-gray-400">
                        {calculatePumpSiteReachTime(schedule, profile?.preferred_format)}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-4 text-start">
                      <span className="text-gray-800 dark:text-white/90">
                        {schedule?.output_table?.length > 0 ? schedule.output_table[0].pump_start : "N/A"}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-4 text-start">
                      <span className="text-gray-500 dark:text-gray-400">
                        {schedule?.output_table?.length > 0
                          ? formatTimeByPreference(schedule.output_table[0].pump_start, profile?.preferred_format)
                          : "N/A"}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-4 text-start">
                      <span className="text-gray-800 dark:text-white/90">
                        {formatHoursAndMinutes(schedule.input_params.quantity / schedule.input_params.pumping_speed)}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-4 text-start">
                      <span className="text-gray-500 dark:text-gray-400">
                        {(() => {
                          if (!(schedule?.output_table?.length > 0)) return "N/A";
                          const pumpStart = new Date(schedule.output_table[0].pump_start);
                          const pumpingHours = schedule.input_params.quantity / schedule.input_params.pumping_speed;
                          const pumpEnd = new Date(pumpStart.getTime() + pumpingHours * 60 * 60 * 1000);
                          return formatTimeByPreference(pumpEnd, profile?.preferred_format);
                        })()}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-4 text-start">
                      <span className="text-gray-800 dark:text-white/90">
                        {schedule.input_params.pump_removal_time || "N/A"}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-4 text-start">
                      <span className="text-gray-500 dark:text-gray-400">
                        {(() => {
                          if (!(schedule?.output_table?.length > 0)) return "N/A";
                          const pumpStart = new Date(schedule.output_table[0].pump_start);
                          const pumpingHours = schedule.input_params.quantity / schedule.input_params.pumping_speed;
                          const pumpEnd = new Date(pumpStart.getTime() + pumpingHours * 60 * 60 * 1000);
                          const pumpSiteLeave = new Date(
                            pumpEnd.getTime() + schedule.input_params.pump_removal_time * 60 * 1000
                          );
                          return formatTimeByPreference(pumpSiteLeave, profile?.preferred_format);
                        })()}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-4 text-start">
                      <span className="text-gray-800 dark:text-white/90">
                        {(() => {
                          if (!(schedule?.output_table?.length > 0)) return "N/A";
                          const pumpStart = new Date(schedule.output_table[0].pump_start);
                          const pumpFixingTime = schedule.input_params.pump_fixing_time || 0;
                          const pumpOnwardTime = schedule.input_params.pump_onward_time || 0;
                          const pumpStartFromPlant = new Date(
                            pumpStart.getTime() - (pumpFixingTime + pumpOnwardTime) * 60 * 1000
                          );

                          const pumpingHours = schedule.input_params.quantity / schedule.input_params.pumping_speed;
                          const pumpEnd = new Date(pumpStart.getTime() + pumpingHours * 60 * 60 * 1000);
                          const pumpSiteLeave = new Date(
                            pumpEnd.getTime() + schedule.input_params.pump_removal_time * 60 * 1000
                          );

                          const totalHours =
                            (pumpSiteLeave.getTime() - pumpStartFromPlant.getTime()) / (1000 * 60 * 60);
                          return formatHoursAndMinutes(totalHours);
                        })()}
                      </span>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mt-3">
        <div className="">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
            Schedule Table - {useBurstModel ? "Burst Model" : "0 Wait Model"}
          </h4>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-100/20 dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
              <Table>
                <thead className="border-b border-gray-100 dark:border-white/[0.05]">
                  {/* Main header row with merged columns */}
                  {!useBurstModel ? (
                    <tr>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        Trip No
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        TM No
                      </th>
                      <th
                        colSpan={4}
                        className="px-2 py-2 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 border-x border-gray-200 dark:border-gray-700"
                      >
                        Plant
                      </th>
                      <th
                        colSpan={2}
                        className="px-2 py-2 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 border-x border-gray-200 dark:border-gray-700"
                      >
                        Pump - Unloading
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        Return Time
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        Cum. Volume
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        Cycle Time (min)
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        Cushion Time (min)
                      </th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        Trip No
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        TM No
                      </th>
                      <th
                        colSpan={4}
                        className="px-2 py-2 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 border-x border-gray-200 dark:border-gray-700"
                      >
                        Plant
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 border-x border-gray-200 dark:border-gray-700">
                        Site reach
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 border-x border-gray-200 dark:border-gray-700">
                        Waiting Time (min)
                      </th>
                      <th
                        colSpan={2}
                        className="px-2 py-2 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 border-x border-gray-200 dark:border-gray-700"
                      >
                        Pump - Unloading
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        Return Time
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        Queue
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        Cum. Volume
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        Cycle Time (min)
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        Cushion Time (min)
                      </th>
                    </tr>
                  )}
                  {/* Sub-header row with individual column names */}
                  {!useBurstModel ? (
                    <tr>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        #
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        #
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 border-l border-gray-200 dark:border-gray-700">
                        Name
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 border-r border-l border-gray-200 dark:border-gray-700">
                        Prepare Time
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 border-r border-l border-gray-200 dark:border-gray-700">
                        Load Time
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 border-r border-gray-200 dark:border-gray-700">
                        Start Time
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 border-l border-gray-200 dark:border-gray-700">
                        Start Time
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 border-r border-gray-200 dark:border-gray-700">
                        End Time
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        #
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        #
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        #
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        #
                      </th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        #
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        #
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 border-l border-gray-200 dark:border-gray-700">
                        Name
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 border-r border-l border-gray-200 dark:border-gray-700">
                        Prepare Time
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 border-r border-l border-gray-200 dark:border-gray-700">
                        Load Time
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 border-r border-gray-200 dark:border-gray-700">
                        Start Time
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 border-l border-gray-200 dark:border-gray-700">
                        Time
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 border-l border-gray-200 dark:border-gray-700">
                        #
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 border-l border-gray-200 dark:border-gray-700">
                        Start Time
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 border-r border-gray-200 dark:border-gray-700">
                        End Time
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        #
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        #
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        #
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        #
                      </th>
                    </tr>
                  )}
                </thead>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {(!useBurstModel
                    ? (schedule.output_table as unknown as TripRow[])
                    : ((schedule.burst_table || []) as unknown as TripRow[])
                  ).map((trip) => (
                    <TableRow key={trip.trip_no}>
                      <TableCell className="px-3 py-4 text-start">
                        <span className="text-gray-800 dark:text-white/90">{trip.trip_no}</span>
                      </TableCell>
                      <TableCell className="px-3 py-4 text-start">
                        <span className="text-gray-800 dark:text-white/90">
                          {(() => {
                            const source = !useBurstModel ? schedule.output_table : schedule.burst_table || [];
                            const tmTotalTrips = source.filter((t) => t.tm_id === trip.tm_id).length;
                            const tmTrips = source
                              .filter((t) => t.tm_id === trip.tm_id)
                              .sort((a, b) => a.trip_no - b.trip_no);
                            const currentTripIndex = tmTrips.findIndex((t) => t.trip_no === trip.trip_no) + 1;
                            return (
                              <>
                                <div className="flex w-fit rounded-md border-2 border-black bg-yellow-500 shadow items-center gap-2 pr-2">
                                  <label className="flex flex-col justify-between bg-blue-700 rounded-l-sm p-2 text-[8px] text-white">
                                    <span className="text-xs text-white-400">
                                      ({currentTripIndex}/{tmTotalTrips})
                                    </span>
                                  </label>
                                  <label className="p-1 px-1 font-mono text-sm font-medium items-center text-black">
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
                        <span className="text-gray-800 dark:text-white/90">
                          {trip.plant_buffer
                            ? formatTimeByPreference(trip.plant_buffer, profile?.preferred_format)
                            : "-"}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 py-4 text-start">
                        <span className="text-gray-800 dark:text-white/90">
                          {trip.plant_load ? formatTimeByPreference(trip.plant_load, profile?.preferred_format) : "-"}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 py-4 text-start">
                        <span className="text-gray-500 dark:text-gray-400">
                          {formatTimeByPreference(trip.plant_start, profile?.preferred_format)}
                        </span>
                      </TableCell>
                      {!useBurstModel ? (
                        <>
                          <TableCell className="px-3 py-4 text-start">
                            <span className="text-gray-500 dark:text-gray-400">
                              {trip.pump_start
                                ? formatTimeByPreference(trip.pump_start, profile?.preferred_format)
                                : "-"}
                            </span>
                          </TableCell>
                          <TableCell className="px-3 py-4 text-start">
                            <span className="text-gray-500 dark:text-gray-400">
                              {trip.unloading_time
                                ? formatTimeByPreference(trip.unloading_time, profile?.preferred_format)
                                : "-"}
                            </span>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="px-3 py-4 text-start">
                            <span className="text-gray-500 dark:text-gray-400">
                              {trip.site_reach
                                ? formatTimeByPreference(trip.site_reach, profile?.preferred_format)
                                : "-"}
                            </span>
                          </TableCell>
                          <TableCell className="px-3 py-4 text-start">
                            <span className="text-gray-800 dark:text-white/90">
                              {typeof trip.waiting_time === "number" ? trip.waiting_time : "-"}
                            </span>
                          </TableCell>
                          <TableCell className="px-3 py-4 text-start">
                            <span className="text-gray-500 dark:text-gray-400">
                              {trip.pump_start
                                ? formatTimeByPreference(trip.pump_start, profile?.preferred_format)
                                : "-"}
                            </span>
                          </TableCell>
                          <TableCell className="px-3 py-4 text-start">
                            <span className="text-gray-500 dark:text-gray-400">
                              {trip.unloading_time
                                ? formatTimeByPreference(trip.unloading_time, profile?.preferred_format)
                                : "-"}
                            </span>
                          </TableCell>
                        </>
                      )}
                      <TableCell className="px-3 py-4 text-start">
                        <span className="text-gray-500 dark:text-gray-400">
                          {trip.return ? formatTimeByPreference(trip.return, profile?.preferred_format) : "-"}
                        </span>
                      </TableCell>
                      {useBurstModel && (
                        <TableCell className="px-3 py-4 text-start">
                          <span className="text-gray-800 dark:text-white/90">
                            {typeof trip.queue === "number" ? trip.queue : "-"}
                          </span>
                        </TableCell>
                      )}
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
                          {typeof trip.cushion_time !== "undefined" && trip.cushion_time !== null
                            ? (trip.cushion_time / 60).toFixed(0)
                            : "-"}
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
          function formatOverallRange(trips: Schedule["output_table"], preferredFormat?: string) {
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
          function getTotalHours(trips: Schedule["output_table"]) {
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
              <table className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800/30">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800">
                    <th className="px-2 py-2 font-medium text-gray-700 dark:text-gray-200 text-left">S.No.</th>
                    <th className="px-2 py-2 font-medium text-gray-700 dark:text-gray-200 text-left">TM</th>
                    {Array.from({ length: maxTrips }).map((_, i) => (
                      <th key={i} className="px-2 py-2 font-medium text-gray-700 dark:text-gray-200 text-left">
                        Trip {i + 1}
                      </th>
                    ))}
                    <th className="px-2 py-2 font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 text-left">
                      Start-End Time
                    </th>
                    <th className="px-2 py-2 font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 text-left">
                      Total Hours
                    </th>
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
                        <td className="px-4 text-gray-800 dark:text-white/90 bg-gray-100 dark:bg-gray-800 py-2 text-left">
                          {overallRange}
                        </td>
                        <td className="px-4 text-gray-800 dark:text-white/90 bg-gray-100 dark:bg-gray-800 py-2 text-left">
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
                    <td className="px-2 py-2 text-center bg-gray-100 dark:bg-gray-800"></td>
                    <td className="px-4 py-2 text-left bg-gray-100 dark:bg-gray-800">
                      {avgTotalHours ? formatHoursAndMinutes(avgTotalHours) : "-"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

      {/* PLANT WISE TRIP DETAILS TABLE */}
      <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mt-3">
        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Plant Wise Trip Details</h4>
        {(() => {
          if (!schedule.output_table || schedule.output_table.length === 0) {
            return <div className="text-gray-500 dark:text-gray-400">No trip data available.</div>;
          }

          // Group trips by plant
          const plantTrips: Record<string, typeof schedule.output_table> = {};
          schedule.output_table.forEach((trip) => {
            const plantName = trip.plant_name || "Unknown Plant";
            if (!plantTrips[plantName]) plantTrips[plantName] = [];
            plantTrips[plantName].push(trip);
          });

          // Sort trips for each plant by load time
          Object.values(plantTrips).forEach((trips) =>
            trips.sort((a, b) => new Date(a.plant_load).getTime() - new Date(b.plant_load).getTime())
          );

          // Get all plant names
          const plantNames = Object.keys(plantTrips);

          return (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800/30">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800">
                    <th className="px-2 py-2 font-medium text-gray-700 dark:text-gray-200 text-left">Plant Name</th>
                    <th className="px-2 py-2 font-medium text-gray-700 dark:text-gray-200 text-left">Total Trips</th>
                    <th className="px-2 py-2 font-medium text-gray-700 dark:text-gray-200 text-left">First Load</th>
                    <th className="px-2 py-2 font-medium text-gray-700 dark:text-gray-200 text-left">Last Load</th>
                    <th className="px-2 py-2 font-medium text-gray-700 dark:text-gray-200 text-left">
                      Load Time Range
                    </th>
                    <th className="px-2 py-2 font-medium text-gray-700 dark:text-gray-200 text-left">TMs Used</th>
                  </tr>
                </thead>
                <tbody>
                  {plantNames.map((plantName) => {
                    const trips = plantTrips[plantName];
                    const firstLoad = trips[0]?.plant_load;
                    const lastLoad = trips[trips.length - 1]?.plant_load;

                    // Get unique TMs for this plant
                    const uniqueTMs = new Set(trips.map((trip) => trip.tm_no));

                    return (
                      <tr key={plantName} className="border-b border-gray-100 dark:border-gray-700">
                        <td className="px-2 py-2 text-gray-800 dark:text-white/90 font-medium">{plantName}</td>
                        <td className="px-2 py-2 text-gray-600 dark:text-gray-400">{trips.length}</td>
                        <td className="px-2 py-2 text-gray-600 dark:text-gray-400">
                          {firstLoad ? formatTimeByPreference(new Date(firstLoad), profile?.preferred_format) : "-"}
                        </td>
                        <td className="px-2 py-2 text-gray-600 dark:text-gray-400">
                          {lastLoad ? formatTimeByPreference(new Date(lastLoad), profile?.preferred_format) : "-"}
                        </td>
                        <td className="px-2 py-2 text-gray-600 dark:text-gray-400">
                          {formatHoursAndMinutes(
                            (new Date(lastLoad).getTime() - new Date(firstLoad).getTime()) / (1000 * 60) / 60
                          )}
                        </td>
                        <td className="px-2 py-2 text-gray-600 dark:text-gray-400">{uniqueTMs.size}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

      {/* Cancel Modal */}
      <Modal className="max-w-[500px] p-5" isOpen={isCancelModalOpen} onClose={() => setIsCancelModalOpen(false)}>
        <div className="p-6">
          <h4 className="font-semibold text-gray-800 mb-7 text-title-sm dark:text-white/90">Cancel Schedule</h4>
          <p className="mb-6 dark:text-white/90">Are you sure you want to cancel this schedule?</p>

          {/* Radio Group */}
          <div className="mb-6">
            <label className="block font-medium text-gray-700 dark:text-white/90 mb-2">
              Who wants to delete the schedule?
            </label>
            <div className="flex items-center gap-6">
              {Object.values(CanceledBy).map((option) => (
                <>
                  <Radio
                    id={`canceledBy-${option}`}
                    name="canceledBy"
                    value={option}
                    checked={canceledBy === option}
                    onChange={(value) => setCanceledBy(value as CanceledBy)}
                    label={option}
                  />
                </>
              ))}
            </div>
          </div>

          {/* Dropdown */}
          <div className="mb-6">
            <label className="block font-medium text-gray-700 dark:text-white/90 mb-2">Reason:</label>
            <select
              className="w-full rounded-md border border-gray-300 p-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white/90"
              value={reasonForCancel}
              onChange={(e) => setReasonForCancel(e.target.value as CancelReason)}
            >
              <option value="" disabled>
                Select a reason
              </option>
              {Object.values(CancelReason).map((option) => (
                <option key={option} value={option}>
                  {option
                    .replace(/_/g, " ")
                    .split(" ")
                    .reduce((acc, word) => acc + word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() + " ", "")
                    .trim()}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <Button onClick={() => setIsCancelModalOpen(false)} variant="outline">
              No
            </Button>
            <Button
              onClick={() => handleConfirmDelete(DeleteType.cancel)}
              variant="warning"
              disabled={deleteScheduleMutation.isPending}
            >
              {deleteScheduleMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <Spinner size="sm" />
                  <span>Canceling...</span>
                </div>
              ) : (
                "Yes"
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal className="max-w-[500px] p-5" isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}>
        <div className="p-6">
          <h4 className="font-semibold text-gray-800 mb-7 text-title-sm dark:text-white/90">Delete Schedule</h4>
          <p className="mb-6 dark:text-white/90">Are you sure you want to delete this schedule?</p>
          <div className="flex justify-end gap-4">
            <Button onClick={() => setIsDeleteModalOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button
              onClick={() => handleConfirmDelete(DeleteType.temporary)}
              variant="warning"
              disabled={deleteScheduleMutation.isPending}
            >
              {deleteScheduleMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <Spinner size="sm" />
                  <span>Deleting...</span>
                </div>
              ) : (
                "Delete"
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
