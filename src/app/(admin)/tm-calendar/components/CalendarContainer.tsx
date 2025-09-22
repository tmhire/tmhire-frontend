"use client";

import React, { useState, useEffect } from "react";
import { Search, Filter, Calendar, ZoomIn, ZoomOut } from "lucide-react";
import { useApiClient } from "@/hooks/useApiClient";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import DatePickerInput from "@/components/form/input/DatePickerInput";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Tooltip from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import SearchableDropdown from "@/components/form/SearchableDropdown";

// Types for better type safety and backend integration
type ApiTask = {
  id: string;
  start: string;
  end: string;
  client: string;
  project: string;
  schedule_no: string;
};

type Task = {
  id: string;
  color: string;
  client: string;
  type: string;
  actualStart: string;
  actualEnd: string;
  project: string;
  schedule_no: string;
};

type Item = {
  id: string;
  name: string;
  plant: string;
  item: "mixer" | "pump";
  type: "line" | "boom" | null;
  client: string | null;
  project: string | null;
  schedule_no: string | null;
  tasks: Task[];
};

type ApiItem = {
  id: string;
  name: string;
  plant: string;
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

// Types for plants, pumps, and TMs
type Plant = {
  _id: string;
  name: string;
  location: string;
  address: string;
};

type Pump = {
  _id: string;
  identifier: string;
  type: "line" | "boom";
  plant_id: string;
};

type TransitMixer = {
  _id: string;
  identifier: string;
  plant_id: string | null;
};

type Project = {
  _id: string;
  name: string;
};

// const timeSlots = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

// Helper function to calculate duration between two times
const calculateDuration = (start: string, end: string): number => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  return Math.round(diffMs / (1000 * 60));
};

// Helper function to format date and time for tooltips
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

// Helper funciton to format hour duration into hours and minutes
export function formatHoursAndMinutes(decimalHours: number): string {
  if (isNaN(decimalHours) || decimalHours < 0) return "0 hrs 0 mins";

  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);

  if (hours === 0) {
    return `${minutes} mins`;
  } else if (minutes === 0) {
    return `${hours} hrs`;
  } else {
    return `${hours} hrs ${minutes} mins`;
  }
}

// Task type color map
const TASK_TYPE_COLORS: Record<string, string> = {
  buffer: "bg-blue-200",
  fixing: "bg-blue-400",
  load: "bg-blue-400",
  onward: "bg-blue-500",
  unload: "bg-blue-600", // TM unloading at site
  pump: "bg-blue-600", // Pumping operation
  removal: "bg-blue-500",
  cushion: "bg-blue-300",
  return: "bg-blue-500",
};

// Client color palette (no overlap with task type colors)
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
  // Add more if needed, but exclude blue, green, yellow, purple
];

// Helper to extract task type from id
const getTaskType = (id: string) => id.split("-")[0];

// Helper function to transform API data to component format
const transformApiData = (apiData: ApiResponse, plantMap: Map<string, string>): Item[] => {
  // Create a map of unique clients
  const uniqueClients = new Set<string>();
  apiData.data.mixers.forEach((mixer) => {
    mixer.tasks.forEach((task) => {
      if (task.client) uniqueClients.add(task.client);
    });
  });

  // Assign colors for each unique client from CLIENT_TAILWIND_COLORS
  const clientColors = new Map<string, string>();
  Array.from(uniqueClients).forEach((client, index) => {
    const color = CLIENT_TAILWIND_COLORS[index % CLIENT_TAILWIND_COLORS.length];
    clientColors.set(client, color);
  });

  const getMixerOrPump = (item: ApiItem, itemType: "mixer" | "pump"): Item => {
    const transformedTasks: Task[] = item?.tasks?.map((task) => {
      const rawType = getTaskType(task.id);
      // Map legacy 'work' to new names based on item type
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

    // Determine mixer's current client (first task's client or null)
    const currentClient = transformedTasks.length > 0 ? transformedTasks[0].client : null;
    const currentProject = transformedTasks.length > 0 ? transformedTasks[0].project : null;
    const currentScheduleNo = transformedTasks.length > 0 ? transformedTasks[0].schedule_no : null;

    // Convert plant ID to plant name
    const plantName = plantMap.get(item.plant) || item.plant;

    return {
      id: item.id,
      name: item.name,
      plant: plantName,
      client: currentClient,
      project: currentProject,
      schedule_no: currentScheduleNo,
      item: itemType,
      type: item.type || null,
      tasks: transformedTasks,
    };
  };

  const mixers = apiData?.data?.mixers
    ?.map((mixer) => {
      return getMixerOrPump(mixer, "mixer");
    })
    ?.sort((a, b) => a.name.localeCompare(b.name));
  const pumps = apiData?.data?.pumps
    ?.map((pump) => {
      return getMixerOrPump(pump, "pump");
    })
    ?.sort((a, b) => a.name.localeCompare(b.name));
  return [...mixers, ...pumps];
};

// Type color mapping
const typeRowColors: Record<string, string> = {
  tm: "bg-yellow-500/70 hover:bg-yellow-500/90", // light blue
  line: "bg-blue-500/70 hover:bg-blue-500/90", // light blue
  boom: "bg-green-500/70 hover:bg-green-500/90", // light green
};

export default function CalendarContainer() {
  const { data: session, status } = useSession();
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get initial date from URL or use current date
  const initialDate = searchParams.get("date") || new Date().toISOString().split("T")[0];

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItem, setSelectedItem] = useState<"all" | "mixer" | "pump">("all");
  const [selectedPlant, setSelectedPlant] = useState<string[]>([]);
  const [selectedClient, setSelectedClient] = useState<string[]>([]);
  const [selectedPump, setSelectedPump] = useState<string[]>([]);
  const [selectedTM, setSelectedTM] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState<string[]>([]);
  const [timeFormat, setTimeFormat] = useState<"12h" | "24h" | undefined>(session?.preferred_format);
  const [customStartHour, setCustomStartHour] = useState<number | undefined>(session?.custom_start_hour);
  const [ganttData, setGanttData] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Zoom state
  const zoomLevels = React.useMemo(
    () => [
      { id: "sm", colMinWidth: 36, timeFontSize: 8, pillFontSize: 9 },
      { id: "md", colMinWidth: 48, timeFontSize: 10, pillFontSize: 10 },
      { id: "lg", colMinWidth: 64, timeFontSize: 12, pillFontSize: 11 },
      { id: "xl", colMinWidth: 80, timeFontSize: 14, pillFontSize: 12 },
    ],
    []
  );
  const [zoomIndex, setZoomIndex] = useState(0);
  const currentZoom = zoomLevels[zoomIndex];

  // Dropdown states
  const [isItemFilterOpen, setIsItemFilterOpen] = useState(false);
  const [isTimeFormatOpen, setIsTimeFormatOpen] = useState(false);
  const [isStartHourFilterOpen, setIsStartHourFilterOpen] = useState(false);

  const { fetchWithAuth } = useApiClient();

  useEffect(() => {
    if (status === "authenticated") {
      if (!timeFormat) {
        setTimeFormat(session?.preferred_format);
      }
      if (!customStartHour) {
        setCustomStartHour(session.custom_start_hour);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status]);

  // Fetch plants, pumps, and TMs data
  const { data: plantsData } = useQuery<Plant[]>({
    queryKey: ["plants"],
    queryFn: async () => {
      const response = await fetchWithAuth("/plants");
      const data = await response.json();
      if (data.success) {
        return data.data;
      }
      return [];
    },
    enabled: status === "authenticated",
  });

  const { data: pumpsData } = useQuery<Pump[]>({
    queryKey: ["pumps"],
    queryFn: async () => {
      const response = await fetchWithAuth("/pumps");
      const data = await response.json();
      if (data.success) {
        return data.data;
      }
      return [];
    },
    enabled: status === "authenticated",
  });

  const { data: tmsData } = useQuery<TransitMixer[]>({
    queryKey: ["transit-mixers"],
    queryFn: async () => {
      const response = await fetchWithAuth("/tms");
      const data = await response.json();
      if (data.success) {
        return data.data;
      }
      return [];
    },
    enabled: status === "authenticated",
  });

  const { data: projectsData } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await fetchWithAuth("/projects");
      const data = await response.json();
      if (data.success) {
        return data.data;
      }
      return [];
    },
    enabled: status === "authenticated",
  });

  // Create plant ID to name mapping
  const plantMap = React.useMemo(() => {
    if (!plantsData) return new Map<string, string>();
    return new Map(plantsData.map((plant) => [plant._id, plant.name]));
  }, [plantsData]);

  // Memoized clientColors map for use in rendering
  const clientColors = React.useMemo(() => {
    // Gather all unique clients from ganttData
    const uniqueClients = Array.from(
      new Set(ganttData.flatMap((mixer) => mixer.tasks.map((task) => task.client)).filter(Boolean))
    );
    const map = new Map();
    uniqueClients.forEach((client, index) => {
      const color = CLIENT_TAILWIND_COLORS[index % CLIENT_TAILWIND_COLORS.length];
      map.set(client, color);
    });
    return map;
  }, [ganttData]);

  // Update URL when date changes
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", newDate);
    router.push(`?${params.toString()}`);
  };

  // Fetch gantt data from API
  const fetchGanttData = async (date: string) => {
    try {
      setLoading(true);
      setError(null);
      const time = `${String(customStartHour || 0).padStart(2, "0")}:00:00`;

      const response = await fetchWithAuth("/calendar/gantt", {
        method: "POST",
        body: JSON.stringify({
          query_date: `${date}T${time}`,
        }),
      });

      const data: ApiResponse = await response.json();
      if (data.success) {
        const transformedData = transformApiData(data, plantMap);
        setGanttData(transformedData);
      } else {
        setError(data.message || "Failed to fetch gantt data");
      }
    } catch (err) {
      console.error("Error fetching gantt data:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch gantt data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when component mounts, date changes, or session status changes
  useEffect(() => {
    if (status === "loading") {
      return; // Don't fetch while session is loading
    }

    if (status === "authenticated" && session) {
      fetchGanttData(selectedDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, customStartHour, status]);

  // Filter data based on search term and selected filters
  const filteredData = ganttData.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClient = selectedClient.length === 0 || (item.client && selectedClient.includes(item.client));
    const matchesItem = selectedItem === "all" || item.item === selectedItem;

    // Multi-select filters using SearchableDropdown
    const matchesPlant = selectedPlant.length === 0 || selectedPlant.includes(item.plant);
    const matchesPumps = selectedPump.length === 0 || (item.item === "pump" && selectedPump.includes(item.name));
    const matchesTMs = selectedTM.length === 0 || (item.item === "mixer" && selectedTM.includes(item.name));
    const matchesProject =
      selectedProject.length === 0 ||
      item.tasks.some((t) => {
        const projectOrClient = t.project || t.client;
        return projectOrClient && selectedProject.includes(projectOrClient);
      });

    return (
      matchesSearch && matchesPlant && matchesClient && matchesItem && matchesPumps && matchesTMs && matchesProject
    );
  });

  const formatTime = (hour: number) => {
    if (timeFormat === "12h") {
      const period = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 || 12;
      return `${displayHour}:00 ${period}`;
    }
    return `${String(hour).padStart(2, "0")}:00`;
  };

  // Get unique values for filter options
  const plants = Array.from(new Set(ganttData.map((item) => item.plant)));
  const clients = Array.from(
    new Set(
      ganttData.flatMap((item) => item.tasks.map((t) => t.client)).filter((client): client is string => Boolean(client))
    )
  );

  // Get available pumps and TMs from fetched data
  const availablePumps = pumpsData?.map((pump) => pump.identifier) || [];
  const availableTMs = tmsData?.map((tm) => tm.identifier) || [];
  const derivedTaskProjects = Array.from(
    new Set(
      ganttData
        .flatMap((item) => item.tasks.map((t) => t.project || t.client))
        .filter((name): name is string => Boolean(name))
    )
  );
  const availableProjects = (projectsData?.map((p) => p.name) || []).length
    ? (projectsData?.map((p) => p.name) as string[])
    : derivedTaskProjects;

  // Get unique clients with their colors for the legend
  const clientLegend = Object.values(
    ganttData
      .flatMap((mixer) => mixer.tasks)
      .reduce((acc, task) => {
        if (task.client && !acc[task.client]) {
          acc[task.client] = { name: task.client, color: task.color };
        }
        return acc;
      }, {} as Record<string, { name: string; color: string }>)
  );

  // Compute client stats for the filtered data
  type ClientStat = {
    totalMinutes: number;
    mixers: Set<string>;
    schedules: number;
    firstStart: string;
    lastEnd: string;
  };
  const clientStats: Record<string, ClientStat> = {};
  filteredData.forEach((mixer) => {
    mixer.tasks.forEach((task) => {
      if (!task.client) return;
      if (!clientStats[task.client]) {
        clientStats[task.client] = {
          totalMinutes: 0,
          mixers: new Set(),
          schedules: 0,
          firstStart: task.actualStart,
          lastEnd: task.actualEnd,
        };
      } else {
        // Update firstStart and lastEnd
        if (task.actualStart < clientStats[task.client].firstStart) {
          clientStats[task.client].firstStart = task.actualStart;
        }
        if (task.actualEnd > clientStats[task.client].lastEnd) {
          clientStats[task.client].lastEnd = task.actualEnd;
        }
      }
      clientStats[task.client].mixers.add(mixer.name);
      clientStats[task.client].schedules += 1;
    });
  });
  // Calculate totalMinutes as the difference between firstStart and lastEnd
  Object.values(clientStats).forEach((stat) => {
    if (stat.firstStart && stat.lastEnd) {
      const startTotal = new Date(stat.firstStart).getTime();
      const endTotal = new Date(stat.lastEnd).getTime();
      stat.totalMinutes = endTotal - startTotal / 60000;
      if (stat.totalMinutes < 0) stat.totalMinutes = 0;
    }
  });

  // Helper to generate time slots based on custom start hour
  const getTimeSlots = () => {
    // Generate 24 slots starting from customStartHour
    return Array.from({ length: 24 }, (_, i) => ((customStartHour || 0) + i) % 24);
  };

  if (loading) {
    return (
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between w-full mb-1 gap-4">
            {/* Header */}
            <div className=" w-1/3">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Schedule Calendar</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Manage and monitor mixer schedules across all production lines
              </p>
            </div>
          </div>
        </div>

        {/* Loading State */}
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

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 w-full">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between w-full mb-1 gap-4">
        {/* Header */}
        <div className=" w-1/3">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Schedule Calendar</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage and monitor mixer schedules across all production lines
          </p>
        </div>

        {/* Controls Bar */}
        <div className="w-2/3 lg:w-auto bg-white dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-white/[0.05] p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Left side - Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search mixers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-200 dark:border-white/[0.05] rounded-lg bg-white dark:bg-white/[0.05] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-full sm:w-64"
                />
              </div>

              {/* Filter Toggle */}
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

            {/* Right side - Date Selection */}
            <div className="flex items-center gap-3">
              <div className="flex flex-row items-center justify-end gap-2 w-full">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Start Hour</label>
                <button
                  onClick={() => setIsStartHourFilterOpen(!isStartHourFilterOpen)}
                  className="px-3 py-2 text-left border border-gray-200 dark:border-white/[0.05] rounded-lg bg-white dark:bg-white/[0.05] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  title="Start Hour"
                >
                  {`${String(customStartHour).padStart(2, "0")}:00`}
                </button>
                {isStartHourFilterOpen && (
                  <div className="absolute z-20 mt-1 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-white/[0.05] max-h-60 overflow-y-auto">
                    <div className="p-2 text-gray-800 dark:text-white/90">
                      {Array.from({ length: 24 }, (_, i) => (
                        <button
                          key={i}
                          className="w-full px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                          onClick={() => {
                            setCustomStartHour(i);
                            setIsStartHourFilterOpen(false);
                          }}
                        >
                          {`${String(i).padStart(2, "0")}:00`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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
        </div>
      </div>
      {/* Expandable Filters */}
      {showFilters && (
        <div className="w-full mb-1 bg-white dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-white/[0.05] p-4">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {/* Item Filter */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">TM or Pump</label>
              <button
                onClick={() => setIsItemFilterOpen(!isItemFilterOpen)}
                className="dropdown-toggle w-full px-3 py-2 text-left border border-gray-200 dark:border-white/[0.05] rounded-lg bg-white dark:bg-white/[0.05] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                {selectedItem === "all" ? "All Vehicles" : selectedItem === "mixer" ? "TMs" : "Pumps"}
              </button>
              <Dropdown isOpen={isItemFilterOpen} onClose={() => setIsItemFilterOpen(false)} className="w-full">
                <div className="p-2 text-gray-800 dark:text-white/90">
                  <button
                    className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    onClick={() => {
                      setSelectedItem("all");
                      setIsItemFilterOpen(false);
                    }}
                  >
                    All Vehicles
                  </button>
                  <button
                    className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    onClick={() => {
                      setSelectedItem("mixer");
                      setIsItemFilterOpen(false);
                    }}
                  >
                    TMs
                  </button>
                  <button
                    className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    onClick={() => {
                      setSelectedItem("pump");
                      setIsItemFilterOpen(false);
                    }}
                  >
                    Pumps
                  </button>
                </div>
              </Dropdown>
            </div>

            {/* Plant Filter */}
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

            {/* Client Filter */}
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

            {/* Pump Filter */}
            <div className="relative">
              <SearchableDropdown
                options={availablePumps}
                value={selectedPump}
                onChange={(value) => setSelectedPump(Array.isArray(value) ? value : [])}
                getOptionLabel={(o: string) => o}
                getOptionValue={(o: string) => o}
                label="Pumps"
                placeholder="All Pumps"
                multiple
              />
            </div>

            {/* TM Filter */}
            <div className="relative">
              <SearchableDropdown
                options={availableTMs}
                value={selectedTM}
                onChange={(value) => setSelectedTM(Array.isArray(value) ? value : [])}
                getOptionLabel={(o: string) => o}
                getOptionValue={(o: string) => o}
                label="Transit Mixers"
                placeholder="All TMs"
                multiple
              />
            </div>

            {/* Projects Filter */}
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

            {/* Time Format Filter */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Time Format</label>
              <button
                onClick={() => setIsTimeFormatOpen(!isTimeFormatOpen)}
                className="w-full px-3 py-2 text-left border border-gray-200 dark:border-white/[0.05] rounded-lg bg-white dark:bg-white/[0.05] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                {timeFormat === "24h" ? "24-Hour Format" : "12-Hour Format"}
              </button>
              {isTimeFormatOpen && (
                <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-white/[0.05]">
                  <div className="p-2 text-gray-800 dark:text-white/90">
                    <button
                      className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      onClick={() => {
                        setCustomStartHour(0); // reset to 00:00
                        setTimeFormat("24h");
                        setIsTimeFormatOpen(false);
                      }}
                    >
                      24-Hour Format
                    </button>
                    <button
                      className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      onClick={() => {
                        setCustomStartHour(0); // reset to 00:00
                        setTimeFormat("12h");
                        setIsTimeFormatOpen(false);
                      }}
                    >
                      12-Hour Format
                    </button>
                  </div>
                </div>
              )}
              {/* Show custom start hour selector if 24h-custom is selected */}
            </div>
          </div>
        </div>
      )}

      {/* Date Display */}
      <div className="mb-1 w-full flex flex-row justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {new Date(selectedDate).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}{" "}
          -{" "}
          {new Date(new Date(selectedDate).setDate(new Date(selectedDate).getDate() + 1)).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </h2>
        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoomIndex((z) => Math.max(0, z - 1))}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-white/[0.05] bg-white dark:bg-white/[0.05] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.08]"
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={() => setZoomIndex((z) => Math.min(zoomLevels.length - 1, z + 1))}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-white/[0.05] bg-white dark:bg-white/[0.05] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.08]"
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Scrollable Gantt Chart Container */}
      <div className="relative rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] w-full max-w-[calc(100vw-48px)]">
        {/* Inner wrapper that can grow horizontally */}
        <div className="w-full overflow-x-auto">
          <div className="min-w-full">
            {" "}
            {/* Changed from w-full to min-w-full */}
            {/* Inner content grows but container scrolls */} {/* Time Header */}
            <div className="flex border-b border-gray-300 dark:border-white/[0.05] sticky top-0 z-15 bg-white dark:bg-white/[0.03] pr-3 ">
              {/* Serial Number Column */}
              <div className="w-16 px-2 py-3 font-medium text-gray-500 text-xs dark:text-gray-400 border-r border-gray-300 dark:border-white/[0.05] text-center flex-shrink-0">
                SNo
              </div>
              <div className="w-32 px-5 py-3 font-medium text-gray-500 text-xs dark:text-gray-400 border-r border-gray-300 dark:border-white/[0.05] flex-shrink-0">
                Mixer ID
              </div>
              {getTimeSlots().map((time) => (
                <div
                  key={time}
                  className={`flex-1 px-1 py-3 text-center tracking-tight leading-tight font-medium text-gray-500 dark:text-gray-400 border-r ${
                    time === 23
                      ? "border-r-2 border-r-gray-400 dark:border-r-white/[0.2]"
                      : "border-gray-300 dark:border-white/[0.05]"
                  }`}
                  style={{ minWidth: `${currentZoom.colMinWidth}px`, fontSize: `${currentZoom.timeFontSize}px` }}
                >
                  {formatTime(time)}
                </div>
              ))}
              {/* Free Time Column */}
              <div className="w-24 px-1 py-3 font-medium text-gray-500 text-xs dark:text-gray-400 border-l border-gray-300 dark:border-white/[0.05] text-center flex-shrink-0">
                <div className="flex items-center justify-center gap-1">
                  <span>Unused Hrs</span>
                  <button
                    onClick={() => setSortDirection(sortDirection === "desc" ? "asc" : "desc")}
                    className=" hover:bg-gray-100 dark:hover:bg-white/[0.05] rounded transition-colors"
                    title={`Sort ${sortDirection === "desc" ? "ascending" : "descending"}`}
                  >
                    {sortDirection === "desc" ? "↓" : "↑"}
                  </button>
                </div>
              </div>
            </div>
            {/* Gantt Rows */}
            <div className="divide-y divide-gray-400 dark:divide-white/[0.05] custom-scrollbar pr-[6.5px] overflow-y-auto max-h-96">
              {filteredData.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400">
                  No mixers found for the selected criteria
                </div>
              ) : (
                // Sort data by free time in descending order, keeping TMs and pumps separate
                [...filteredData]
                  .sort((a, b) => {
                    // Calculate free time for both items
                    let freeTimeA = 24;
                    let freeTimeB = 24;

                    a.tasks.forEach((task) => {
                      freeTimeA -= calculateDuration(task.actualStart, task.actualEnd) / 60;
                    });
                    b.tasks.forEach((task) => {
                      freeTimeB -= calculateDuration(task.actualStart, task.actualEnd) / 60;
                    });

                    freeTimeA = Math.round(freeTimeA);
                    freeTimeB = Math.round(freeTimeB);

                    // If both are same type, sort by free time based on sortDirection
                    if (a.item === b.item) {
                      return sortDirection === "desc" ? freeTimeB - freeTimeA : freeTimeA - freeTimeB;
                    }

                    // Keep TMs and pumps separate by maintaining original order for different types
                    return 0;
                  })
                  .map((item, idx) => {
                    // --- NEW LOGIC FOR DYNAMIC TIMESLOTS ---

                    const slots = getTimeSlots();
                    const windowStart = slots[0];
                    const windowEnd = slots[0] !== 0 ? (slots[slots.length - 1] % 24) + 25 : 24;
                    // Helper to check if a time is within the window, considering wrap-around
                    const isInWindow = (start: number, end: number) => {
                      if (windowStart < windowEnd) {
                        return end > windowStart && start < windowEnd;
                      } else {
                        // Wraps around midnight
                        return end > windowStart || start < windowEnd;
                      }
                    };
                    // Helper to get offset and width in the current window
                    const getBarProps = (start: number, end: number) => {
                      let barStart = start;
                      let barEnd = end;
                      if (windowStart < windowEnd) {
                        barStart = Math.max(start, windowStart);
                        barEnd = Math.min(end, windowEnd + 1);
                      } else {
                        // Wraps around midnight
                        if (start < windowStart && end <= windowStart) {
                          // Task is in the early part of the window (after midnight)
                          barStart = start;
                          barEnd = Math.min(end, windowEnd + 1);
                        } else if (start >= windowStart) {
                          // Task is in the late part of the window (before midnight)
                          barStart = Math.max(start, windowStart);
                          barEnd = end;
                        } else {
                          // Task spans the wrap
                          barStart = start;
                          barEnd = end;
                        }
                      }
                      // Calculate offset and width in slots
                      const offset = (barStart - windowStart + 24) % 24;
                      let width = barEnd - barStart;
                      // Clamp width to not exceed window
                      if (width < 0) width = 0;
                      // Clamp width so bar does not extend past the last visible slot
                      if (offset + width > slots.length) {
                        width = slots.length - offset;
                        if (width < 0) width = 0;
                      }
                      return { offset, width };
                    };

                    // // --- Group tasks by client for background pills ---
                    // const clientTaskGroups: Record<string, Task[]> = {};
                    // item.tasks.forEach((task) => {
                    //   if (!clientTaskGroups[task.client]) clientTaskGroups[task.client] = [];
                    //   clientTaskGroups[task.client].push(task);
                    // });

                    function groupConsecutiveTasks(tasks: Task[]): Task[][] {
                      if (!tasks.length) return [];

                      // Ensure tasks are sorted by actualStart
                      const sortedTasks = [...tasks].sort(
                        (a, b) => new Date(a.actualStart).getTime() - new Date(b.actualStart).getTime()
                      );

                      const groups: Task[][] = [];
                      let currentGroup: Task[] = [sortedTasks[0]];

                      for (let i = 1; i < sortedTasks.length; i++) {
                        const prevEnd = new Date(sortedTasks[i - 1].actualEnd).getTime();
                        const currStart = new Date(sortedTasks[i].actualStart).getTime();

                        // Check if current task starts exactly 1 minute after previous task ends
                        if (currStart === prevEnd) {
                          currentGroup.push(sortedTasks[i]);
                        } else {
                          groups.push(currentGroup);
                          currentGroup = [sortedTasks[i]];
                        }
                      }

                      // Push the last group
                      groups.push(currentGroup);

                      return groups;
                    }
                    const uniqueTasks = groupConsecutiveTasks(item.tasks);
                    // // --- Calculate Free Time ---
                    // const busyIntervals: { start: number; end: number }[] = item.tasks
                    //   .map((task) => {
                    //     let s = new Date(task.actualStart).getTime() / 3600000;
                    //     let e = new Date(task.actualEnd).getTime() / 3600000;
                    //     if (windowStart < windowEnd) {
                    //       s = Math.max(s, windowStart);
                    //       e = Math.min(e, windowEnd + 1);
                    //       if (e <= s) return null;
                    //     } else {
                    //       if (s < windowStart && e <= windowStart) {
                    //         s = s;
                    //         e = Math.min(e, windowEnd + 1);
                    //         if (e <= s) return null;
                    //       } else if (s >= windowStart) {
                    //         s = Math.max(s, windowStart);
                    //         e = e;
                    //         if (e <= s) return null;
                    //       } else {
                    //         s = s;
                    //         e = e;
                    //       }
                    //     }
                    //     return { start: s, end: e };
                    //   })
                    //   .filter(Boolean) as { start: number; end: number }[];
                    // busyIntervals.sort((a, b) => a.start - b.start);
                    // const merged: { start: number; end: number }[] = [];
                    // for (const interval of busyIntervals) {
                    //   if (!merged.length || merged[merged.length - 1].end < interval.start) {
                    //     merged.push({ ...interval });
                    //   } else {
                    //     merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, interval.end);
                    //   }
                    // }
                    let freeTime = 24;
                    item.tasks.forEach((task) => {
                      freeTime -= calculateDuration(task.actualStart, task.actualEnd) / 60;
                    });
                    freeTime = Math.round(freeTime);
                    return (
                      <div key={item.id} className="flex group transition-colors white">
                        {/* Serial Number */}
                        <div className="w-16 px-2 py-1 text-gray-700 text-xs dark:text-white/90 border-r border-gray-300 dark:border-white/[0.05] flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </div>
                        {/* Mixer Name */}
                        <div
                          className={`w-32 px-5 py-1  ${
                            (item.item === "pump" && item.type && typeRowColors[item.type]) || ""
                          }
                               
                          ${
                            (item.item === "mixer" && typeRowColors["tm"]) || ""
                          }  text-gray-700 text-xs dark:text-white/90 border-r border-gray-300 dark:border-white/[0.05] flex items-center flex-shrink-0`}
                        >
                          {item.name.length > 13 ? ".." + item.name.slice(-13) : item.name}
                          {/* {item.name} */}
                        </div>
                        {/* Time Slots */}
                        <div className="flex-1 flex relative">
                          {/* Render background pills for each client */}
                          {uniqueTasks.map((tasks, i) => {
                            // Find earliest start and latest end for this client
                            const starts = tasks.map((t) => new Date(t.actualStart).getTime());
                            const ends = tasks.map((t) => new Date(t.actualEnd).getTime());
                            const minStart =
                              (Math.min(...starts) - new Date(`${selectedDate}T00:00:00.000Z`).getTime()) / 3600000;
                            const maxEnd =
                              (Math.max(...ends) - new Date(`${selectedDate}T00:00:00.000Z`).getTime()) / 3600000;

                            if (!isInWindow(minStart, maxEnd)) return null;
                            const { offset, width } = getBarProps(minStart, maxEnd);
                            if (width <= 0) return null;
                            // Get client color from clientColors map
                            const clientColor = clientColors.get(tasks[0].client) || "bg-gray-300";
                            const timeSlotsLength = getTimeSlots().length;
                            return (
                              <Tooltip
                                key={tasks[0].client + i}
                                content={`Schedule No.: ${tasks[0].schedule_no}\nClient: ${tasks[0].client}\nProject: ${
                                  tasks[0].project
                                }\n${formatDateTimeForTooltip(tasks[0].actualStart)} to ${formatDateTimeForTooltip(
                                  tasks[tasks.length - 1].actualEnd
                                )}\nDuration: ${formatHoursAndMinutes(width)}`}
                              >
                                <div
                                  key={tasks[0].client + i}
                                  className={`absolute - h-6 rounded ${clientColor} opacity-90 z-0 truncate`}
                                  style={{
                                    left: `${(offset / timeSlotsLength) * 100 - 0.25}%`,
                                    width: `${(width / timeSlotsLength) * 100 + 0.5}%`,
                                    zIndex: 1,
                                  }}
                                >
                                  <span
                                    className="text-white items-center justify-center flex h-full truncate"
                                    style={{ fontSize: `${currentZoom.pillFontSize}px` }}
                                  >
                                    {`${(tasks[0].client || "").slice(0, 5)}-${(tasks[0].project || "").slice(0, 5)}`}
                                  </span>
                                </div>
                              </Tooltip>
                            );
                          })}
                          {/* Render bars for each task by type that overlaps the window */}
                          {/* {item.tasks.map((task, i) => {
                              const start =
                                (new Date(task.actualStart).getTime() -
                                  new Date(`${selectedDate}T00:00:00.000Z`).getTime()) /
                                3600000;
                              const end =
                                (new Date(task.actualEnd).getTime() -
                                  new Date(`${selectedDate}T00:00:00.000Z`).getTime()) /
                                3600000;

                              if (!isInWindow(start, end)) return null;
                              const { offset, width } = getBarProps(start, end);
                              if (width <= 0) return null;
                              const duration = calculateDuration(task.actualStart, task.actualEnd);
                              const timeSlotsLength = getTimeSlots().length;
                              return (
                                <Tooltip
                                  key={task.id + i}
                                  content={`Type: ${task.type}\nClient: ${task.client}\n${formatDateTimeForTooltip(
                                    task.actualStart
                                  )} to ${formatDateTimeForTooltip(task.actualEnd)}\nDuration: ${duration}m`}
                                >
                                  <div
                                    className={`absolute top-1 h-4 rounded-sm ${
                                      TASK_TYPE_COLORS[task.type] || "bg-gray-500"
                                    } opacity-100 hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center z-5`}
                                    style={{
                                      left: `${(offset / timeSlotsLength) * 100}%`,
                                      width: `${(width / timeSlotsLength) * 100}%`,
                                      zIndex: 5,
                                    }}
                                  >
                                    <span
                                      className={`text-white ${task.type === "unload" ? "text-[6px]" : "text-[6px]"}`}
                                    >
                                      {task.type === "unload" && item.item === "mixer" ? null : duration}
                                    </span>
                                  </div>
                                </Tooltip>
                              );
                            })} */}
                          {/* Render slot borders */}
                          {slots.map((time) => (
                            <div
                              key={time}
                              className={`flex-1 h-6 border-r ${
                                time === 23
                                  ? "border-r-2 border-r-gray-400 dark:border-r-white/[0.2]"
                                  : "border-gray-300 dark:border-white/[0.05]"
                              } relative`}
                              style={{ minWidth: `${currentZoom.colMinWidth}px` }}
                            />
                          ))}
                        </div>
                        {/* Free Time */}
                        <div className="w-24 px-1 py-1 text-gray-700 text-xs dark:text-white/90 border-l border-gray-300 dark:border-white/[0.05] flex items-center justify-center flex-shrink-0">
                          {freeTime}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Legends: Client and Task Types side by side */}
      <div className="mt-1 bg-white dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-white/[0.05] p-4 w-full">
        <div className="flex flex-wrap md:flex-nowrap gap-4 w-full">
          {/* Client Legend - left half */}
          <div className="flex-1 min-w-[200px] md:border-r md:pr-6 border-gray-200 dark:border-white/[0.05]">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Clients</h3>
            <div className="flex flex-wrap gap-4">
              {clientLegend.map(({ name }) => {
                const stats = clientStats[name];
                let timeString = "0m";
                if (stats) {
                  const hours = Math.floor(stats.totalMinutes / 60);
                  const minutes = stats.totalMinutes % 60;
                  timeString = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                }
                // Get client color from clientColors map
                const color = clientColors.get(name) || "bg-gray-300";
                return (
                  <div key={name} className="flex flex-col items-start gap-1 min-w-[160px]">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 ${color} rounded`}></div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{name}</span>
                    </div>
                    <div className="ml-6 text-xs text-gray-500 dark:text-gray-400">
                      <div>
                        Total Scheduled: <span className="font-medium">{stats ? timeString : "0m"}</span>
                      </div>
                      <div>
                        Mixers Used: <span className="font-medium">{stats ? stats.mixers.size : 0}</span>
                      </div>
                      {/* <div>
                            Schedules: <span className="font-medium">{stats ? stats.schedules : 0}</span>
                          </div> */}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Vehicle Type Legend - right half */}
          <div className="flex-1 min-w-[200px] md:pl-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Vehicle Types</h3>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-yellow-500/70"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Transit Mixer</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-500/70"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Line Pump</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500/70"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Boom Pump</span>
              </div>
              <div className="mt-2 w-full text-xs text-gray-500 dark:text-gray-400">
                Note: The vertical dark border in the timeline indicates day separation at 00:00
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
