"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/useApiClient";
import { Spinner } from "@/components/ui/spinner";
import Button from "@/components/ui/button/Button";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import DatePickerInput from "@/components/form/input/DatePickerInput";
import { Search } from "lucide-react";
import ReportsTable from "./ReportsTable";

type Schedule = {
  _id: string;
  status: string;
  type: "pumping" | "supply" | string;
  client_name: string;
  client_id?: string;
  site_address: string;
  project_name?: string;
  project_id?: string;
  tm_count: number;
  created_at: string;
  plant_id?: string;
  mother_plant_name?: string;
  input_params: {
    schedule_date: string;
    pump_start?: string;
    quantity: number;
    pumping_speed?: number;
  };
};

export default function ReportsContainer() {
  const { status } = useSession();
  const { fetchWithAuth } = useApiClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [isPlantFilterOpen, setIsPlantFilterOpen] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<string>("");
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isClientFilterOpen, setIsClientFilterOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [isProjectFilterOpen, setIsProjectFilterOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>("");

  const { data: schedules, isLoading } = useQuery<Schedule[]>({
    queryKey: ["reports-schedules"],
    queryFn: async () => {
      const response = await fetchWithAuth("/schedules");
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Failed to fetch schedules");
      return data.data as Schedule[];
    },
    enabled: status === "authenticated",
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

  // Clients
  const { data: clients } = useQuery<{ _id: string; name: string }[]>({
    queryKey: ["clients"],
    queryFn: async () => {
      const response = await fetchWithAuth("/clients");
      const data = await response.json();
      if (data.success) return data.data as { _id: string; name: string }[];
      return [];
    },
    enabled: status === "authenticated",
  });

  // Projects
  const { data: projects } = useQuery<{ _id: string; name: string; client_id?: string }[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await fetchWithAuth("/projects");
      const data = await response.json();
      if (data.success) return data.data as { _id: string; name: string; client_id?: string }[];
      return [];
    },
    enabled: status === "authenticated",
  });

  // Usage-based plant filtering sources
  const { data: tms } = useQuery<{ _id: string; plant_id?: string }[]>({
    queryKey: ["tms"],
    queryFn: async () => {
      const response = await fetchWithAuth("/tms");
      const data = await response.json();
      if (data.success) return data.data as { _id: string; plant_id?: string }[];
      return [];
    },
    enabled: status === "authenticated",
  });

  const { data: pumps } = useQuery<{ _id: string; plant_id?: string }[]>({
    queryKey: ["pumps"],
    queryFn: async () => {
      const response = await fetchWithAuth("/pumps");
      const data = await response.json();
      if (data.success) return data.data as { _id: string; plant_id?: string }[];
      return [];
    },
    enabled: status === "authenticated",
  });

  const plantOptions = useMemo(() => {
    return (plants || []).map((p) => ({ id: p._id, name: p.name }));
  }, [plants]);

  const plantIdToName = useMemo(() => {
    return (plants || []).reduce((acc, p) => {
      acc[p._id] = p.name;
      return acc;
    }, {} as Record<string, string>);
  }, [plants]);

  // Derive plant IDs in use from TMs and Pumps
  const plantIdsInUse = useMemo(() => {
    const ids = new Set<string>();
    (tms || []).forEach((tm) => {
      if (tm?.plant_id) ids.add(tm.plant_id);
    });
    (pumps || []).forEach((pump) => {
      if (pump?.plant_id) ids.add(pump.plant_id);
    });
    return ids;
  }, [tms, pumps]);

  const usageFilteredPlantOptions = useMemo(() => {
    if (plantIdsInUse.size === 0) return plantOptions;
    return plantOptions.filter((p) => plantIdsInUse.has(p.id));
  }, [plantOptions, plantIdsInUse]);

  // Client and project options
  const clientOptions = useMemo(() => {
    return (clients || []).map((c) => ({ id: c._id, name: c.name }));
  }, [clients]);

  const projectOptions = useMemo(() => {
    const all = (projects || []).map((prj) => ({ id: prj._id, name: prj.name, client_id: prj.client_id }));
    if (!selectedClient) return all;
    return all.filter((p) => p.client_id === selectedClient);
  }, [projects, selectedClient]);

  const filtered = useMemo(() => {
    if (!schedules) return [] as Schedule[];
    return schedules.filter((s) => {
      const matchesSearch =
        searchQuery === "" ||
        s.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.project_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.site_address.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPlant =
        selectedPlant === "" || s.plant_id === selectedPlant || plantIdToName[s.plant_id || ""] === selectedPlant;

      const matchesDate = !selectedDate || s.input_params.schedule_date === selectedDate;

      const matchesClient = selectedClient === "" || s.client_id === selectedClient;
      const matchesProject = selectedProject === "" || s.project_id === selectedProject;

      return matchesSearch && matchesPlant && matchesDate && matchesClient && matchesProject;
    });
  }, [schedules, searchQuery, selectedPlant, selectedDate, selectedClient, selectedProject, plantIdToName]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }


  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold text-black dark:text-white">Reports</h2>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="px-6 py-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative">
              <span className="absolute -translate-y-1/2 left-4 top-1/2 pointer-events-none">
                <Search size={"15px"} className="text-gray-800 dark:text-white/90" />
              </span>
              <input
                type="text"
                placeholder="Search (client, project, address)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-14 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 xl:w-[430px]"
              />
            </div>

            {/* Client filter */}
            <div className="relative text-sm">
              <Button
                variant="outline"
                onClick={() => setIsClientFilterOpen(!isClientFilterOpen)}
                className="dropdown-toggle"
                size="sm"
              >
                Client: {selectedClient ? (clientOptions.find((c) => c.id === selectedClient)?.name || selectedClient) : "All"}
              </Button>
              <Dropdown isOpen={isClientFilterOpen} onClose={() => setIsClientFilterOpen(false)} className="w-64">
                <div className="p-2 text-gray-800 dark:text-white/90">
                  <button
                    className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    onClick={() => {
                      setSelectedClient("");
                      setSelectedProject("");
                      setIsClientFilterOpen(false);
                    }}
                  >
                    All Clients
                  </button>
                  {clientOptions.map((c) => (
                    <button
                      key={c.id}
                      className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      onClick={() => {
                        setSelectedClient(c.id);
                        setSelectedProject("");
                        setIsClientFilterOpen(false);
                      }}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </Dropdown>
            </div>

            {/* Project filter (dependent on client) */}
            <div className="relative text-sm">
              <Button
                variant="outline"
                onClick={() => setIsProjectFilterOpen(!isProjectFilterOpen)}
                className="dropdown-toggle"
                size="sm"
              >
                Project: {selectedProject ? (projectOptions.find((p) => p.id === selectedProject)?.name || selectedProject) : (selectedClient ? "Select" : "All")}
              </Button>
              <Dropdown isOpen={isProjectFilterOpen} onClose={() => setIsProjectFilterOpen(false)} className="w-64">
                <div className="p-2 text-gray-800 dark:text-white/90">
                  <button
                    className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    onClick={() => {
                      setSelectedProject("");
                      setIsProjectFilterOpen(false);
                    }}
                  >
                    {selectedClient ? "All Projects (client)" : "All Projects"}
                  </button>
                  {projectOptions.map((p) => (
                    <button
                      key={p.id}
                      className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      onClick={() => {
                        setSelectedProject(p.id);
                        setIsProjectFilterOpen(false);
                      }}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </Dropdown>
            </div>

            {/* Plant filter: All Plants / Plantwise */}
            <div className="relative text-sm">
              <Button
                variant="outline"
                onClick={() => setIsPlantFilterOpen(!isPlantFilterOpen)}
                className="dropdown-toggle"
                size="sm"
              >
                Plant: {selectedPlant ? plantIdToName[selectedPlant] || selectedPlant : "All"}
              </Button>
              <Dropdown isOpen={isPlantFilterOpen} onClose={() => setIsPlantFilterOpen(false)} className="w-56">
                <div className="p-2 text-gray-800 dark:text-white/90">
                  <button
                    className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    onClick={() => {
                      setSelectedPlant("");
                      setIsPlantFilterOpen(false);
                    }}
                  >
                    All Plants
                  </button>
                  {usageFilteredPlantOptions.map((p) => (
                    <button
                      key={p.id}
                      className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      onClick={() => {
                        setSelectedPlant(p.id);
                        setIsPlantFilterOpen(false);
                      }}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </Dropdown>
            </div>

            {/* Date selector */}
            <div className="relative text-sm">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDateFilterOpen(!isDateFilterOpen)}
                className="dropdown-toggle"
              >
                Date: {selectedDate ? new Date(selectedDate).toLocaleDateString() : "All"}
              </Button>
              <Dropdown isOpen={isDateFilterOpen} onClose={() => setIsDateFilterOpen(false)} className="w-72 text-xs">
                <div className="p-2">
                  <div className="mb-2">
                    <DatePickerInput
                      value={selectedDate}
                      onChange={(date: string) => {
                        setSelectedDate(date);
                        setIsDateFilterOpen(false);
                      }}
                      placeholder="Select date"
                    />
                  </div>
                  <button
                    className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-800 dark:text-white/90"
                    onClick={() => {
                      setSelectedDate("");
                      setIsDateFilterOpen(false);
                    }}
                  >
                    Clear Date
                  </button>
                </div>
              </Dropdown>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-gray-800 sm:p-6">
          <div className="space-y-6">
            {status === "loading" ? (
              <div className="flex justify-center py-4">
                <Spinner text="Loading session..." />
              </div>
            ) : status === "unauthenticated" ? (
              <div className="text-center py-4 text-gray-800 dark:text-white/90">Please sign in to view reports</div>
            ) : isLoading ? (
              <div className="flex justify-center py-4">
                <Spinner text="Loading schedules..." />
              </div>
            ) : (
              <ReportsTable data={filtered} plantIdToName={plantIdToName} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


