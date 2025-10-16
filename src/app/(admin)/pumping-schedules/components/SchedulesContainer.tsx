"use client";

import SchedulesTable from "./SchedulesTable";
import { PlusIcon, Search } from "lucide-react";
import Button from "@/components/ui/button/Button";
import { useState, useMemo, useEffect } from "react";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { Modal } from "@/components/ui/modal";
// import Input from "@/components/form/input/InputField";
import { useRouter, useSearchParams } from "next/navigation";
import { useApiClient } from "@/hooks/useApiClient";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/spinner";
import { CanceledBy, CancelReason, DeleteType } from "@/types/common.types";
import Radio from "@/components/form/input/Radio";
import DatePickerInput from "@/components/form/input/DatePickerInput";

interface Schedule {
  _id: string;
  client_name: string;
  client_id: string;
  site_address: string;
  project_name: string;
  mother_plant_name: string;
  pump_type: string;
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
    plant_buffer: string;
    pump_start: string;
    unloading_time: string;
    return: string;
    completed_capacity: number;
  }>;
  tm_count: number;
  tm_overrule: number;
  created_at: string;
}

export default function SchedulesContainer() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [canceledBy, setCanceledBy] = useState<CanceledBy>(CanceledBy.client);
  const [reasonForCancel, setReasonForCancel] = useState<CancelReason>(CancelReason.ecl);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [timeStatusFilter, setTimeStatusFilter] = useState<string>("All");
  const [isTimeStatusFilterOpen, setIsTimeStatusFilterOpen] = useState(false);

  // Initialize date from URL parameters
  useEffect(() => {
    const dateParam = searchParams.get("date");
    if (dateParam) {
      // Convert MM/DD/YYYY format to YYYY-MM-DD format for internal use
      const dateParts = dateParam.split("/");
      if (dateParts.length === 3) {
        const month = dateParts[0].padStart(2, "0");
        const day = dateParts[1].padStart(2, "0");
        const year = dateParts[2];
        setSelectedDate(`${year}-${month}-${day}`);
      }
    }
  }, [searchParams]);

  // Update URL when date filter changes
  const updateUrlWithDate = (date: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (date) {
      // Convert YYYY-MM-DD to MM/DD/YYYY for URL
      const dateParts = date.split("-");
      if (dateParts.length === 3) {
        const formattedDate = `${dateParts[1]}/${dateParts[2]}/${dateParts[0]}`;
        params.set("date", formattedDate);
      }
    } else {
      params.delete("date");
    }
    router.push(`/pumping-schedules?${params.toString()}`);
  };

  // Fetch schedules
  const { data: schedulesData, isLoading: isLoadingSchedules } = useQuery({
    queryKey: ["schedules"],
    queryFn: async () => {
      const response = await fetchWithAuth("/schedules");
      if (!response) throw new Error("No response from server");
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Failed to fetch schedules");
      return data.data as Schedule[];
    },
    enabled: status === "authenticated",
  });

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
      setSelectedSchedule(null);
    },
  });

  const handleAddSchedule = () => {
    router.push("/pumping-schedules/new");
  };

  const handleCancel = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setIsCancelModalOpen(true);
  };

  const handleDelete = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (deleteType: DeleteType = DeleteType.cancel) => {
    if (!selectedSchedule) return;
    try {
      await deleteScheduleMutation.mutateAsync({ id: selectedSchedule._id, deleteType });
    } catch (error) {
      console.error("Error deleting schedule:", error);
    }
  };

  // Get unique values for filters
  const { clients, sites, statuses } = useMemo(() => {
    if (!schedulesData) return { clients: [], sites: [], statuses: [] };

    const uniqueClients = Array.from(new Set(schedulesData.map((schedule) => schedule.client_name)));
    const uniqueSites = Array.from(new Set(schedulesData.map((schedule) => schedule.site_address)));
    const uniqueStatuses = Array.from(new Set(schedulesData.map((schedule) => schedule.status)));

    return {
      clients: uniqueClients.sort(),
      sites: uniqueSites.sort(),
      statuses: uniqueStatuses.sort(),
    };
  }, [schedulesData]);

  // Filter schedules based on search query and filters
  const filteredSchedules = useMemo(() => {
    if (!schedulesData) return [];

    const now = new Date();
    // Helper to parse schedule date (assume input_params.schedule_date is ISO or yyyy-mm-dd)
    const parseScheduleDate = (dateStr: string) => {
      // Try to parse as ISO, fallback to yyyy-mm-dd
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) return d;
      // fallback: yyyy-mm-dd
      const [year, month, day] = dateStr.split("-").map(Number);
      return new Date(year, month - 1, day);
    };

    return schedulesData.filter((schedule) => {
      const matchesSearch =
        searchQuery === "" ||
        schedule.mother_plant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        schedule.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        schedule.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        schedule.site_address.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        (schedule.status !== "deleted" && selectedStatus === "") || schedule.status === selectedStatus;

      const matchesClient = selectedClient === "" || schedule.client_name === selectedClient;

      const matchesSite = selectedSite === "" || schedule.site_address === selectedSite;

      const matchesDate = !selectedDate || schedule.input_params.schedule_date === selectedDate;

      // Time-based status filter
      let matchesTimeStatus = true;
      if (timeStatusFilter !== "All") {
        const scheduleDate = parseScheduleDate(schedule.input_params.schedule_date);
        // Remove time for comparison (treat as local date)
        const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const schedDate = new Date(scheduleDate.getFullYear(), scheduleDate.getMonth(), scheduleDate.getDate());
        if (timeStatusFilter === "Upcoming") {
          matchesTimeStatus = schedDate > nowDate;
        } else if (timeStatusFilter === "Past") {
          matchesTimeStatus = schedDate < nowDate;
        } else if (timeStatusFilter === "Ongoing") {
          matchesTimeStatus = schedDate.getTime() === nowDate.getTime();
        }
      }

      return matchesSearch && matchesStatus && matchesClient && matchesSite && matchesDate && matchesTimeStatus;
    });
  }, [schedulesData, searchQuery, selectedStatus, selectedClient, selectedSite, selectedDate, timeStatusFilter]);

  if (isLoadingSchedules) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold text-black dark:text-white">Pumping Schedules Management</h2>
        <Button onClick={handleAddSchedule} className="flex items-center gap-2" size="sm">
          <PlusIcon className="w-4 h-4" />
          Add Pumping Schedule
        </Button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="px-6 py-5">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search Bar */}
            <div className="relative">
              <span className="absolute -translate-y-1/2 left-4 top-1/2 pointer-events-none">
                <Search size={"15px"} className="text-gray-800 dark:text-white/90" />
              </span>
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-14 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 xl:w-[430px]"
              />
            </div>

            {/* Client Filter */}
            <div className="relative text-sm">
              <Button
                variant="outline"
                onClick={() => setIsClientFilterOpen(!isClientFilterOpen)}
                className="dropdown-toggle"
                size="sm"
              >
                Client: {selectedClient || "All"}
              </Button>
              <Dropdown isOpen={isClientFilterOpen} onClose={() => setIsClientFilterOpen(false)} className="w-48">
                <div className="p-2 text-gray-800 dark:text-white/90">
                  <button
                    className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    onClick={() => {
                      setSelectedClient("");
                      setIsClientFilterOpen(false);
                    }}
                  >
                    All
                  </button>
                  {clients.map((client) => (
                    <button
                      key={client}
                      className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      onClick={() => {
                        setSelectedClient(client);
                        setIsClientFilterOpen(false);
                      }}
                    >
                      {client}
                    </button>
                  ))}
                </div>
              </Dropdown>
            </div>

            {/* Site Location Filter */}
            <div className="relative text-sm">
              <Button
                variant="outline"
                onClick={() => setIsSiteFilterOpen(!isSiteFilterOpen)}
                className="dropdown-toggle"
                size="sm"
              >
                Location: {selectedSite || "All"}
              </Button>
              <Dropdown isOpen={isSiteFilterOpen} onClose={() => setIsSiteFilterOpen(false)} className="w-48">
                <div className="p-2 text-gray-800 dark:text-white/90">
                  <button
                    className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    onClick={() => {
                      setSelectedSite("");
                      setIsSiteFilterOpen(false);
                    }}
                  >
                    All
                  </button>
                  {sites.map((site) => (
                    <button
                      key={site}
                      className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      onClick={() => {
                        setSelectedSite(site);
                        setIsSiteFilterOpen(false);
                      }}
                    >
                      {site}
                    </button>
                  ))}
                </div>
              </Dropdown>
            </div>

            {/* Status Filter */}
            <div className="relative text-sm">
              <Button
                variant="outline"
                onClick={() => setIsStatusFilterOpen(!isStatusFilterOpen)}
                className="dropdown-toggle"
                size="sm"
              >
                Status: {selectedStatus || "All"}
              </Button>
              <Dropdown isOpen={isStatusFilterOpen} onClose={() => setIsStatusFilterOpen(false)} className="w-48">
                <div className="p-2 text-gray-800 dark:text-white/90">
                  <button
                    className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    onClick={() => {
                      setSelectedStatus("");
                      setIsStatusFilterOpen(false);
                    }}
                  >
                    All
                  </button>
                  {statuses.map((status) => (
                    <button
                      key={status}
                      className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      onClick={() => {
                        setSelectedStatus(status);
                        setIsStatusFilterOpen(false);
                      }}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </Dropdown>
            </div>

            {/* Date Filter */}
            <div className="relative text-sm flex flex-row gap-4">
              <DatePickerInput
                value={selectedDate}
                onChange={(date: string) => {
                  setSelectedDate(date);
                  updateUrlWithDate(date);
                }}
                placeholder="Select date"
              />
              <button
                className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-800 dark:text-white/90"
                onClick={() => {
                  setSelectedDate("");
                  updateUrlWithDate("");
                }}
              >
                Clear Date
              </button>
            </div>

            {/* Time Status Filter */}
            <div className="relative text-sm">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTimeStatusFilterOpen(!isTimeStatusFilterOpen)}
                className="dropdown-toggle"
              >
                Time Status: {timeStatusFilter}
              </Button>
              <Dropdown
                isOpen={isTimeStatusFilterOpen}
                onClose={() => setIsTimeStatusFilterOpen(false)}
                className="w-48"
              >
                <div className="p-2 text-gray-800 dark:text-white/90">
                  {["All", "Upcoming", "Ongoing", "Past"].map((status) => (
                    <button
                      key={status}
                      className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      onClick={() => {
                        setTimeStatusFilter(status);
                        setIsTimeStatusFilterOpen(false);
                      }}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </Dropdown>
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 sm:p-6">
          <div className="space-y-6">
            {status === "loading" ? (
              <div className="flex justify-center py-4">
                <Spinner text="Loading session..." />
              </div>
            ) : status === "unauthenticated" ? (
              <div className="text-center py-4 text-gray-800 dark:text-white/90">Please sign in to view schedules</div>
            ) : isLoadingSchedules ? (
              <div className="flex justify-center py-4">
                <Spinner text="Loading schedules..." />
              </div>
            ) : (
              <SchedulesTable data={filteredSchedules} onDelete={handleDelete} onCancel={handleCancel} />
            )}
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      <Modal className="max-w-[500px] p-5" isOpen={isCancelModalOpen} onClose={() => setIsCancelModalOpen(false)}>
        <div className="p-6">
          <h4 className="font-semibold text-gray-800 mb-7 text-title-sm dark:text-white/90">Cancel Schedule</h4>
          <p className="mb-6">Are you sure you want to cancel this schedule?</p>
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
          <p className="mb-6">Are you sure you want to delete this schedule?</p>
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
