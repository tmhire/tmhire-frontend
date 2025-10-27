"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/useApiClient";
import { Spinner } from "@/components/ui/spinner";
import Button from "@/components/ui/button/Button";
import DatePickerInput from "@/components/form/input/DatePickerInput";
import ScheduleWiseTable, { type ScheduleWiseTableExportHandle } from "./ScheduleWiseTable";
import TruckWiseTable, { type TruckWiseTableExportHandle } from "./TruckWiseTable";
import * as XLSX from "xlsx";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, Clock, FileDown, Filter } from "lucide-react";

type Schedule = {
  _id: string;
  status: string;
  type: string;
  client_name: string;
  schedule_no: string;
  site_address: string;
  project_name: string;
  tm_count: number;
  created_at: string;
  plant_id?: string;
  mother_plant_name?: string;
  pump: string;
  pump_type: string;
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
  burst_table: Array<{
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
  tm_overrule?: number;
  total_tm_deployed?: number;
  cancelled_by?: "CLIENT" | "COMPANY";
  cancellation_reason?: string;
};

export default function ReportsContainer() {
  const { status } = useSession();
  const { fetchWithAuth } = useApiClient();
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [reportType, setReportType] = useState<"schedule-wise" | "truck-wise">("schedule-wise");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selectedToDate, setSelectedToDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [validDateRange, setValidDateRange] = useState<boolean>(true);
  const [city, setCity] = useState<string>(session?.city || "");
  const [selectedPlantId, setSelectedPlantId] = useState<string>("");
  const [selectedPlantName, setSelectedPlantName] = useState<string>("");
  const [selectedClientName, setSelectedClientName] = useState<string>("");
  const [selectedProjectName, setSelectedProjectName] = useState<string>("");
  const [selectedSupplyPump, setSelectedSupplyPump] = useState<string>("");
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const scheduleRef = useRef<ScheduleWiseTableExportHandle | null>(null);
  const truckRef = useRef<TruckWiseTableExportHandle | null>(null);

  React.useEffect(() => {
    if (session && session?.user) {
      setCity(session.city || "");
    }
  }, [session, setCity]);

  // Initialize from URL on first render
  useEffect(() => {
    const urlDate = searchParams.get("date");
    let urlToDate = searchParams.get("to_date");
    const urlType = searchParams.get("report-type");
    const urlPlant = searchParams.get("plant");
    const urlClient = searchParams.get("client");
    const urlProject = searchParams.get("project");
    const urlSupplyPump = searchParams.get("supply-pump");

    if (urlDate) {
      if (!urlToDate) urlToDate = urlDate;
      setSelectedDate(urlDate);
      setSelectedToDate(urlToDate);
      setValidDateRange(new Date(urlDate) <= new Date(urlToDate));
    }
    if (urlType) {
      const normalized = urlType === "schedule" ? "schedule-wise" : urlType === "truck" ? "truck-wise" : urlType;
      if (normalized === "schedule-wise" || normalized === "truck-wise") setReportType(normalized as typeof reportType);
    }
    if (urlPlant) setSelectedPlantName(urlPlant);
    if (urlClient) setSelectedClientName(urlClient);
    if (urlProject) setSelectedProjectName(urlProject);
    if (urlSupplyPump) setSelectedSupplyPump(urlSupplyPump);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: schedules, isLoading } = useQuery<Schedule[]>({
    queryKey: ["reports-schedules", selectedDate, selectedToDate],
    queryFn: async () => {
      const response = await fetchWithAuth(
        `/schedules/reports?type=all&from_date=${selectedDate}&to_date=${selectedToDate}`
      );
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Failed to fetch schedules");
      return data.data as Schedule[];
    },
    enabled:
      status === "authenticated" &&
      validDateRange &&
      new Date(selectedDate).getTime() <= new Date(selectedToDate).getTime(),
  });

  const { data: plants } = useQuery<{ _id: string; name: string }[]>({
    queryKey: ["plants"],
    queryFn: async () => {
      const response = await fetchWithAuth("/plants");
      const data = await response.json();
      if (data.success) return data.data as { _id: string; name: string }[];
      return [];
    },
    enabled: status === "authenticated",
  });

  const plantIdToName = useMemo(() => {
    return (plants || []).reduce((acc, p) => {
      acc[p._id] = p.name;
      return acc;
    }, {} as Record<string, string>);
  }, [plants]);

  const getPumpSupplyType = (type: string) => {
    return type === "supply" ? "S" : "P";
  };

  // Get unique client names and project names from schedules
  const uniqueClientNames = useMemo(() => {
    if (!schedules) return [];
    const clients = new Set<string>();
    schedules.forEach((schedule) => {
      if (schedule.client_name) {
        clients.add(schedule.client_name);
      }
    });
    return Array.from(clients).sort();
  }, [schedules]);

  const uniqueProjectNames = useMemo(() => {
    if (!schedules) return [];
    const projects = new Set<string>();
    schedules.forEach((schedule) => {
      if (schedule.project_name) {
        projects.add(schedule.project_name);
      }
    });
    return Array.from(projects).sort();
  }, [schedules]);

  // Resolve plant id from name provided in URL
  useEffect(() => {
    if (!selectedPlantName || !plants || plants.length === 0) return;
    const match = plants.find((p) => p.name === selectedPlantName);
    if (match && match._id !== selectedPlantId) setSelectedPlantId(match._id);
  }, [plants, selectedPlantName, selectedPlantId]);

  // Keep URL in sync with current selections
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("date", selectedDate);
    params.set("to_date", selectedToDate);
    if (reportType) params.set("report-type", reportType === "schedule-wise" ? "schedule" : "truck");
    const plantName = selectedPlantId ? plantIdToName[selectedPlantId] : selectedPlantName;
    if (plantName) params.set("plant", plantName);
    if (selectedClientName) params.set("client", selectedClientName);
    if (selectedProjectName) params.set("project", selectedProjectName);
    if (selectedSupplyPump) params.set("supply-pump", selectedSupplyPump);
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [
    selectedDate,
    selectedToDate,
    reportType,
    selectedPlantId,
    selectedPlantName,
    selectedClientName,
    selectedProjectName,
    selectedSupplyPump,
    plantIdToName,
    router,
  ]);

  const filtered = useMemo(() => {
    if (!schedules) return [] as Schedule[];
    return schedules.filter((s) => {
      // Only show schedules with status "generated"
      const matchesStatus =
        reportType === "schedule-wise" ? s.status === "generated" || s.status === "canceled" : s.status === "generated";

      // Filter by selected date
      const matchesDate =
        (!selectedDate && !selectedToDate) ||
        (new Date(selectedDate).getTime() <= new Date(s.input_params.schedule_date).getTime() &&
          new Date(s.input_params.schedule_date).getTime() <= new Date(selectedToDate).getTime()) ||
        !validDateRange;

      // For schedule-wise: filter by mother plant matching selected plant
      const matchesPlant =
        reportType !== "schedule-wise" || (!selectedPlantId && !selectedPlantName)
          ? true
          : (s.mother_plant_name || "") ===
            (selectedPlantId ? plantIdToName[selectedPlantId] || "" : selectedPlantName);

      // Filter by client name
      const matchesClient = !selectedClientName || s.client_name === selectedClientName;

      // Filter by project name
      const matchesProject = !selectedProjectName || s.project_name === selectedProjectName;

      // Filter by supply/pump
      const matchesSupplyPump = !selectedSupplyPump || getPumpSupplyType(s.type) === selectedSupplyPump;

      return matchesStatus && matchesDate && matchesPlant && matchesClient && matchesProject && matchesSupplyPump;
    });
  }, [
    reportType,
    schedules,
    selectedDate,
    selectedToDate,
    validDateRange,
    selectedPlantId,
    selectedPlantName,
    selectedClientName,
    selectedProjectName,
    selectedSupplyPump,
    plantIdToName,
  ]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setValidDateRange(new Date(date).getTime() <= new Date(selectedToDate).getTime());
  };

  const handleToDateChange = (date: string) => {
    setSelectedToDate(date);
    setValidDateRange(new Date(selectedDate).getTime() <= new Date(date).getTime());
  };

  const handleExport = () => {
    const wb = XLSX.utils.book_new();
    const sheets =
      reportType === "schedule-wise" ? scheduleRef.current?.getExportSheets() : truckRef.current?.getExportSheets();
    if (!sheets || sheets.length === 0) return;
    sheets.forEach((sheet) => {
      const ws = XLSX.utils.aoa_to_sheet(sheet.rows);
      const safeName = (sheet.name || "Sheet").replace(/[\\\/:\*\?\[\]]/g, "-").slice(0, 31) || "Sheet";
      XLSX.utils.book_append_sheet(wb, ws, safeName);
    });
    XLSX.writeFile(wb, `${reportType}-${selectedPlantId && plantIdToName[selectedPlantId] + `-`}${selectedDate}.xlsx`);
  };

  const startHour = session?.custom_start_hour ?? 0; // default 7
  const format = session?.preferred_format ?? "12h";

  function formatHour(hour: number) {
    if (format === "24h") {
      return `${hour.toString().padStart(2, "0")}:00`;
    }
    const suffix = hour >= 12 ? "PM" : "AM";
    const adjusted = hour % 12 === 0 ? 12 : hour % 12;
    return `${adjusted.toString().padStart(2, "0")}:00 ${suffix}`;
  }
  const endHour = (startHour + 24) % 24;

  const hasActiveFilters =
    selectedSupplyPump !== "" ||
    selectedPlantId !== "" ||
    selectedPlantName !== "" ||
    selectedClientName !== "" ||
    selectedProjectName !== "";

  return (
    <div className="grid grid-cols-12 gap-4 md:gap-2">
      {/* Date Picker and Report Type Row */}
      <div className="col-span-12 flex items-center justify-between py-4 pl-6 px-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 sticky top-24">
        {/* Page Name and Scheduled Timings */}
        <div className="flex flex-col space-y-2">
          {/* Page Name Row */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-white">Reports - {city}</h3>
          </div>

          {/* Scheduled Timings Row */}
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Scheduled Timings:</span>
            <span className="px-3 py-1 rounded-full bg-gray-200 dark:bg-gray-700 text-sm font-medium text-gray-800 dark:text-gray-200">
              {formatHour(startHour)} TO {formatHour(endHour)} NEXT DAY
            </span>
          </div>
        </div>

        {/* Filters Group */}
        <div className="flex flex-col space-y-3 bg-gray-50 dark:bg-gray-700/50 px-4 py-3 rounded-lg w-fit">
          {/* Date Filter Row */}
          <div className="grid grid-cols-3 gap-2 items-center">
            {/* From Date */}
            <div className="flex items-center space-x-2 w-40">
              <Calendar className="h-6 w-6 text-gray-500 dark:text-gray-400" />
              <span className="text-sm text-gray-700 dark:text-gray-400 whitespace-nowrap">From:</span>
              <DatePickerInput
                value={selectedDate}
                onChange={handleDateChange}
                placeholder="Select"
                className={`h-8 w-full text-sm ${!validDateRange && "border-red-400 text-red-400"}`}
              />
            </div>

            {/* To Date */}
            <div className="flex items-center space-x-2 w-40">
              <span className="text-sm text-gray-700 dark:text-gray-400 whitespace-nowrap">To:</span>
              <DatePickerInput
                value={selectedToDate}
                onChange={handleToDateChange}
                placeholder="Optional"
                className={`h-8 w-full text-sm ${!validDateRange && "border-red-400 text-red-400"}`}
              />
            </div>

            {/* Today Button */}
            <div className="flex items-center space-x-2 w-40">
              <Button
                variant="outline"
                className="h-8 w-full text-sm px-2"
                onClick={() => {
                  const today = new Date().toISOString().slice(0, 10);
                  setSelectedDate(today);
                  setSelectedToDate(today);
                }}
              >
                Today
              </Button>
            </div>

            {/* Filters Button */}
            <div className="flex items-center space-x-2 w-40">
              <Button
                variant="outline"
                className={`h-8 w-full text-sm px-2 relative flex items-center justify-center space-x-2 ${
                  hasActiveFilters ? "border-blue-500 bg-blue-50 dark:bg-blue-900" : ""
                }`}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className={`${hasActiveFilters && "text-blue-600 dark:text-blue-900"}h-4 w-4`} />
                <span className={`${hasActiveFilters && "text-blue-600 dark:text-blue-900"}`}>Filters</span>
                {hasActiveFilters && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-blue-500 rounded-full"></span>
                )}
              </Button>
            </div>
            {/* Time Format Info Row */}
            {reportType === "truck-wise" && (
              <div className="flex items-center space-x-2 col-span-2">
                <span className="text-xs text-gray-400 dark:text-gray-500 max-w-xs">
                  Note: Time format (HH:MM) follows X hrs Y mins naming convention
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Report Type and Export */}
        <div className="flex flex-col space-y-2">
          {/* Report Type Row */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Report Type:</span>
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setReportType("schedule-wise")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  reportType === "schedule-wise"
                    ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Schedule Wise
              </button>
              <button
                onClick={() => setReportType("truck-wise")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  reportType === "truck-wise"
                    ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Truck Wise
              </button>
            </div>
          </div>

          {/* Export Row */}
          <div className="flex justify-end">
            <Button variant="outline" className="h-8 flex items-center space-x-2" onClick={handleExport}>
              <FileDown className="h-4 w-4" />
              <span>Export</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Filters Row */}
      {showFilters && (
        <div className="col-span-12 flex items-center justify-between py-4 pl-6 px-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col space-y-3 w-full">
            <div className={`flex flex-row gap-6 items-center `}>
              {/* Supply/Pump */}
              {reportType === "schedule-wise" && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700 dark:text-gray-400 whitespace-nowrap">Supply/Pump:</span>
                  <select
                    className="h-8 w-48 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-2 text-gray-700 dark:text-gray-200"
                    value={selectedSupplyPump}
                    onChange={(e) => setSelectedSupplyPump(e.target.value)}
                  >
                    <option value="">All</option>
                    <option value="S">Supply</option>
                    <option value="P">Pump</option>
                  </select>
                </div>
              )}

              {/* Plant */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700 dark:text-gray-400 whitespace-nowrap">Plant:</span>
                <select
                  className="h-8 w-48 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-2 text-gray-700 dark:text-gray-200"
                  value={selectedPlantId}
                  onChange={(e) => {
                    const next = e.target.value;
                    setSelectedPlantId(next);
                    setSelectedPlantName("");
                  }}
                >
                  <option value="">All</option>
                  {(plants || []).map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Client */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700 dark:text-gray-400 whitespace-nowrap">Client:</span>
                <select
                  className="h-8 w-48 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-2 text-gray-700 dark:text-gray-200"
                  value={selectedClientName}
                  onChange={(e) => setSelectedClientName(e.target.value)}
                >
                  <option value="">All</option>
                  {uniqueClientNames.map((client) => (
                    <option key={client} value={client}>
                      {client}
                    </option>
                  ))}
                </select>
              </div>

              {/* Project */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700 dark:text-gray-400 whitespace-nowrap">Project:</span>
                <select
                  className="h-8 w-48 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-2 text-gray-700 dark:text-gray-200"
                  value={selectedProjectName}
                  onChange={(e) => setSelectedProjectName(e.target.value)}
                >
                  <option value="">All</option>
                  {uniqueProjectNames.map((project) => (
                    <option key={project} value={project}>
                      {project}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading || !schedules ? (
        <div className="flex items-center justify-center min-h-[500px] w-full col-span-12">
          <Spinner size="lg" text="Loading reports..." />
        </div>
      ) : (
        <div className="col-span-12">
          {reportType === "schedule-wise" ? (
            <ScheduleWiseTable
              ref={scheduleRef}
              data={filtered}
              plantIdToName={plantIdToName}
              selectedDate={selectedDate}
              selectedToDate={selectedToDate}
              selectedPlantName={selectedPlantId ? plantIdToName[selectedPlantId] || "" : selectedPlantName}
              selectedClientName={selectedClientName}
              selectedProjectName={selectedProjectName}
              selectedSupplyPump={selectedSupplyPump}
            />
          ) : (
            <TruckWiseTable
              ref={truckRef}
              data={filtered}
              selectedDate={selectedDate}
              selectedPlantId={selectedPlantId}
              selectedClientName={selectedClientName}
              selectedProjectName={selectedProjectName}
              plantIdToName={plantIdToName}
            />
          )}
        </div>
      )}
    </div>
  );
}
