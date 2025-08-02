"use client";

import SupplySchedulesTable from "./SupplySchedulesTable";
import { PlusIcon, Search } from "lucide-react";
import Button from "@/components/ui/button/Button";
import { useState, useMemo } from "react";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { Modal } from "@/components/ui/modal";
import { useRouter } from "next/navigation";
import { useApiClient } from "@/hooks/useApiClient";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/spinner";

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
  }>;
  tm_count: number;
  created_at: string;
}

export default function SupplySchedulesContainer() {
  const router = useRouter();
  const { fetchWithAuth } = useApiClient();
  const { status } = useSession();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [isClientFilterOpen, setIsClientFilterOpen] = useState(false);
  const [isSiteFilterOpen, setIsSiteFilterOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<SupplySchedule | null>(null);
  const [timeStatusFilter, setTimeStatusFilter] = useState<string>("All");
  const [isTimeStatusFilterOpen, setIsTimeStatusFilterOpen] = useState(false);

  // Fetch supply schedules
  const { data: schedulesData, isLoading: isLoadingSchedules } = useQuery({
    queryKey: ["supply-schedules"],
    queryFn: async () => {
      const response = await fetchWithAuth("/schedules?type=supply");
      if (!response) throw new Error("No response from server");
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Failed to fetch supply schedules");
      return data.data as SupplySchedule[];
    },
    enabled: status === "authenticated",
  });

  // Delete schedule mutation
  const deleteScheduleMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      const response = await fetchWithAuth(`/schedules/${scheduleId}`, {
        method: "DELETE",
      });
      if (!response) throw new Error("No response from server");
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Failed to delete schedule");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supply-schedules"] });
      setIsDeleteModalOpen(false);
      setSelectedSchedule(null);
    },
  });

  const handleAddSchedule = () => {
    router.push("/supply-schedules/new");
  };

  const handleDelete = (schedule: SupplySchedule) => {
    setSelectedSchedule(schedule);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedSchedule) {
      await deleteScheduleMutation.mutateAsync(selectedSchedule._id);
    }
  };

  // Filter and search logic
  const filteredSchedules = useMemo(() => {
    if (!schedulesData) return [];

    let filtered = schedulesData;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (schedule) =>
          schedule.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          schedule.site_address.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (selectedStatus) {
      filtered = filtered.filter((schedule) => schedule.status === selectedStatus);
    }

    // Client filter
    if (selectedClient) {
      filtered = filtered.filter((schedule) => schedule.client_id === selectedClient);
    }

    // Site filter
    if (selectedSite) {
      filtered = filtered.filter((schedule) => schedule.site_address === selectedSite);
    }

    // Date filter
    if (selectedDate) {
      filtered = filtered.filter((schedule) => schedule.input_params.schedule_date === selectedDate);
    }

    // Time status filter
    if (timeStatusFilter !== "All") {
      const now = new Date();
      filtered = filtered.filter((schedule) => {
        const scheduleDate = new Date(schedule.input_params.schedule_date);
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        switch (timeStatusFilter) {
          case "Today":
            return scheduleDate.getTime() === today.getTime();
          case "Tomorrow":
            return scheduleDate.getTime() === tomorrow.getTime();
          case "This Week":
            const weekStart = new Date(today);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            return scheduleDate >= weekStart && scheduleDate <= weekEnd;
          case "Past":
            return scheduleDate < today;
          case "Upcoming":
            return scheduleDate > tomorrow;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [schedulesData, searchQuery, selectedStatus, selectedClient, selectedSite, selectedDate, timeStatusFilter]);

  // Get unique values for filters
  const uniqueStatuses = useMemo(() => {
    if (!schedulesData) return [];
    return Array.from(new Set(schedulesData.map((schedule) => schedule.status)));
  }, [schedulesData]);

  const uniqueClients = useMemo(() => {
    if (!schedulesData) return [];
    return Array.from(new Set(schedulesData.map((schedule) => schedule.client_name)));
  }, [schedulesData]);

  const uniqueSites = useMemo(() => {
    if (!schedulesData) return [];
    return Array.from(new Set(schedulesData.map((schedule) => schedule.site_address)));
  }, [schedulesData]);

  const uniqueDates = useMemo(() => {
    if (!schedulesData) return [];
    return Array.from(new Set(schedulesData.map((schedule) => schedule.input_params.schedule_date)));
  }, [schedulesData]);

  const parseScheduleDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoadingSchedules) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-title-md2 font-semibold text-black dark:text-white">Supply Schedules</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage your supply schedules</p>
        </div>
        <Button onClick={handleAddSchedule} className="flex items-center gap-2">
          <PlusIcon size={16} />
          Add Supply Schedule
        </Button>
      </div>

      <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative">
              <input
                type="text"
                placeholder="Search schedules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-80 appearance-none rounded-lg border border-gray-300 px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              />
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <button
                onClick={() => setIsStatusFilterOpen(!isStatusFilterOpen)}
                className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
              >
                Status: {selectedStatus || "All"}
              </button>
              <Dropdown isOpen={isStatusFilterOpen} onClose={() => setIsStatusFilterOpen(false)}>
                <button
                  onClick={() => {
                    setSelectedStatus("");
                    setIsStatusFilterOpen(false);
                  }}
                  className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  All
                </button>
                {uniqueStatuses.map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setSelectedStatus(status);
                      setIsStatusFilterOpen(false);
                    }}
                    className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {status}
                  </button>
                ))}
              </Dropdown>
            </div>

            {/* Client Filter */}
            <div className="relative">
              <button
                onClick={() => setIsClientFilterOpen(!isClientFilterOpen)}
                className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
              >
                Client: {selectedClient || "All"}
              </button>
              <Dropdown isOpen={isClientFilterOpen} onClose={() => setIsClientFilterOpen(false)}>
                <button
                  onClick={() => {
                    setSelectedClient("");
                    setIsClientFilterOpen(false);
                  }}
                  className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  All
                </button>
                {uniqueClients.map((client) => (
                  <button
                    key={client}
                    onClick={() => {
                      setSelectedClient(client);
                      setIsClientFilterOpen(false);
                    }}
                    className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {client}
                  </button>
                ))}
              </Dropdown>
            </div>

            {/* Site Filter */}
            <div className="relative">
              <button
                onClick={() => setIsSiteFilterOpen(!isSiteFilterOpen)}
                className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
              >
                Site: {selectedSite || "All"}
              </button>
              <Dropdown isOpen={isSiteFilterOpen} onClose={() => setIsSiteFilterOpen(false)}>
                <button
                  onClick={() => {
                    setSelectedSite("");
                    setIsSiteFilterOpen(false);
                  }}
                  className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  All
                </button>
                {uniqueSites.map((site) => (
                  <button
                    key={site}
                    onClick={() => {
                      setSelectedSite(site);
                      setIsSiteFilterOpen(false);
                    }}
                    className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {site}
                  </button>
                ))}
              </Dropdown>
            </div>

            {/* Time Status Filter */}
            <div className="relative">
              <button
                onClick={() => setIsTimeStatusFilterOpen(!isTimeStatusFilterOpen)}
                className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
              >
                Time: {timeStatusFilter}
              </button>
              <Dropdown isOpen={isTimeStatusFilterOpen} onClose={() => setIsTimeStatusFilterOpen(false)}>
                {["All", "Today", "Tomorrow", "This Week", "Past", "Upcoming"].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => {
                      setTimeStatusFilter(filter);
                      setIsTimeStatusFilterOpen(false);
                    }}
                    className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {filter}
                  </button>
                ))}
              </Dropdown>
            </div>
          </div>
        </div>

        <SupplySchedulesTable data={filteredSchedules} onDelete={handleDelete} />
      </div>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Confirm Delete</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Are you sure you want to delete the supply schedule for{" "}
            <span className="font-semibold">{selectedSchedule?.client_name}</span>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={deleteScheduleMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {deleteScheduleMutation.isPending ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
} 