"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/useApiClient";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { Pencil, Trash2, Download, CopyX, ArrowUpDown } from "lucide-react";
import { formatTimeByPreference, formatHoursAndMinutes } from "@/lib/utils";
import { useProfile } from "@/hooks/useProfile";
import { useState } from "react";
import React from "react";
import ExcelJS from "exceljs";
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
    is_burst_model?: boolean;
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
  tm_overrule: number;
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

// Calculate pumping hours from schedule table and output table data
const calculatePumpingHoursFromSchedule = (schedule: Schedule): number => {
  if (!schedule.output_table || schedule.output_table.length === 0) {
    // Fallback to original calculation if no schedule data
    return schedule.input_params.quantity / schedule.input_params.pumping_speed;
  }

  // Get all pump start and end times from the output table
  const pumpStartTimes = schedule.output_table
    .map((trip) => trip.pump_start)
    .filter(Boolean)
    .map((time) => new Date(time));

  const pumpEndTimes = schedule.output_table
    .map((trip) => trip.unloading_time)
    .filter(Boolean)
    .map((time) => new Date(time));

  if (pumpStartTimes.length === 0 || pumpEndTimes.length === 0) {
    // Fallback to original calculation if no pump times
    return schedule.input_params.quantity / schedule.input_params.pumping_speed;
  }

  // Find the first pump start time and last pump end time
  const firstPumpStart = new Date(Math.min(...pumpStartTimes.map((d) => d.getTime())));
  const lastPumpEnd = new Date(Math.max(...pumpEndTimes.map((d) => d.getTime())));

  // Calculate total pumping duration in hours
  const pumpingDurationMs = lastPumpEnd.getTime() - firstPumpStart.getTime();
  const pumpingHours = pumpingDurationMs / (1000 * 60 * 60); // Convert to hours

  return pumpingHours;
};

// Compact DonutChart for Summary Card
const DonutChart = ({
  data,
  size = 200,
}: {
  data: { shortLabel: string; label: string; value: number; color: string }[];
  size?: number;
}) => {
  const center = size / 2;
  const radius = size * 0.5;
  const innerRadius = radius * 0.6;
  const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
  if (total === 0)
    return (
      <div className="flex items-center justify-center" style={{ height: size }}>
        <span className="text-xs text-gray-500 dark:text-gray-400">No data</span>
      </div>
    );
  let currentAngle = -Math.PI / 2;
  return (
    <div className="relative w-fit">
      <svg width={size} height={size} className="transform rotate-0">
        {data.map((item, index) => {
          const safeVal = item.value || 0;
          if (safeVal === 0) return null;
          const percentage = (safeVal / total) * 100;
          const angle = (safeVal / total) * 2 * Math.PI;
          const startAngle = currentAngle;
          const endAngle = currentAngle + angle;
          const x1 = center + radius * Math.cos(startAngle);
          const y1 = center + radius * Math.sin(startAngle);
          const x2 = center + radius * Math.cos(endAngle);
          const y2 = center + radius * Math.sin(endAngle);
          const x3 = center + innerRadius * Math.cos(endAngle);
          const y3 = center + innerRadius * Math.sin(endAngle);
          const x4 = center + innerRadius * Math.cos(startAngle);
          const y4 = center + innerRadius * Math.sin(startAngle);
          const largeArcFlag = angle > Math.PI ? 1 : 0;
          const pathData = [
            `M ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            `L ${x3} ${y3}`,
            `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}`,
            "Z",
          ].join(" ");
          const labelAngle = startAngle + angle / 2;
          const labelRadius = (radius + innerRadius) / 2;
          const labelX = center + labelRadius * Math.cos(labelAngle);
          const labelY = center + labelRadius * Math.sin(labelAngle);
          currentAngle = endAngle;
          return (
            <g key={index}>
              <path
                d={pathData}
                fill={item.color}
                stroke="#ffffff"
                strokeWidth="2"
                className="hover:opacity-80 transition-opacity cursor-pointer"
              />
              {percentage > 2 && (
                <>
                  <text
                    x={labelX}
                    y={labelY - 6}
                    textAnchor="middle"
                    fill="white"
                    fontSize={percentage < 8 ? percentage * 1.2 : "10"}
                    className="pointer-events-none"
                  >
                    {safeVal}min
                  </text>
                  <text
                    x={labelX}
                    y={labelY + 8}
                    textAnchor="middle"
                    fill="white"
                    fontSize={percentage < 8 ? percentage * 1.2 : "10"}
                    fontWeight="bold"
                    className="pointer-events-none"
                  >
                    {item.shortLabel}
                  </text>
                </>
              )}
            </g>
          );
        })}
        <text
          x={center}
          y={center - 4}
          textAnchor="middle"
          fill="#374151"
          fontSize="12"
          fontWeight="bold"
          className="pointer-events-none"
        >
          Total
        </text>
        <text
          x={center}
          y={center + 12}
          textAnchor="middle"
          fill="#374151"
          fontSize="13"
          fontWeight="bold"
          className="pointer-events-none"
        >
          {total} min
        </text>
      </svg>
    </div>
  );
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
  const [showGapRows, setShowGapRows] = useState(true);

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

  // Update useBurstModel when schedule data is loaded
  React.useEffect(() => {
    if (schedule?.input_params?.is_burst_model !== undefined) {
      setUseBurstModel(schedule.input_params.is_burst_model);
    }
  }, [schedule]);

  const handleExportExcel = async () => {
    if (!schedule) return;

    const workbook = new ExcelJS.Workbook();
    
    // Define styles
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF3B82F6' } },
      border: {
        top: { style: 'thin' as const, color: { argb: 'FF000000' } },
        left: { style: 'thin' as const, color: { argb: 'FF000000' } },
        bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
        right: { style: 'thin' as const, color: { argb: 'FF000000' } }
      },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const }
    };

    const subHeaderStyle = {
      font: { bold: true, color: { argb: 'FF1F2937' }, size: 11 },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFF3F4F6' } },
      border: {
        top: { style: 'thin' as const, color: { argb: 'FF000000' } },
        left: { style: 'thin' as const, color: { argb: 'FF000000' } },
        bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
        right: { style: 'thin' as const, color: { argb: 'FF000000' } }
      },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const }
    };

    const dataStyle = {
      font: { size: 10, color: { argb: 'FF374151' } },
      border: {
        top: { style: 'thin' as const, color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin' as const, color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin' as const, color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin' as const, color: { argb: 'FFE5E7EB' } }
      },
      alignment: { vertical: 'middle' as const }
    };

    const titleStyle = {
      font: { bold: true, size: 14, color: { argb: 'FF1F2937' } },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const }
    };

    // Determine which table to use based on current model
    const currentTable = useBurstModel && schedule.burst_table ? schedule.burst_table : schedule.output_table;

    // Create Summary Sheet
    const summarySheet = workbook.addWorksheet('Summary');
    
    // Add title
    summarySheet.mergeCells('A1:B1');
    summarySheet.getCell('A1').value = 'Concrete Pumping - Schedule Summary';
    summarySheet.getCell('A1').style = titleStyle;
    summarySheet.getRow(1).height = 25;

    // Add basic summary data (A3-B25)
    const basicSummaryData = [
      ["Scheduled Date", schedule.input_params.schedule_date
          ? new Date(schedule.input_params.schedule_date).toLocaleDateString(["en-GB"], {
            day: "2-digit", month: "2-digit", year: "2-digit",
          })
        : "-"],
      ["Pump Start Time at Site", schedule.input_params.pump_start
          ? new Date(schedule.input_params.pump_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "-"],
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
      ["Optimum Fleet: Non-Stop Pour", `${schedule.tm_count ?? "-"}`],
      ["TMs Additional", `${
          typeof schedule.tm_overrule === "number" && typeof schedule.tm_count === "number"
          ? schedule.tm_overrule - schedule.tm_count : 0
      }`],
      ["Total TM Required", `${schedule.tm_overrule ? schedule.tm_overrule : schedule.tm_count}`]
    ];

    // Add basic summary data to sheet
    let currentRow = 3;
    basicSummaryData.forEach((row) => {
      summarySheet.getRow(currentRow).values = row;
      summarySheet.getRow(currentRow).height = 20;
      
      // Style the row
      row.forEach((_, colIndex) => {
        const cell = summarySheet.getCell(currentRow, colIndex + 1);
        cell.style = dataStyle;
      });
      currentRow++;
    });

    // Helper functions for time calculations
    function formatOverallRange(trips: (Schedule["output_table"] | Schedule["burst_table"]) | undefined, preferredFormat?: string) {
      if (!trips || !trips.length) return "-";
      const starts = trips.map((t) => t.plant_start).filter(Boolean).map((t) => new Date(t));
      const ends = trips.map((t) => t.return).filter(Boolean).map((t) => new Date(t));
      if (!starts.length || !ends.length) return "-";
      const minStart = new Date(Math.min(...starts.map((d) => d.getTime())));
      const maxEnd = new Date(Math.max(...ends.map((d) => d.getTime())));
      const sTime = formatTimeByPreference(minStart, preferredFormat);
      const eTime = formatTimeByPreference(maxEnd, preferredFormat);
      return `${sTime} - ${eTime}`;
    }

    function getTotalHours(trips: (Schedule["output_table"] | Schedule["burst_table"]) | undefined) {
      if (!trips || !trips.length) return 0;
      const starts = trips.map((t) => t.plant_start).filter(Boolean).map((t) => new Date(t));
      const ends = trips.map((t) => t.return).filter(Boolean).map((t) => new Date(t));
      if (!starts.length || !ends.length) return 0;
      const minStart = new Date(Math.min(...starts.map((d) => d.getTime())));
      const maxEnd = new Date(Math.max(...ends.map((d) => d.getTime())));
      return (maxEnd.getTime() - minStart.getTime()) / (1000 * 60 * 60);
    }

    // Add Pump Details section (D3-K5)
    if (schedule.output_table && schedule.output_table.length > 0) {
      const preferred = profile?.preferred_format;
      const pump = schedule.available_pumps.find((p) => p.id === schedule.pump);
      const pumpIdentifier = pump ? pump.identifier : "N/A";
      const pumpStartFromPlant = calculatePumpStartTimeFromPlant(schedule, preferred);
      const siteReachTime = calculatePumpSiteReachTime(schedule, preferred);
      const pumpStart = schedule.output_table[0]?.pump_start;
      const pumpStartTime = pumpStart ? formatTimeByPreference(pumpStart, preferred) : "N/A";
      const pumpingHours = calculatePumpingHoursFromSchedule(schedule);
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

      // Merge cells for Pump Details header (D3:K3)
      summarySheet.mergeCells('D3:M3');
      const pumpDetailsHeaderCell = summarySheet.getCell('D3');
      pumpDetailsHeaderCell.value = "Pump Details";
      pumpDetailsHeaderCell.style = { ...headerStyle, font: { ...headerStyle.font, size: 11 } };
      
      // Add pump details headers (row 4)
      const pumpDetailsHeaders = [
        "Pump", "Start Time from Plant", "Site Reach Time", "Fixing Time (min)",
        "Pump Start Time", "Pumping Hours", "Pump End Time", "Removal Time (min)",
        "Site Leave Time", "Total Hours Engaged"
      ];
      
      pumpDetailsHeaders.forEach((header, colIndex) => {
        const cell = summarySheet.getCell(4, colIndex + 4); // Start from column D (4)
        cell.value = header;
        cell.style = subHeaderStyle;
      });
      
      // Add pump details data (row 5)
      const pumpDetailsData = [
        pumpIdentifier, pumpStartFromPlant, siteReachTime,
        schedule.input_params.pump_fixing_time || 0, pumpStartTime,
        formatHoursAndMinutes(pumpingHours), pumpEndTime,
        schedule.input_params.pump_removal_time || 0, siteLeaveTime, totalHoursEngaged
      ];
      
      pumpDetailsData.forEach((data, colIndex) => {
        const cell = summarySheet.getCell(5, colIndex + 4); // Start from column D (4)
        cell.value = String(data);
        cell.style = dataStyle;
      });
    }

    // Add TM Trip Distribution section (D7-G11)
    if (currentTable && currentTable.length > 0) {
      const tmTripCounts: Record<string, number> = {};
      currentTable.forEach((trip) => {
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
        .map(([trips, tmCount], idx) => [String(idx + 1), String(Number(tmCount)), String(Number(trips)), String(Number(tmCount) * Number(trips))]);
      const totalTMs = Object.keys(tmTripCounts).length;
      const totalTrips = currentTable.length;

      // Merge cells for TM Trip Distribution header (D7:G7)
      summarySheet.mergeCells('D7:G7');
      const tmTripHeaderCell = summarySheet.getCell('D7');
      tmTripHeaderCell.value = "TM Trip Distribution";
      tmTripHeaderCell.style = { ...headerStyle, font: { ...headerStyle.font, size: 11 } };
      
      // Add TM Trip Distribution headers (row 8)
      const tmTripHeaders = ["Sl. No", "NO OF TMs (A)", "NO OF TRIPS/TM (B)", "TOTAL TRIPS (A) x (B)"];
      tmTripHeaders.forEach((header, colIndex) => {
        const cell = summarySheet.getCell(8, colIndex + 4); // Start from column D (4)
        cell.value = header;
        cell.style = subHeaderStyle;
      });
      
      // Add TM Trip Distribution data (rows 9-10)
      rows.forEach((row, rowIndex) => {
        row.forEach((data, colIndex) => {
          const cell = summarySheet.getCell(9 + rowIndex, colIndex + 4); // Start from column D (4)
          cell.value = data;
          cell.style = dataStyle;
        });
      });
      
      // Add total row (row 11)
      const totalRow = ["TOTAL", String(totalTMs), "", String(totalTrips)];
      totalRow.forEach((data, colIndex) => {
        const cell = summarySheet.getCell(11, colIndex + 4); // Start from column D (4)
        cell.value = data;
        cell.style = { ...dataStyle, font: { ...dataStyle.font, bold: true } };
      });
    }

    // Add TM Wise Trip Details section (D13-L19)
    if (currentTable && currentTable.length > 0) {
      const preferred = profile?.preferred_format;
      const tmTrips: Record<string, TripRow[]> = {};
      currentTable.forEach((trip) => {
        if (!tmTrips[trip.tm_id]) tmTrips[trip.tm_id] = [];
        tmTrips[trip.tm_id].push(trip as TripRow);
      });
      Object.values(tmTrips).forEach((trips) => {
        if (trips) trips.sort((a, b) => a.trip_no - b.trip_no);
      });
      const tmIds = Object.keys(tmTrips);
      const maxTrips = Math.max(...Object.values(tmTrips).map((trips) => trips?.length || 0));
      const tmIdToIdentifier: Record<string, string> = {};
      currentTable.forEach((trip) => {
        if (trip.tm_id && trip.tm_no) tmIdToIdentifier[trip.tm_id] = trip.tm_no;
      });

      // Merge cells for TM Wise Trip Details header (D13:L13)
      summarySheet.mergeCells('D13:L13');
      const tmWiseHeaderCell = summarySheet.getCell('D13');
      tmWiseHeaderCell.value = "TM Wise Trip Details";
      tmWiseHeaderCell.style = { ...headerStyle, font: { ...headerStyle.font, size: 11 } };
      
      // Add TM Wise Trip Details headers (row 14)
      const header = [
        "S.No.", "TM", ...Array.from({ length: maxTrips }, (_, i) => `Trip ${i + 1}`),
        "Start-End Time", "Total Hours"
      ];
      header.forEach((headerText, colIndex) => {
        const cell = summarySheet.getCell(14, colIndex + 4); // Start from column D (4)
        cell.value = headerText;
        cell.style = subHeaderStyle;
      });

      // Add TM Wise Trip Details data (rows 15-18)
      tmIds.forEach((tmId, index) => {
        const trips = tmTrips[tmId];
        if (!trips) return;

        const tripTimes = Array.from({ length: maxTrips }).map((_, i) => {
          const trip = trips?.[i];
          return trip
            ? `${formatTimeByPreference(trip.plant_start, preferred)} - ${formatTimeByPreference(trip.return, preferred)}`
            : "-";
        });
        const overallRange = formatOverallRange(trips);
        const totalHours = getTotalHours(trips);
        
        const rowData = [
          String(index + 1), tmIdToIdentifier[tmId] || tmId, ...tripTimes,
          overallRange, totalHours ? formatHoursAndMinutes(totalHours) : "-"
        ];
        
        rowData.forEach((data, colIndex) => {
          const cell = summarySheet.getCell(15 + index, colIndex + 4); // Start from column D (4)
          cell.value = data;
          cell.style = dataStyle;
        });
      });

      // Add average row (row 19)
      const totalHoursArr = tmIds.map((tmId) => getTotalHours(tmTrips[tmId]));
      const avgTotalHours = totalHoursArr.length ? totalHoursArr.reduce((a, b) => a + b, 0) / totalHoursArr.length : 0;
      const avgRow = [
        "Avg", "", ...Array.from({ length: maxTrips }).map(() => ""),
        "", avgTotalHours ? formatHoursAndMinutes(avgTotalHours) : "-"
      ];
      avgRow.forEach((data, colIndex) => {
        const cell = summarySheet.getCell(19, colIndex + 4); // Start from column D (4)
        cell.value = data;
        cell.style = { ...dataStyle, font: { ...dataStyle.font, bold: true } };
      });
    }

    // Set column widths - all table columns to 17
    summarySheet.getColumn(1).width = 30; // A - Field names
    summarySheet.getColumn(2).width = 25; // B - Values
    summarySheet.getColumn(3).width = 17; // C
    summarySheet.getColumn(4).width = 17; // D
    summarySheet.getColumn(5).width = 20; // E
    summarySheet.getColumn(6).width = 19; // F
    summarySheet.getColumn(7).width = 19; // G
    summarySheet.getColumn(8).width = 17; // H
    summarySheet.getColumn(9).width = 17; // I
    summarySheet.getColumn(10).width = 17; // J
    summarySheet.getColumn(11).width = 19; // K
    summarySheet.getColumn(12).width = 17; // L
    summarySheet.getColumn(13).width = 19; // M

    // Create Schedule Sheet
    if (currentTable && currentTable.length > 0) {
      const scheduleSheet = workbook.addWorksheet('Schedule');
      const preferred = profile?.preferred_format;

      // Add title
      const sheetTitle = useBurstModel ? "Schedule (Burst Model)" : "Schedule (0 Wait Model)";
      scheduleSheet.mergeCells('A1:O1');
      scheduleSheet.getCell('A1').value = sheetTitle;
      scheduleSheet.getCell('A1').style = titleStyle;
      scheduleSheet.getRow(1).height = 25;

      // Schedule table headers
      const scheduleHeader = useBurstModel
        ? [
            "Trip No", "TM No", "Plant - Name", "Plant - Prepare Time", "Plant - Load Time",
            "Plant - Start Time", "Site Reach", "TM Waiting at site (min)", "Pump - Start Time",
            "Pump - End Time", "Return Time", "TM Queue at Site", "Cum. Volume",
            "Cycle Time (min)", "Cushion Time (min)"
          ]
        : [
            "Trip No", "TM No", "Plant - Name", "Plant - Prepare Time", "Plant - Load Time",
            "Plant - Start Time", "Pump - Start Time", "Pump - End Time", "Return Time",
            "Cum. Volume", "Cycle Time (min)", "Cushion Time (min)"
          ];

      // Add headers
      scheduleSheet.getRow(3).values = scheduleHeader;
      scheduleSheet.getRow(3).height = 25;
      scheduleHeader.forEach((_, colIndex) => {
        const cell = scheduleSheet.getCell(3, colIndex + 1);
        cell.style = subHeaderStyle;
      });

      // Add data rows
      let dataRow = 4;
      const scheduleRows = currentTable.map((trip) => {
        const baseRow = [
          trip.trip_no, trip.tm_no, trip.plant_name ? trip.plant_name : "N / A",
          trip.plant_buffer ? formatTimeByPreference(trip.plant_buffer, preferred) : "-",
          trip.plant_load ? formatTimeByPreference(trip.plant_load, preferred) : "-",
          formatTimeByPreference(trip.plant_start, preferred)
        ];

        if (useBurstModel) {
          const burstTrip = trip as TripRow;
          baseRow.push(
            burstTrip.site_reach ? formatTimeByPreference(burstTrip.site_reach, preferred) : "-",
            typeof burstTrip.waiting_time === "number" ? burstTrip.waiting_time : "-",
            trip.pump_start ? formatTimeByPreference(trip.pump_start, preferred) : "-",
            trip.unloading_time ? formatTimeByPreference(trip.unloading_time, preferred) : "-",
            trip.return ? formatTimeByPreference(trip.return, preferred) : "-",
            typeof burstTrip.queue === "number" ? burstTrip.queue.toFixed(2) : "-",
            `${trip.completed_capacity} m³`,
            typeof trip.cycle_time !== "undefined" ? (trip.cycle_time / 60).toFixed(2) : "-",
            typeof trip.cushion_time !== "undefined" && trip.cushion_time !== null
              ? Math.max(0, trip.cushion_time / 60).toFixed(0) : "-"
          );
        } else {
          baseRow.push(
            trip.pump_start ? formatTimeByPreference(trip.pump_start, preferred) : "-",
            trip.unloading_time ? formatTimeByPreference(trip.unloading_time, preferred) : "-",
            trip.return ? formatTimeByPreference(trip.return, preferred) : "-",
            `${trip.completed_capacity} m³`,
            typeof trip.cycle_time !== "undefined" ? (trip.cycle_time / 60).toFixed(2) : "-",
            typeof trip.cushion_time !== "undefined" && trip.cushion_time !== null
              ? Math.max(0, trip.cushion_time / 60).toFixed(0) : "-"
          );
        }
        return baseRow;
      });

      // Handle gap rows for burst model
      let finalScheduleRows = scheduleRows;
      if (useBurstModel && showGapRows) {
        const rowsData = ((schedule.burst_table || []) as unknown as TripRow[])
          .slice().sort((a, b) => a.trip_no - b.trip_no);
        const getGapMinutes = (prev: TripRow | undefined, next: TripRow | undefined) => {
          if (!prev || !next) return null;
          const prevTime = prev.plant_buffer || prev.plant_load || prev.plant_start;
          const nextTime = next.plant_buffer || next.plant_load || next.plant_start;
          if (!prevTime || !nextTime) return null;
          const a = new Date(prevTime).getTime();
          const b = new Date(nextTime).getTime();
          if (isNaN(a) || isNaN(b)) return null;
          const diff = Math.round((b - a) / (1000 * 60));
          return diff >= 0 ? diff : null;
        };

        const interleaved: (string | number)[][] = [];
        for (let i = 0; i < rowsData.length; i++) {
          interleaved.push(scheduleRows[i]);
          if (i < rowsData.length - 1) {
            const gap = getGapMinutes(rowsData[i], rowsData[i + 1]);
            if (gap !== null) {
              const gapRow = new Array(scheduleHeader.length).fill("") as (string | number)[];
              gapRow[3] = `${gap} min`;
              interleaved.push(gapRow);
            }
          }
        }
        finalScheduleRows = interleaved;
      }

      // Add data rows to sheet
      finalScheduleRows.forEach((row) => {
        scheduleSheet.getRow(dataRow).values = row;
        scheduleSheet.getRow(dataRow).height = 20;
        
        // Style the row
        row.forEach((_, colIndex) => {
          const cell = scheduleSheet.getCell(dataRow, colIndex + 1);
          if (typeof row[3] === "string" && row[3].includes("min") && row[3] !== "-") {
            // Gap row styling
            cell.style = {
              ...dataStyle,
              font: { ...dataStyle.font, color: { argb: 'FFDC2626' } },
              fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFEF2F2' } }
            };
          } else {
            cell.style = dataStyle;
          }
        });
        dataRow++;
      });

      // Set column widths for schedule sheet
      scheduleHeader.forEach((_, colIndex) => {
        const column = scheduleSheet.getColumn(colIndex + 1);
        if (colIndex === 0 || colIndex === 1) column.width = 10; // Trip No, TM No
        else if (colIndex === 2) column.width = 15; // Plant Name
        else if (colIndex === 3) column.width = 20; // Plant Name
        else if (colIndex === 4 || colIndex === 5) column.width = 18; // Time columns
        else if (colIndex === 6 && useBurstModel) column.width = 15; // Site Reach
        else if (colIndex === 7 && useBurstModel) column.width = 23; // Waiting time
        else if (colIndex === 8 || colIndex === 9) column.width = 18; // Pump times
        else if (colIndex === 10) column.width = 15; // Return time
        else if (colIndex === 11 && useBurstModel) column.width = 19; // Queue
        else if (colIndex === 12 || (colIndex === 11 && !useBurstModel)) column.width = 19; // Volume
        else column.width = 18; // Other columns
      });
    }

    // Save the workbook
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${schedule.schedule_no}-${"pumping-schedule"}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
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
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-xl p-6 flex flex-col justify-start h-full">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
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
            {/* Compact cycle-time pie chart and fleet sizing */}

            {/* <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</h4>
              <Badge size="sm" color={schedule.status === "generated" ? "success" : "warning"}>
                {schedule.status}
              </Badge>
            </div> */}
          </div>
        </div>
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-xl p-6 flex flex-col justify-start h-full">
          {(() => {
            const buffer = schedule.input_params.buffer_time || 0;
            const load = schedule.input_params.load_time || 0;
            const onward = schedule.input_params.onward_time || 0;
            const unload = schedule.input_params.unloading_time || 0;
            const ret = schedule.input_params.return_time || 0;
            const cycleTimeData = [
              { label: "Pre-Start", shortLabel: "Pre-Start", value: buffer, color: "#3b82f6" },
              { label: "Loading", shortLabel: "Load", value: load, color: "#8b5cf6" },
              { label: "Onward Journey", shortLabel: "Onward", value: onward, color: "#f59e0b" },
              { label: "TM Unloading", shortLabel: "Unload", value: unload, color: "#10b981" },
              { label: "Return Journey", shortLabel: "Return", value: ret, color: "#ef4444" },
            ];
            const tmCountBase = typeof schedule.tm_count === "number" ? schedule.tm_count : 0;
            const tmOverrule = typeof schedule.tm_overrule === "number" ? schedule.tm_overrule : undefined;
            const additional = typeof tmOverrule === "number" ? Math.max(0, tmOverrule - tmCountBase) : 0;
            const totalRequired = typeof tmOverrule === "number" && tmOverrule > 0 ? tmOverrule : tmCountBase;
            return (
              <div className="grid grid-cols-1 gap-6 items-end justify-between h-full">
                <div className="flex flex-row gap-4 items-start justify-between">
                  {/* Legend */}
                  <div className="flex flex-col gap-2 mt-2">
                    {cycleTimeData.map((item) => (
                      <div key={item.label} className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                        <span className="text-xs text-gray-700 dark:text-gray-300">{item.label}</span>
                      </div>
                    ))}
                    <div className="mt-4">
                      {" "}
                      <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Total TM Cycle Time
                      </h4>{" "}
                      <p className="text-base text-gray-800 dark:text-white/90">
                        {" "}
                        {formatHoursAndMinutes(schedule.cycle_time)}{" "}
                      </p>{" "}
                    </div>
                  </div>

                  {/* Donut Chart */}
                  <DonutChart data={cycleTimeData} size={220} />
                </div>

                {/* Fleet sizing */}
                <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-3 py-2">
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Fleet Sizing</h4>

                  <div className="flex items-center justify-between py-1 border-b border-blue-200/60 dark:border-blue-800/60">
                    <span className="text-xs font-medium text-gray-900 dark:text-white">Optimum Fleet</span>
                    <span className="text-xs font-bold text-gray-900 dark:text-white">{tmCountBase || "-"}</span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-blue-200/60 dark:border-blue-800/60">
                    <span className="text-xs font-medium text-gray-900 dark:text-white">TMs Additional</span>
                    <span className="text-xs font-bold text-gray-900 dark:text-white">{additional}</span>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-xs font-semibold text-gray-900 dark:text-white">Total TM Required</span>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{totalRequired || "-"}</span>
                  </div>
                </div>
              </div>
            );
          })()}
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
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {useBurstModel ? (
                      <div className={`px-2.5 py-1 text-xs rounded border ${"bg-blue-600 text-white border-blue-600"}`}>
                        Burst
                      </div>
                    ) : (
                      <div className={`px-2.5 py-1 text-xs rounded border ${"bg-blue-600 text-white border-blue-600"}`}>
                        0 Wait
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                {useBurstModel ? (
                  <p>
                    <strong>Burst model:</strong> Uses extra TMs as backup waiting system with calculated max wait limit
                    from user input.
                  </p>
                ) : (
                  <p>
                    <strong>0 Wait model:</strong> Considers unloading time and assumes no wait between consecutive
                    pours.
                  </p>
                )}
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
                    <TableCell className="px-2 py-4 text-start">
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
                              <label
                                className={`p-1 px-1 font-mono text-sm font-medium items-center ${
                                  isLinePump ? "text-white" : "text-black"
                                } `}
                              >
                                {pump.identifier}
                              </label>
                            </div>
                          );
                        })()}
                      </span>
                    </TableCell>
                    {/* <TableCell className="px-2 py-4 text-start">
                      <span className="text-gray-800 dark:text-white/90">{schedule.pump_type || "N/A"}</span>
                    </TableCell> */}
                    <TableCell className="px-2 py-4 text-start">
                      <span className="text-gray-500 dark:text-gray-400">
                        {calculatePumpStartTimeFromPlant(schedule, profile?.preferred_format)}
                      </span>
                    </TableCell>
                    <TableCell className="px-2 py-4 text-start">
                      <span className="text-gray-500 dark:text-gray-400">
                        {calculatePumpSiteReachTime(schedule, profile?.preferred_format)}
                      </span>
                    </TableCell>
                    <TableCell className="px-2 py-4 text-start">
                      <span className="text-gray-800 dark:text-white/90">
                        {schedule?.input_params.pump_fixing_time ? schedule?.input_params.pump_fixing_time : "N/A"}
                      </span>
                    </TableCell>
                    <TableCell className="px-2 py-4 text-start">
                      <span className="text-gray-500 dark:text-gray-400">
                        {schedule?.output_table?.length > 0
                          ? formatTimeByPreference(schedule.output_table[0].pump_start, profile?.preferred_format)
                          : "N/A"}
                      </span>
                    </TableCell>
                    <TableCell className="px-2 py-4 text-start">
                      <span className="text-gray-800 dark:text-white/90">
                        {formatHoursAndMinutes(calculatePumpingHoursFromSchedule(schedule))}
                      </span>
                    </TableCell>
                    <TableCell className="px-2 py-4 text-start">
                      <span className="text-gray-500 dark:text-gray-400">
                        {(() => {
                          if (!(schedule?.output_table?.length > 0)) return "N/A";
                          const pumpStart = new Date(schedule.output_table[0].pump_start);
                          const pumpingHours = calculatePumpingHoursFromSchedule(schedule);
                          const pumpEnd = new Date(pumpStart.getTime() + pumpingHours * 60 * 60 * 1000);
                          return formatTimeByPreference(pumpEnd, profile?.preferred_format);
                        })()}
                      </span>
                    </TableCell>
                    <TableCell className="px-2 py-4 text-start">
                      <span className="text-gray-800 dark:text-white/90">
                        {schedule.input_params.pump_removal_time || "N/A"}
                      </span>
                    </TableCell>
                    <TableCell className="px-2 py-4 text-start">
                      <span className="text-gray-500 dark:text-gray-400">
                        {(() => {
                          if (!(schedule?.output_table?.length > 0)) return "N/A";
                          const pumpStart = new Date(schedule.output_table[0].pump_start);
                          const pumpingHours = calculatePumpingHoursFromSchedule(schedule);
                          const pumpEnd = new Date(pumpStart.getTime() + pumpingHours * 60 * 60 * 1000);
                          const pumpSiteLeave = new Date(
                            pumpEnd.getTime() + schedule.input_params.pump_removal_time * 60 * 1000
                          );
                          return formatTimeByPreference(pumpSiteLeave, profile?.preferred_format);
                        })()}
                      </span>
                    </TableCell>
                    <TableCell className="px-2 py-4 text-start">
                      <span className="text-gray-800 dark:text-white/90">
                        {(() => {
                          if (!(schedule?.output_table?.length > 0)) return "N/A";
                          const pumpStart = new Date(schedule.output_table[0].pump_start);
                          const pumpFixingTime = schedule.input_params.pump_fixing_time || 0;
                          const pumpOnwardTime = schedule.input_params.pump_onward_time || 0;
                          const pumpStartFromPlant = new Date(
                            pumpStart.getTime() - (pumpFixingTime + pumpOnwardTime) * 60 * 1000
                          );

                          const pumpingHours = calculatePumpingHoursFromSchedule(schedule);
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
              .map((t) => t.plant_buffer)
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
              .map((t) => t.plant_buffer)
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
                                    trip.plant_buffer,
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

      <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mt-3">
        <div className="">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Schedule Table - {useBurstModel ? "Burst Model" : "0 Wait Model"}
            </h4>
            {useBurstModel && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600 dark:text-gray-400">Show Gap Rows</label>
                <button
                  type="button"
                  onClick={() => setShowGapRows(!showGapRows)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    showGapRows ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      showGapRows ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            )}
          </div>
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
                        className="px-2 py-2 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 truncate border-x border-gray-200 dark:border-gray-700"
                      >
                        Plant
                      </th>
                      <th
                        colSpan={2}
                        className="px-2 py-2 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 truncate border-x border-gray-200 dark:border-gray-700"
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
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 truncate ">
                        Trip No
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        TM No
                      </th>
                      <th
                        colSpan={4}
                        className="px-2 py-2 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 truncate border-x border-gray-200 dark:border-gray-700"
                      >
                        Plant
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 truncate border-x border-gray-200 dark:border-gray-700">
                        Site reach
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 truncate border-x border-gray-200 dark:border-gray-700">
                        TM Waiting <br></br>at Site (min)
                      </th>
                      <th
                        colSpan={2}
                        className="px-2 py-2 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400 truncate border-x border-gray-200 dark:border-gray-700"
                      >
                        Pump - Unloading
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        Return Time
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        TM Queue at Site
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
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 truncate border-l border-gray-200 dark:border-gray-700">
                        Name
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 truncate border-r border-l border-gray-200 dark:border-gray-700">
                        Prepare Time
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 truncate border-r border-l border-gray-200 dark:border-gray-700">
                        Load Time
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 truncate border-r border-gray-200 dark:border-gray-700">
                        Start Time
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 truncate border-l border-gray-200 dark:border-gray-700">
                        Start Time
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 truncate border-r border-gray-200 dark:border-gray-700">
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
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 truncate border-l border-gray-200 dark:border-gray-700">
                        Name
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 truncate border-r border-l border-gray-200 dark:border-gray-700">
                        Prepare Time
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 truncate border-r border-l border-gray-200 dark:border-gray-700">
                        Load Time
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 truncate border-r border-gray-200 dark:border-gray-700">
                        Start Time
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 truncate border-l border-gray-200 dark:border-gray-700">
                        Time
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 truncate border-l border-gray-200 dark:border-gray-700">
                        #
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 truncate border-l border-gray-200 dark:border-gray-700">
                        Start Time
                      </th>
                      <th className="px-2 py-2 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 truncate border-r border-gray-200 dark:border-gray-700">
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
                  {(() => {
                    const rows = (
                      !useBurstModel
                        ? (schedule.output_table as unknown as TripRow[])
                        : ((schedule.burst_table || []) as unknown as TripRow[])
                    ).sort((a, b) => a.trip_no - b.trip_no);

                    const getGapMinutes = (prev: TripRow | undefined, next: TripRow | undefined) => {
                      if (!prev || !next) return null;
                      const prevTime = prev.plant_buffer || prev.plant_load || prev.plant_start;
                      const nextTime = next.plant_buffer || next.plant_load || next.plant_start;
                      if (!prevTime || !nextTime) return null;
                      const a = new Date(prevTime).getTime();
                      const b = new Date(nextTime).getTime();
                      if (isNaN(a) || isNaN(b)) return null;
                      const diff = Math.round((b - a) / (1000 * 60));
                      return diff >= 0 ? diff : null;
                    };

                    const rendered: React.ReactNode[] = [];
                    rows.forEach((trip, idx) => {
                      const keyBase = `${trip.tm_id}-${trip.trip_no}`;
                      rendered.push(
                        <TableRow key={keyBase}>
                          <TableCell className="px-2 py-4 text-start">
                            <span className="text-gray-800 dark:text-white/90">{trip.trip_no}</span>
                          </TableCell>
                          <TableCell className="px-2 py-4 text-start">
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
                                      <label className="p-1 px-1 font-mono text-sm font-medium items-center text-black truncate">
                                        {trip.tm_no}
                                      </label>
                                    </div>
                                  </>
                                );
                              })()}
                            </span>
                          </TableCell>
                          <TableCell className="px-2 py-2 text-start">
                            <span className="text-gray-800 dark:text-white/90 truncate text-sm">
                              {trip.plant_name ? trip.plant_name : "N / A"}
                            </span>
                          </TableCell>
                          <TableCell className="px-2 py-4 text-start">
                            <span className="text-gray-800 dark:text-white/90">
                              {trip.plant_buffer
                                ? formatTimeByPreference(trip.plant_buffer, profile?.preferred_format)
                                : "-"}
                            </span>
                          </TableCell>
                          <TableCell className="px-2 py-4 text-start">
                            <span className="text-gray-800 dark:text-white/90">
                              {trip.plant_load
                                ? formatTimeByPreference(trip.plant_load, profile?.preferred_format)
                                : "-"}
                            </span>
                          </TableCell>
                          <TableCell className="px-2 py-4 text-start">
                            <span className="text-gray-500 dark:text-gray-400">
                              {formatTimeByPreference(trip.plant_start, profile?.preferred_format)}
                            </span>
                          </TableCell>
                          {!useBurstModel ? (
                            <>
                              <TableCell className="px-2 py-4 text-start">
                                <span className="text-gray-500 dark:text-gray-400">
                                  {trip.pump_start
                                    ? formatTimeByPreference(trip.pump_start, profile?.preferred_format)
                                    : "-"}
                                </span>
                              </TableCell>
                              <TableCell className="px-2 py-4 text-start">
                                <span className="text-gray-500 dark:text-gray-400">
                                  {trip.unloading_time
                                    ? formatTimeByPreference(trip.unloading_time, profile?.preferred_format)
                                    : "-"}
                                </span>
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell className="px-2 py-4 text-start">
                                <span className="text-gray-500 dark:text-gray-400">
                                  {trip.site_reach
                                    ? formatTimeByPreference(trip.site_reach, profile?.preferred_format)
                                    : "-"}
                                </span>
                              </TableCell>
                              <TableCell className="px-2 py-4 text-start">
                                <span className="text-red-600 dark:text-red-400 ">
                                  {typeof trip.waiting_time === "number" ? trip.waiting_time : "-"}
                                </span>
                              </TableCell>
                              <TableCell className="px-2 py-4 text-start">
                                <span className="text-gray-500 dark:text-gray-400">
                                  {trip.pump_start
                                    ? formatTimeByPreference(trip.pump_start, profile?.preferred_format)
                                    : "-"}
                                </span>
                              </TableCell>
                              <TableCell className="px-2 py-4 text-start">
                                <span className="text-gray-500 dark:text-gray-400">
                                  {trip.unloading_time
                                    ? formatTimeByPreference(trip.unloading_time, profile?.preferred_format)
                                    : "-"}
                                </span>
                              </TableCell>
                            </>
                          )}
                          <TableCell className="px-2 py-4 text-start">
                            <span className="text-gray-500 dark:text-gray-400">
                              {trip.return ? formatTimeByPreference(trip.return, profile?.preferred_format) : "-"}
                            </span>
                          </TableCell>
                          {useBurstModel && (
                            <TableCell className="px-2 py-4 text-start">
                              <span className="text-red-600 dark:text-red-400 ">
                                {typeof trip.queue === "number" ? trip.queue.toFixed(2) : "-"}
                              </span>
                            </TableCell>
                          )}
                          <TableCell className="px-2 py-4 text-start">
                            <span className="text-gray-800 dark:text-white/90">{trip.completed_capacity} m³</span>
                          </TableCell>
                          <TableCell className="px-2 py-4 text-start">
                            <span className="text-gray-800 dark:text-white/90">
                              {typeof trip.cycle_time !== "undefined" ? (trip.cycle_time / 60).toFixed(2) : "-"}
                            </span>
                          </TableCell>
                          <TableCell className="px-2 py-4 text-start">
                            <span className="text-gray-800 dark:text-white/90">
                              {typeof trip.cushion_time !== "undefined" && trip.cushion_time !== null
                                ? Math.max(0, trip.cushion_time / 60).toFixed(0)
                                : "-"}
                            </span>
                          </TableCell>
                        </TableRow>
                      );

                      if (useBurstModel && showGapRows && idx < rows.length - 1) {
                        const gap = getGapMinutes(trip, rows[idx + 1]);
                        if (gap !== null) {
                          // Insert a thin gap row with only the Prepare Time cell populated
                          rendered.push(
                            <tr key={`${keyBase}-gap`} className="bg-red-50/40 dark:bg-red-900/10">
                              <td className="px-2 py-1 text-start text-xs text-red-600 dark:text-red-400" />
                              <td className="px-2 py-1 text-start text-xs text-red-600 dark:text-red-400" />
                              <td className="px-2 py-1 text-start text-xs text-red-600 dark:text-red-400" />
                              <td className="px-2 py-0 flex flex-row justify-start items-center gap-1 text-start text-xs  text-red-700 dark:text-red-400">
                                {gap} min <ArrowUpDown size={"12px"} />
                              </td>
                              <td className="px-2 py-1" />
                              <td className="px-2 py-1" />
                              <td className="px-2 py-1" />
                              <td className="px-2 py-1" />
                              <td className="px-2 py-1" />
                              <td className="px-2 py-1" />
                              <td className="px-2 py-1" />
                              <td className="px-2 py-1" />
                              <td className="px-2 py-1" />
                              <td className="px-2 py-1" />
                            </tr>
                          );
                        }
                      }
                    });
                    return rendered;
                  })()}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      {/* PLANT WISE TRIP DETAILS TABLE */}
      {/* <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mt-3">
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
      </div> */}

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
