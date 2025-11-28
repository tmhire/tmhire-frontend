"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/useApiClient";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import Badge from "@/components/ui/badge/Badge";
import { formatTimeByPreference, formatHoursAndMinutes } from "@/lib/utils";
import { useProfile } from "@/hooks/useProfile";
import Button from "@/components/ui/button/Button";
import { Download, Pencil, Trash2, CopyX } from "lucide-react";
import { useState } from "react";
import ExcelJS from "exceljs";
import { Modal } from "@/components/ui/modal";
import Radio from "@/components/form/input/Radio";
import { CanceledBy, CancelReason, DeleteType } from "@/types/common.types";
import { useUserById } from "@/hooks/useCompany";

interface SupplySchedule {
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
  concreteGrade: number;
  pumping_speed: number;
  cycle_time: number;
  total_trips: number;
  trips_per_tm: number;
  type: string;
  created_at: string;
  last_updated: string;
  created_by?: string;
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
}

const formatVolume = (value: number): string => {
  if (!value) return "0";
  return Number.isInteger(value) ? value.toString() : value.toFixed(2);
};

export default function SupplyScheduleViewPage() {
  const router = useRouter();
  const params = useParams();
  const { fetchWithAuth } = useApiClient();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [canceledBy, setCanceledBy] = useState<CanceledBy>(CanceledBy.client);
  const [reasonForCancel, setReasonForCancel] = useState<CancelReason>(CancelReason.ecl);

  const { data: schedule, isLoading } = useQuery<SupplySchedule>({
    queryKey: ["supply-schedule", params.id],
    queryFn: async () => {
      const response = await fetchWithAuth(`/schedules/${params.id}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Failed to fetch supply schedule");
      return data.data;
    },
  });

  // Get creator user details
  const { user: creatorUser } = useUserById(schedule?.created_by);

  const handleExportExcel = async () => {
    if (!schedule) return;

    const workbook = new ExcelJS.Workbook();
    
    // Define styles - matching pumping page styles
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF2563EB' } },
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
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFE5E7EB' } },
      border: {
        top: { style: 'thin' as const, color: { argb: 'FF000000' } },
        left: { style: 'thin' as const, color: { argb: 'FF000000' } },
        bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
        right: { style: 'thin' as const, color: { argb: 'FF000000' } }
      },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const }
    };

    const dataHeaderStyle = {
      font: { bold: true, color: { argb: 'FF1F2937' }, size: 11 },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFE5E7EB' } },
      border: {
        top: { style: 'thin' as const, color: { argb: 'FF000000' } },
        left: { style: 'thin' as const, color: { argb: 'FF000000' } },
        bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
        right: { style: 'thin' as const, color: { argb: 'FF000000' } }
      },
      alignment: { horizontal: 'left' as const, vertical: 'middle' as const }
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
      font: { bold: true, size: 16, color: { argb: 'FF1F2937' } },
      fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFF8FAFC' } },
      alignment: { horizontal: 'center' as const, vertical: 'middle' as const }
    };

    // Create Summary Sheet
    const summarySheet = workbook.addWorksheet('Summary');
    
    // Add title
    summarySheet.mergeCells('A1:B1');
    summarySheet.getCell('A1').value = 'Concrete Supply - Schedule Summary';
    summarySheet.getCell('A1').style = titleStyle;
    summarySheet.getRow(1).height = 25;

    // Add basic summary data (A3-B17)
    const basicSummaryData = [
      ["Mother Plant", schedule.mother_plant_name || "-"],
      ["Schedule Name", schedule.schedule_no || "-"],
      ["Scheduled Date", schedule.input_params.schedule_date
          ? new Date(schedule.input_params.schedule_date).toLocaleDateString(["en-GB"], {
            day: "2-digit", month: "2-digit", year: "2-digit",
          })
        : "-"],
      ["Supply Start Time at Site", schedule.input_params.pump_start
          ? new Date(schedule.input_params.pump_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "-"],
      ["Client Name", schedule.client_name || "-"],
      ["Project Name & Site Location", `${schedule.project_name || "-"}, ${schedule.site_address || "-"}`],
      ["Total Qty Supplied in m³", `${schedule.input_params.quantity}`],
      ["RMC Grade", schedule.concreteGrade ? `M ${schedule.concreteGrade}` : "-"],
      ["Site Supervisor", schedule.site_supervisor_name || "-"]
    ];

    // Helper function to add borders to a range
    const addBorders = (startRow: number, endRow: number, startCol: number, endCol: number) => {
      for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
          const cell = summarySheet.getCell(row, col);
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        }
      }
    };

    // Add basic summary data to sheet (A3-B12)
    let currentRow = 3;
    const basicSummaryStartRow = currentRow;
    basicSummaryData.forEach((row) => {
      summarySheet.getRow(currentRow).values = row;
      summarySheet.getRow(currentRow).height = 20;
      
      // Style the row
      row.forEach((_, colIndex) => {
        const cell = summarySheet.getCell(currentRow, colIndex + 1);
        if (colIndex === 0) {
          // First column (field names) - use dataHeaderStyle
          cell.style = dataHeaderStyle;
        } else {
          // Second column (values) - use dataStyle
          cell.style = dataStyle;
        }
      });
      currentRow++;
    });
    const basicSummaryEndRow = currentRow - 1;
    
    // Add borders to basic summary section
    addBorders(basicSummaryStartRow, basicSummaryEndRow, 1, 2);

    // Add TM cycle time table (A14-B20)
    currentRow += 1; // Add spacing
    const tmCycleTimeStartRow = currentRow;
    const tmCycleTimeData = [
      ["TM cycle time", "Minutes"],
      ["Pre-Start Time  (A)", `${schedule.input_params.buffer_time}`],
      ["Loading Time  (B)", `${schedule.input_params.load_time}`],
      ["Onward Time  (C)", `${schedule.input_params.onward_time}`],
      ["Unloading Time  (D)", `${schedule.input_params.unloading_time}`],
      ["Return Time  (E)", `${schedule.input_params.return_time}`],
      ["Total TM Cycle Time (A+B+C+D+E)", `${formatHoursAndMinutes(schedule.cycle_time)}`]
    ];

    tmCycleTimeData.forEach((row) => {
      summarySheet.getRow(currentRow).values = row;
      summarySheet.getRow(currentRow).height = 20;
      
      // Style the row
      row.forEach((_, colIndex) => {
        const cell = summarySheet.getCell(currentRow, colIndex + 1);
        if (colIndex === 0) {
          // First column (field names) - use dataHeaderStyle
          cell.style = dataHeaderStyle;
        } else {
          // Second column (values) - use dataStyle
          cell.style = dataStyle;
        }
      });
      currentRow++;
    });
    const tmCycleTimeEndRow = currentRow - 1;
    
    // Add borders to TM cycle time table
    addBorders(tmCycleTimeStartRow, tmCycleTimeEndRow, 1, 2);

    // Add TM allocation section (D3:E6)
    const tmAllocationStartRow = 3;
    const tmAllocationData = [
      ["TM allocation", "TM Count"],
      ["Optimum Fleet: Non-Stop Pour", `${schedule.tm_count ?? "-"}`],
      ["TMs Additional ( TM queue at Site)", "0"],
      ["Total TM Required", `${schedule.tm_count}`]
    ];

    tmAllocationData.forEach((row, rowIndex) => {
      const actualRow = tmAllocationStartRow + rowIndex;
      summarySheet.getRow(actualRow).height = 20;
      
      // Set values and style starting from column D (4)
      row.forEach((value, colIndex) => {
        const cell = summarySheet.getCell(actualRow, colIndex + 4); // Start from column D (4)
        cell.value = value;
        if (rowIndex === 0) {
          // Header row - use blue header style
          cell.style = headerStyle;
        } else {
          cell.style = dataStyle;
        }
      });
    });

    // Add borders to TM allocation section
    addBorders(tmAllocationStartRow, tmAllocationStartRow + 3, 4, 5);
    
    // Helper functions for time calculations
    function formatOverallRange(trips: SupplySchedule["output_table"], preferredFormat?: string) {
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

    function getTotalHours(trips: SupplySchedule["output_table"]) {
      if (!trips || !trips.length) return 0;
      const starts = trips.map((t) => t.plant_start).filter(Boolean).map((t) => new Date(t));
      const ends = trips.map((t) => t.return).filter(Boolean).map((t) => new Date(t));
      if (!starts.length || !ends.length) return 0;
      const minStart = new Date(Math.min(...starts.map((d) => d.getTime())));
      const maxEnd = new Date(Math.max(...ends.map((d) => d.getTime())));
      return (maxEnd.getTime() - minStart.getTime()) / (1000 * 60 * 60);
    }

    // Add TM Trip Distribution section (F3:I7)
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
        .map(([trips, tmCount], idx) => [String(idx + 1), String(Number(tmCount)), String(Number(trips)), String(Number(tmCount) * Number(trips))]);
      const totalTMs = Object.keys(tmTripCounts).length;
      const totalTrips = schedule.output_table.length;

      // Add main heading "TM Trip Distribution" with merged cells
      summarySheet.mergeCells(`G3:J3`);
      const tmTripDistributionHeaderCell = summarySheet.getCell(`G3`);
      tmTripDistributionHeaderCell.value = "TM Trip Distribution";
      tmTripDistributionHeaderCell.style = headerStyle;
      
      // Add sub-headers in the next row
      const tmTripDistributionSubHeaders = ["Sl. No", "NO OF TMs (A)", "NO OF TRIPS/TM (B)", "TOTAL TRIPS (A) x (B)"];
      tmTripDistributionSubHeaders.forEach((header, colIndex) => {
        const cell = summarySheet.getCell(4, colIndex + 7); // Start from column F (6)
        cell.value = header;
        cell.style = subHeaderStyle;
      });

      // Add TM Trip Distribution data
      rows.forEach((row, rowIndex) => {
        const actualRow = 5 + rowIndex;
        row.forEach((data, colIndex) => {
          const cell = summarySheet.getCell(actualRow, colIndex + 7); // Start from column F (6)
          cell.value = data;
          cell.style = dataStyle;
        });
      });
      
      // Add total row
      const totalRow = ["TOTAL", String(totalTMs), "", String(totalTrips)];
      totalRow.forEach((data, colIndex) => {
        const cell = summarySheet.getCell(5 + rows.length, colIndex + 7); // Start from column F (6)
        cell.value = data;
        cell.style = { ...dataStyle, font: { ...dataStyle.font, bold: true } };
      });
      
      // Add borders to TM Trip Distribution section
      addBorders(3, 5 + rows.length, 7, 9);
    }

    // Add TM Wise Trip Details section (D9:L)
    if (schedule.output_table && schedule.output_table.length > 0) {
      const preferred = profile?.preferred_format;
      const tmTrips: Record<string, SupplySchedule["output_table"]> = {};
      schedule.output_table.forEach((trip) => {
        if (!tmTrips[trip.tm_id]) tmTrips[trip.tm_id] = [];
        tmTrips[trip.tm_id].push(trip);
      });
      Object.values(tmTrips).forEach((trips) => {
        if (trips) trips.sort((a, b) => a.trip_no - b.trip_no);
      });
      const tmIds = Object.keys(tmTrips);
      const maxTrips = Math.max(...Object.values(tmTrips).map((trips) => trips?.length || 0));
      const tmIdToIdentifier: Record<string, string> = {};
      schedule.output_table.forEach((trip) => {
        if (trip.tm_id && trip.tm_no) tmIdToIdentifier[trip.tm_id] = trip.tm_no;
      });

      // Add spacing and header for TM Wise Trip Details
      const tmWiseStartRow = 9;
      summarySheet.mergeCells(`D${tmWiseStartRow}:I${tmWiseStartRow}`);
      const tmWiseHeaderCell = summarySheet.getCell(`D${tmWiseStartRow}`);
      tmWiseHeaderCell.value = (`TM Wise Trip Details (${preferred === "24h" ? "24H" : "12H"} format for Time)`);
      tmWiseHeaderCell.style = { ...headerStyle, font: { ...headerStyle.font, size: 11 } };
      
      // Add TM Wise Trip Details headers
      const header = [
        "S.No.", "TM", ...Array.from({ length: maxTrips }, (_, i) => `Trip ${i + 1}`),
        "Start-End Time", "Total Hours"
      ];
      header.forEach((headerText, colIndex) => {
        const cell = summarySheet.getCell(tmWiseStartRow + 1, colIndex + 4); // Start from column D (4)
        cell.value = headerText;
        cell.style = subHeaderStyle;
      });

      // Add TM Wise Trip Details data
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
          const cell = summarySheet.getCell(tmWiseStartRow + 2 + index, colIndex + 4); // Start from column D (4)
          cell.value = data;
          cell.style = dataStyle;
        });
      });

      // Add average row
      const totalHoursArr = tmIds.map((tmId) => getTotalHours(tmTrips[tmId]));
      const avgTotalHours = totalHoursArr.length ? totalHoursArr.reduce((a, b) => a + b, 0) / totalHoursArr.length : 0;
      const avgRow = [
        "Avg", "", ...Array.from({ length: maxTrips }).map(() => ""),
        "", avgTotalHours ? formatHoursAndMinutes(avgTotalHours) : "-"
      ];
      avgRow.forEach((data, colIndex) => {
        const cell = summarySheet.getCell(tmWiseStartRow + 2 + tmIds.length, colIndex + 4); // Start from column D (4)
        cell.value = data;
        cell.style = { ...dataStyle, font: { ...dataStyle.font, bold: true } };
      });
      
      // Add borders to TM Wise Trip Details section
      const tmWiseEndRow = tmWiseStartRow + 2 + tmIds.length;
      addBorders(tmWiseStartRow + 1, tmWiseEndRow, 4, 4 + header.length - 1);
    }

    // Set column widths - all table columns to 17
    summarySheet.getColumn(1).width = 37; // A - Field names
    summarySheet.getColumn(2).width = 25; // B - Values
    summarySheet.getColumn(3).width = 5; // C
    summarySheet.getColumn(4).width = 28; // D
    summarySheet.getColumn(5).width = 16; // E
    summarySheet.getColumn(6).width = 16; // F
    summarySheet.getColumn(7).width = 16; // G
    summarySheet.getColumn(8).width = 17; // H
    summarySheet.getColumn(9).width = 20; // I
    summarySheet.getColumn(10).width = 20; // J
    summarySheet.getColumn(11).width = 19; // K
    summarySheet.getColumn(12).width = 17; // L
    summarySheet.getColumn(13).width = 19; // M

    // Create Schedule Sheet
    if (schedule.output_table && schedule.output_table.length > 0) {
      const scheduleSheet = workbook.addWorksheet('Schedule');
      const preferred = profile?.preferred_format;

      // Add title
      const scheduleDate = schedule.input_params.schedule_date
        ? new Date(schedule.input_params.schedule_date).toLocaleDateString(["en-GB"], {
            day: "2-digit", month: "2-digit", year: "2-digit",
          })
        : "-";
      const customerName = schedule.client_name || "-";
      const projectName = schedule.project_name || "-";
      
      const sheetTitle = `Schedule (Supply Model) - ${scheduleDate} - ${customerName} - ${projectName}`;
      
      scheduleSheet.mergeCells('A1:L1');
      scheduleSheet.getCell('A1').value = sheetTitle;
      scheduleSheet.getCell('A1').style = titleStyle;
      scheduleSheet.getRow(1).height = 25;

      // Schedule table headers
      const scheduleHeader = [
        "Trip No", "TM No", "Plant - Name", "Prepare", "Load",
        "Plant - Start", "Supply - Start", "Supply - End", "Return Time",
        "Cum. M3", "Cycle Time (min)", "Cushion Time (min)"
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
      const scheduleRows = schedule.output_table.map((trip) => [
        trip.trip_no, trip.tm_no, trip.plant_name ? trip.plant_name : "N / A",
        trip.plant_buffer ? formatTimeByPreference(trip.plant_buffer, preferred) : "-",
        trip.plant_load ? formatTimeByPreference(trip.plant_load, preferred) : "-",
        formatTimeByPreference(trip.plant_start, preferred),
        trip.pump_start ? formatTimeByPreference(trip.pump_start, preferred) : "-",
        trip.unloading_time ? formatTimeByPreference(trip.unloading_time, preferred) : "-",
        trip.return ? formatTimeByPreference(trip.return, preferred) : "-",
        `${trip.completed_capacity} m³`,
        typeof trip.cycle_time !== "undefined" ? (trip.cycle_time / 60).toFixed(2) : "-",
        typeof trip.cushion_time !== "undefined" && trip.cushion_time !== null
          ? Math.max(0, trip.cushion_time / 60).toFixed(0) : "-"
      ]);

      // Add data rows to sheet
      scheduleRows.forEach((row) => {
        scheduleSheet.getRow(dataRow).values = row;
        scheduleSheet.getRow(dataRow).height = 20;
        
        // Style the row
        row.forEach((_, colIndex) => {
          const cell = scheduleSheet.getCell(dataRow, colIndex + 1);
          cell.style = dataStyle;
        });
        dataRow++;
      });

      // Set column widths for schedule sheet
      scheduleHeader.forEach((_, colIndex) => {
        const column = scheduleSheet.getColumn(colIndex + 1);
        if (colIndex === 0 || colIndex === 1) column.width = 13; // Trip No, TM No
        else if (colIndex === 2) column.width = 15; // Plant Name
        else if (colIndex === 3) column.width = 12; // Prepare
        else if (colIndex === 4) column.width = 12; // Load
        else if (colIndex === 5) column.width = 15; // Plant - Start
        else if (colIndex === 6) column.width = 15; // Supply - Start
        else if (colIndex === 7) column.width = 15; // Supply - End
        else if (colIndex === 8) column.width = 12; // Return Time
        else if (colIndex === 9) column.width = 12; // Cum. M3
        else if (colIndex === 10) column.width = 17; // Cycle Time (min)
        else if (colIndex === 11) column.width = 18; // Cushion Time (min)
        else column.width = 15;
      });
    }

    // Save the workbook
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${schedule.schedule_no}-${"supply-schedule"}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

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
      router.push("/supply-schedules");
    },
  });

  const handleEdit = () => {
    router.push(`/supply-schedules/${params.id}`);
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
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-black dark:text-white flex gap-3">
            <span>Concrete Supply - Schedule Summary</span>
            <Badge size="sm" color={schedule.status === "generated" ? "success" : "warning"}>
              {schedule.status === "generated" ? "Confirmed" : schedule.status}
            </Badge>
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
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Supply Start Time at Site</h4>
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
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Mother Plant</h4>
              <p className="text-base text-gray-800 dark:text-white/90">{schedule.mother_plant_name}</p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Site Supervisor</h4>
              <p className="text-base text-gray-800 dark:text-white/90">{schedule.site_supervisor_name}</p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">RMC Grade</h4>
              <p className="text-base text-gray-800 dark:text-white/90">
                {schedule.concreteGrade && `M ${schedule.concreteGrade}`}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Total Qty Supplied in m³</h4>
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
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Optimum Fleet: Non-Stop Pour
              </h4>
              <p className="text-base text-gray-800 dark:text-white/90">{schedule.tm_count || "N/A"}</p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Total TM Required</h4>
              <p className="text-base font-semibold text-blue-600 dark:text-blue-400">
                {schedule.tm_count}
              </p>
            </div>
            {schedule.created_by && (
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Created By</h4>
                <p className="text-base text-gray-800 dark:text-white/90">
                  {creatorUser?.name || "Unknown"}
                  {creatorUser?.role && (
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                      ({creatorUser.role}{creatorUser.sub_role ? ` - ${creatorUser.sub_role}` : ""})
                    </span>
                  )}
                </p>
              </div>
            )}
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

      {/* TM WISE TRIP DETAILS TABLE */}
      <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mt-3 mb-3">
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
          const totalVolumeArr = tmIds.map((tmId) =>
            tmTrips[tmId].reduce((sum, trip) => sum + (trip.completed_capacity || 0), 0)
          );
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
          const avgTotalVolume = totalVolumeArr.length
            ? totalVolumeArr.reduce((a, b) => a + b, 0) / totalVolumeArr.length
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
                    <th className="px-2 py-2 font-medium text-gray-700 dark:text-gray-200 text-left">
                      Total Vol carried m3
                    </th>
                    <th className="px-2 py-2 font-medium text-gray-700 dark:text-gray-200 text-left">Start-End Time</th>
                    <th className="px-2 py-2 font-medium text-gray-700 dark:text-gray-200 text-right">Total Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {tmIds.map((tmId, index) => {
                    const trips = tmTrips[tmId];
                    const overallRange = formatOverallRange(trips, profile?.preferred_format);
                    const totalHours = getTotalHours(trips);
                    const totalVolume = trips.reduce((sum, trip) => sum + (trip.completed_capacity || 0), 0);
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
                        <td className="px-2 text-gray-800 dark:text-white/90 py-2 text-left">
                          {trips.length ? formatVolume(totalVolume) : "-"}
                        </td>
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
                    <td className="px-2 py-2 text-left">
                      {tmIds.length ? formatVolume(avgTotalVolume) : "-"}
                    </td>
                    <td className="px-2 py-2 text-center"></td>
                    <td className="px-2 py-2 text-right">
                      {avgTotalHours ? formatHoursAndMinutes(avgTotalHours) : "-"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

      <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Schedule Table</h4>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-100/20 dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
              <Table>
                <thead className="border-b border-gray-100 dark:border-white/[0.05]">
                  {/* Main header row with merged columns */}
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
                      Supply - Unloading
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
                  {/* Sub-header row with individual column names */}
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
                </thead>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {schedule.output_table.map((trip) => (
                    <TableRow key={trip.trip_no}>
                      <TableCell className="px-2 py-4 text-start">
                        <span className="text-gray-800 dark:text-white/90">{trip.trip_no}</span>
                      </TableCell>
                      <TableCell className="px-2 py-4 text-start">
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
                      <TableCell className="px-2 py-4 text-start">
                        <span className="text-gray-500 dark:text-gray-400">
                          {trip.return ? formatTimeByPreference(trip.return, profile?.preferred_format) : "-"}
                        </span>
                      </TableCell>
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
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
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
          <p className="mb-6 dark:text-white/90">
            Are you sure you want to delete this schedule? This action cannot be undone.
          </p>
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
