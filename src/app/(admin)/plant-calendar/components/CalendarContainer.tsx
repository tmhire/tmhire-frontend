"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Calendar, Filter, Search } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/useApiClient";
import DatePickerInput from "@/components/form/input/DatePickerInput";
import Tooltip from "@/components/ui/tooltip";
import SearchableDropdown from "@/components/form/SearchableDropdown";

type ApiTask = {
  id: string;
  start: string;
  end: string;
  client: string;
  project: string;
  schedule_no: string;
};

type ApiItem = {
  id: string;
  name: string;
  plant: string; // plant id
  type: "line" | "boom" | null;
  tasks: ApiTask[];
};

type ApiResponse = {
  success: boolean;
  message: string;
  data: {
    mixers: ApiItem[];
    pumps: ApiItem[];
  };
};

type Plant = {
  _id: string;
  name: string;
  location: string;
  address: string;
};

type Task = {
  id: string;
  color: string;
  client: string;
  project: string;
  schedule_no: string;
  type: string;
  actualStart: string;
  actualEnd: string;
};

type PlantRow = {
  id: string; // plant id
  name: string; // plant name
  tasks: Task[];
};

const TASK_TYPE_COLORS: Record<string, string> = {
  buffer: "bg-blue-200",
  fixing: "bg-blue-400",
  load: "bg-blue-400",
  onward: "bg-blue-500",
  unload: "bg-blue-600",
  pump: "bg-blue-600",
  removal: "bg-blue-500",
  cushion: "bg-blue-300",
  return: "bg-blue-500",
};

const CLIENT_TAILWIND_COLORS = [
  "bg-red-500",
  "bg-lime-400",
  "bg-fuchsia-400",
  "bg-orange-500",
  "bg-pink-400",
  "bg-indigo-400",
  "bg-cyan-400",
  "bg-emerald-400",
  "bg-rose-400",
  "bg-amber-400",
];

const getTaskType = (id: string) => id.split("-")[0];

const calculateDurationMinutes = (start: string, end: string): number => {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return Math.max(0, Math.round((e - s) / 60000));
};

const formatDateTimeForTooltip = (dateTimeString: string): string => {
  const date = new Date(dateTimeString);
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
  return `${dateStr} ${timeStr}`;
};

function formatHoursAndMinutes(decimalHours: number): string {
  if (isNaN(decimalHours) || decimalHours < 0) return "0 hrs 0 mins";
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  if (hours === 0) return `${minutes} mins`;
  if (minutes === 0) return `${hours} hrs`;
  return `${hours} hrs ${minutes} mins`;
}

function transformApiDataToPlantRows(apiData: ApiResponse, plantMap: Map<string, string>): PlantRow[] {
  const plantIdToRow: Map<string, PlantRow> = new Map();

  const assignItemTasks = (item: ApiItem, itemType: "mixer" | "pump") => {
    const plantId = item.plant;
    const plantName = plantMap.get(plantId) || plantId;
    if (!plantIdToRow.has(plantId)) {
      plantIdToRow.set(plantId, { id: plantId, name: plantName, tasks: [] });
    }
    const row = plantIdToRow.get(plantId)!;
    const tasks: Task[] = (item.tasks || []).map((task) => {
      const rawType = getTaskType(task.id);
      const mappedType =
        itemType === "mixer" && rawType === "work"
          ? "unload"
          : itemType === "pump" && rawType === "work"
          ? "pump"
          : rawType;
      return {
        id: task.id,
        color: TASK_TYPE_COLORS[mappedType] || "bg-gray-500",
        client: task.client,
        project: task.project,
        schedule_no: task.schedule_no,
        type: mappedType,
        actualStart: task.start,
        actualEnd: task.end,
      };
    });
    row.tasks.push(...tasks);
  };

  (apiData.data.mixers || []).forEach((m) => assignItemTasks(m, "mixer"));
  (apiData.data.pumps || []).forEach((p) => assignItemTasks(p, "pump"));

  // Sort tasks per plant by start time for rendering
  const rows = Array.from(plantIdToRow.values()).map((r) => ({
    ...r,
    tasks: r.tasks.sort((a, b) => new Date(a.actualStart).getTime() - new Date(b.actualStart).getTime()),
  }));

  // Sort rows by plant name
  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
}

export default function CalendarContainer() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { fetchWithAuth } = useApiClient();

  const initialDate = searchParams.get("date") || new Date().toISOString().split("T")[0];

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<string[]>([]);
  const [selectedClient, setSelectedClient] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState<string[]>([]);
  const [timeFormat, setTimeFormat] = useState<"12h" | "24h" | undefined>(session?.preferred_format);
  const [customStartHour, setCustomStartHour] = useState<number | undefined>(session?.custom_start_hour);
  const [rows, setRows] = useState<PlantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      if (!timeFormat) setTimeFormat(session?.preferred_format);
      if (!customStartHour) setCustomStartHour(session?.custom_start_hour);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status]);

  const { data: plantsData } = useQuery<Plant[]>({
    queryKey: ["plants"],
    queryFn: async () => {
      const response = await fetchWithAuth("/plants");
      const data = await response.json();
      return data.success ? data.data : [];
    },
    enabled: status === "authenticated",
  });

  const plantMap = useMemo(() => {
    if (!plantsData) return new Map<string, string>();
    return new Map(plantsData.map((p) => [p._id, p.name]));
  }, [plantsData]);

  // Client colors removed to anonymize busy blocks

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", newDate);
    router.push(`?${params.toString()}`);
  };

  const fetchGanttData = async (date: string) => {
    try {
      setLoading(true);
      setError(null);
      const time = `${String(customStartHour || 0).padStart(2, "0")}:00:00`;
      const response = await fetchWithAuth("/calendar/gantt", {
        method: "POST",
        body: JSON.stringify({ query_date: `${date}T${time}` }),
      });
      const data: ApiResponse = await response.json();
      if (data.success) {
        const transformed = transformApiDataToPlantRows(data, plantMap);
        setRows(transformed);
      } else {
        setError(data.message || "Failed to fetch gantt data");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch gantt data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchGanttData(selectedDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, customStartHour, status]);

  const filteredRows = rows.filter((row) => {
    const matchesSearch = row.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlant = selectedPlant.length === 0 || selectedPlant.includes(row.name);
    const matchesClient =
      selectedClient.length === 0 || row.tasks.some((t) => t.client && selectedClient.includes(t.client));
    const matchesProject =
      selectedProject.length === 0 ||
      row.tasks.some((t) => (t.project || t.client) && selectedProject.includes((t.project || t.client) as string));
    return matchesSearch && matchesPlant && matchesClient && matchesProject;
  });

  const plants = Array.from(new Set(rows.map((r) => r.name)));
  const clients = Array.from(new Set(rows.flatMap((r) => r.tasks.map((t) => t.client)).filter(Boolean))) as string[];
  const derivedTaskProjects = Array.from(
    new Set(rows.flatMap((r) => r.tasks.map((t) => t.project || t.client)).filter(Boolean))
  ) as string[];
  const availableProjects = derivedTaskProjects;

  const formatTime = (hour: number) => {
    if (timeFormat === "12h") {
      const period = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 || 12;
      return `${displayHour}:00 ${period}`;
    }
    return `${String(hour).padStart(2, "0")}:00`;
  };

  const getTimeSlots = () => Array.from({ length: 24 }, (_, i) => ((customStartHour || 0) + i) % 24);

  // Build merged busy intervals for each plant to eliminate overlaps
  const buildMergedIntervals = (tasks: Task[], selectedDate: string) => {
    // Clamp each task to the selected day
    const dayStart = new Date(`${selectedDate}T00:00:00`).getTime();
    const dayEnd = new Date(`${selectedDate}T24:00:00`).getTime();

    const rawIntervals = tasks
      .map((task) => {
        const s = new Date(task.actualStart).getTime();
        const e = new Date(task.actualEnd).getTime();
        const startMs = Math.max(s, dayStart);
        const endMs = Math.min(e, dayEnd);
        if (!(startMs < endMs)) return null;
        return {
          startHour: (startMs - dayStart) / (1000 * 60 * 60),
          endHour: (endMs - dayStart) / (1000 * 60 * 60),
          actualStartMs: startMs,
          actualEndMs: endMs,
        };
      })
      .filter((iv): iv is { startHour: number; endHour: number; actualStartMs: number; actualEndMs: number } => !!iv)
      .sort((a, b) => a.startHour - b.startHour);

    // Merge overlapping or touching intervals
    const mergedIntervals: {
      startHour: number;
      endHour: number;
      actualStartMs: number;
      actualEndMs: number;
      duration: number; // minutes
    }[] = [];

    for (const iv of rawIntervals) {
      const last = mergedIntervals[mergedIntervals.length - 1];
      if (!last || iv.startHour > last.endHour) {
        mergedIntervals.push({
          startHour: iv.startHour,
          endHour: iv.endHour,
          actualStartMs: iv.actualStartMs,
          actualEndMs: iv.actualEndMs,
          duration: Math.round((iv.actualEndMs - iv.actualStartMs) / (1000 * 60)),
        });
      } else {
        // Overlaps or touches; extend
        if (iv.endHour > last.endHour) {
          last.endHour = iv.endHour;
          last.actualEndMs = iv.actualEndMs;
        }
        if (iv.startHour < last.startHour) {
          last.startHour = iv.startHour;
          last.actualStartMs = iv.actualStartMs;
        }
        last.duration = Math.round((last.actualEndMs - last.actualStartMs) / (1000 * 60));
      }
    }

    return mergedIntervals;
  };

  const getBarWindowHelpers = () => {
    const slots = getTimeSlots();
    const windowStart = slots[0];
    const windowEnd = slots[0] !== 0 ? (slots[slots.length - 1] % 24) + 25 : 24;
    const isInWindow = (start: number, end: number) => {
      if (windowStart < windowEnd) return end > windowStart && start < windowEnd;
      return end > windowStart || start < windowEnd;
    };
    const getBarProps = (start: number, end: number) => {
      let barStart = start;
      let barEnd = end;
      if (windowStart < windowEnd) {
        barStart = Math.max(start, windowStart);
        barEnd = Math.min(end, windowEnd + 1);
      } else {
        if (start < windowStart && end <= windowStart) {
          barStart = start;
          barEnd = Math.min(end, windowEnd + 1);
        } else if (start >= windowStart) {
          barStart = Math.max(start, windowStart);
          barEnd = end;
        } else {
          barStart = start;
          barEnd = end;
        }
      }
      const offset = (barStart - windowStart + 24) % 24;
      let width = barEnd - barStart;
      if (width < 0) width = 0;
      if (offset + width > slots.length) {
        width = slots.length - offset;
        if (width < 0) width = 0;
      }
      return { offset, width, slots };
    };
    return { isInWindow, getBarProps };
  };

  // Client legend removed to anonymize busy blocks

  const computeUsedHours = (tasks: Task[]): number => {
    // Merge intervals to compute total occupied time (in hours)
    const intervals = tasks
      .map((t) => ({ start: new Date(t.actualStart).getTime(), end: new Date(t.actualEnd).getTime() }))
      .filter((i) => i.end > i.start)
      .sort((a, b) => a.start - b.start);
    const merged: { start: number; end: number }[] = [];
    for (const it of intervals) {
      if (!merged.length || merged[merged.length - 1].end < it.start) merged.push({ ...it });
      else merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, it.end);
    }
    const totalMs = merged.reduce((sum, m) => sum + (m.end - m.start), 0);
    return Math.round((totalMs / 3600000) * 100) / 100;
  };

  if (loading) {
    return (
      <div className="max-w-full mx-aut">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Plant Schedule Calendar</h2>
          <p className="text-gray-600 dark:text-gray-400">Monitor schedules aggregated by plant</p>
        </div>
        <div className="bg-white dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-white/[0.05] p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search plants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 dark:border-white/[0.05] rounded-lg bg-white dark:bg-white/[0.05] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-full"
              />
            </div>
            <DatePickerInput value={selectedDate} onChange={handleDateChange} className="w-48" />
          </div>
        </div>
        <div className="flex items-center justify-center h-64 bg-white dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-white/[0.05]">
          <div className="text-gray-500 dark:text-gray-400">Loading calendar data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-full mx-aut">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="text-red-800 dark:text-red-200 font-medium">Error loading calendar data</div>
          <div className="text-red-600 dark:text-red-300 text-sm mt-1">{error}</div>
          <button
            onClick={() => fetchGanttData(selectedDate)}
            className="mt-3 px-4 py-2 bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 rounded-lg hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { isInWindow, getBarProps } = getBarWindowHelpers();

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 w-full">
        <div className="w-full">
          <div className="mb-6 w-full">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Plant Schedule Calendar</h2>
            <p className="text-gray-600 dark:text-gray-400">Manage and monitor schedules grouped by plant</p>
          </div>

          <div className="w-full bg-white dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-white/[0.05] p-4 mb-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search plants..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-200 dark:border-white/[0.05] rounded-lg bg-white dark:bg-white/[0.05] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-full sm:w-64"
                  />
                </div>

                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                    showFilters
                      ? "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400"
                      : "bg-white dark:bg-white/[0.05] border-gray-200 dark:border-white/[0.05] text-gray-700 dark:text-gray-300"
                  } hover:bg-gray-50 dark:hover:bg-white/[0.08]`}
                >
                  <Filter className="h-4 w-4" />
                  Filters
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex flex-row items-center justify-end gap-2 w-full">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Start Hour</label>
                  <button
                    onClick={() => setCustomStartHour(((customStartHour || 0) + 1) % 24)}
                    className="px-3 py-2 text-left border border-gray-200 dark:border-white/[0.05] rounded-lg bg-white dark:bg-white/[0.05] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    title="Start Hour"
                  >
                    {`${String(customStartHour).padStart(2, "0")}:00`}
                  </button>
                </div>
                <DatePickerInput value={selectedDate} onChange={handleDateChange} className="w-48" />
                <button
                  onClick={() => handleDateChange(new Date().toISOString().split("T")[0])}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.05] rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.08] transition-colors"
                >
                  <Calendar className="h-4 w-4" />
                  Today
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/[0.05]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <SearchableDropdown
                      options={plants}
                      value={selectedPlant}
                      onChange={(value) => setSelectedPlant(Array.isArray(value) ? value : [])}
                      getOptionLabel={(o: string) => o}
                      getOptionValue={(o: string) => o}
                      label="Plant"
                      placeholder="All Plants"
                      multiple
                    />
                  </div>

                  <div className="relative">
                    <SearchableDropdown
                      options={clients}
                      value={selectedClient}
                      onChange={(value) => setSelectedClient(Array.isArray(value) ? value : [])}
                      getOptionLabel={(o: string) => o}
                      getOptionValue={(o: string) => o}
                      label="Client"
                      placeholder="All Clients"
                      multiple
                    />
                  </div>

                  <div className="relative">
                    <SearchableDropdown
                      options={availableProjects}
                      value={selectedProject}
                      onChange={(value) => setSelectedProject(Array.isArray(value) ? value : [])}
                      getOptionLabel={(o: string) => o}
                      getOptionValue={(o: string) => o}
                      label="Projects"
                      placeholder="All Projects"
                      multiple
                    />
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Time Format
                    </label>
                    <button
                      onClick={() => {
                        setTimeFormat(timeFormat === "24h" ? "12h" : "24h");
                        setCustomStartHour(0);
                      }}
                      className="w-full px-3 py-2 text-left border border-gray-200 dark:border-white/[0.05] rounded-lg bg-white dark:bg-white/[0.05] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      {timeFormat === "24h" ? "24-Hour Format" : "12-Hour Format"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mb-4 w-full">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {new Date(selectedDate).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}{" "}
              -{" "}
              {new Date(new Date(selectedDate).setDate(new Date(selectedDate).getDate() + 1)).toLocaleDateString(
                "en-US",
                { weekday: "long", year: "numeric", month: "long", day: "numeric" }
              )}
            </h2>
          </div>

          <div className="relative rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] w-full ">
            <div className="w-full overflow-x-auto">
              <div className="min-w-full w-full">
                <div className="flex border-b border-gray-300 dark:border-white/[0.05] sticky top-0 z-15 bg-white dark:bg-white/[0.03] pr-3">
                  <div className="w-16 px-2 py-3 font-medium text-gray-500 text-xs dark:text-gray-400 border-r border-gray-300 dark:border-white/[0.05] text-center flex-shrink-0">
                    SNo
                  </div>
                  <div className="w-48 px-5 py-3 font-medium text-gray-500 text-xs dark:text-gray-400 border-r border-gray-300 dark:border-white/[0.05] flex-shrink-0">
                    Plant
                  </div>
                  {getTimeSlots().map((time) => (
                    <div
                      key={time}
                      className={`flex-1 px-1 py-3 text-center tracking-tight leading-tight font-medium text-gray-500 text-[8.5px] dark:text-gray-400 border-r ${
                        time === 23
                          ? "border-r-2 border-r-gray-400 dark:border-r-white/[0.2]"
                          : "border-gray-300 dark:border-white/[0.05]"
                      } min-w-[40px]`}
                    >
                      {formatTime(time)}
                    </div>
                  ))}
                  <div className="w-24 px-1 py-3 font-medium text-gray-500 text-xs dark:text-gray-400 border-l border-gray-300 dark:border-white/[0.05] text-center flex-shrink-0">
                    Used Hrs
                  </div>
                </div>

                <div className="divide-y divide-gray-400 dark:divide-white/[0.05] custom-scrollbar pr-[6.5px] overflow-y-auto max-h-96">
                  {filteredRows.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400">
                      No plants found for the selected criteria
                    </div>
                  ) : (
                    filteredRows.map((row, idx) => {
                      const slots = getTimeSlots();
                      const windowStart = slots[0];
                      const timeSlotsLength = slots.length;
                      const mergedIntervals = buildMergedIntervals(row.tasks, selectedDate);

                      const usedHours = computeUsedHours(row.tasks);

                      return (
                        <div key={row.id} className="flex group transition-colors white">
                          <div className="w-16 px-2 py-1 text-gray-700 text-xs dark:text-white/90 border-r border-gray-300 dark:border-white/[0.05] flex items-center justify-center flex-shrink-0">
                            {idx + 1}
                          </div>
                          <div
                            className={`w-48 px-5 py-1 text-gray-700 text-xs dark:text-white/90 border-r border-gray-300 dark:border-white/[0.05] flex items-center flex-shrink-0`}
                          >
                            {row.name}
                          </div>
                          <div className="flex-1 flex relative">
                            {/* Render busy blocks (no client labels) */}
                            {mergedIntervals.map((iv, i) => {
                              if (!isInWindow(iv.startHour, iv.endHour)) return null;
                              const { offset, width, slots: s } = getBarProps(iv.startHour, iv.endHour);
                              if (width <= 0) return null;
                              return (
                                <Tooltip
                                  key={`${row.id}-${i}`}
                                  content={`Plant: ${row.name}\n${formatDateTimeForTooltip(
                                    new Date(iv.actualStartMs).toISOString()
                                  )} to ${formatDateTimeForTooltip(new Date(iv.actualEndMs).toISOString())}\nBusy: ${
                                    iv.duration
                                  }m`}
                                >
                                  <div
                                    className="absolute top-1 h-4 rounded bg-blue-500 opacity-60 hover:opacity-80 transition-opacity cursor-default"
                                    style={{
                                      left: `${(offset / s.length) * 100 - 0.25}%`,
                                      width: `${(width / s.length) * 100 + 0.5}%`,
                                      zIndex: 1,
                                    }}
                                  />
                                </Tooltip>
                              );
                            })}

                            {slots.map((time) => (
                              <div
                                key={`${row.id}-${time}`}
                                className={`flex-1 h-6 border-r ${
                                  time === 23
                                    ? "border-r-2 border-r-gray-400 dark:border-r-white/[0.2]"
                                    : "border-gray-300 dark:border-white/[0.05]"
                                } relative min-w-[40px]`}
                              />
                            ))}
                          </div>
                          <div className="w-24 px-1 py-1 text-gray-700 text-xs dark:text-white/90 border-l border-gray-300 dark:border-white/[0.05] flex items-center justify-center flex-shrink-0">
                            {usedHours}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Legend removed to anonymize tasks */}
        </div>
      </div>
    </div>
  );
}
