"use client";

import TransitMixersTable from "./TransitMixersTable";
import { PlusIcon, Search, Truck } from "lucide-react";
import Button from "@/components/ui/button/Button";
import { useState, useEffect } from "react";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { Modal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";
import { useApiClient } from "@/hooks/useApiClient";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/spinner";

interface TransitMixer {
  _id: string;
  user_id: string;
  plant_id: string | null;
  identifier: string;
  capacity: number;
  driver_name: string | null;
  driver_contact: string | null;
  status: "active" | "inactive";
  created_at: string;
}

// Update CreateTransitMixerData to include driver_name and driver_contact
interface CreateTransitMixerData {
  identifier: string;
  capacity: number;
  plant_id?: string | null;
  driver_name?: string | null;
  driver_contact?: string | null;
  status?: "active" | "inactive";
}

export default function TransitMixersContainer() {
  const { fetchWithAuth } = useApiClient();
  const { status } = useSession();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isPlantFilterOpen, setIsPlantFilterOpen] = useState(false);
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("active");
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedMixer, setSelectedMixer] = useState<TransitMixer | null>(null);
  const [newMixer, setNewMixer] = useState<CreateTransitMixerData>({
    identifier: "",
    capacity: 0,
    plant_id: null,
    driver_name: "",
    driver_contact: "",
    status: "active",
  });
  const [plants, setPlants] = useState<{ _id: string; name: string }[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isPlantsLoading, setIsPlantsLoading] = useState(false);

  // Fetch transit mixers
  const { data: transitMixersData, isLoading: isLoadingTransitMixers } = useQuery({
    queryKey: ["transit-mixers"],
    queryFn: async () => {
      const response = await fetchWithAuth("/tms/");
      if (!response) throw new Error("No response from server");
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Failed to fetch transit mixers");
      return data.data as TransitMixer[];
    },
    enabled: status === "authenticated",
  });

  // Create transit mixer mutation
  const createTransitMixerMutation = useMutation({
    mutationFn: async (mixerData: CreateTransitMixerData) => {
      const response = await fetchWithAuth("/tms/", {
        method: "POST",
        body: JSON.stringify(mixerData),
      });
      if (!response) throw new Error("No response from server");
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Failed to create transit mixer");
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transit-mixers"] });
      setIsCreateModalOpen(false);
      setNewMixer({
        identifier: "",
        capacity: 0,
        plant_id: null,
        driver_name: "",
        driver_contact: "",
        status: "active",
      });
    },
  });

  // Edit transit mixer mutation
  const editTransitMixerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CreateTransitMixerData }) => {
      const response = await fetchWithAuth(`/tms/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (!response) throw new Error("No response from server");
      const responseData = await response.json();
      if (!responseData.success) throw new Error(responseData.message || "Failed to update transit mixer");
      return responseData.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transit-mixers"] });
      setIsEditModalOpen(false);
      setSelectedMixer(null);
    },
  });

  // Delete transit mixer mutation
  const deleteTransitMixerMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetchWithAuth(`/tms/${id}`, {
        method: "DELETE",
      });
      if (!response) throw new Error("No response from server");
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Failed to delete transit mixer");
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transit-mixers"] });
      setIsDeleteModalOpen(false);
      setSelectedMixer(null);
    },
  });

  // Fetch plants for dropdowns
  useEffect(() => {
    const fetchPlants = async () => {
      setIsPlantsLoading(true);
      try {
        const response = await fetchWithAuth("/plants/");
        if (!response) throw new Error("No response from server");
        const data = await response.json();
        if (data.success) {
          setPlants(data.data);
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        setPlants([]);
      } finally {
        setIsPlantsLoading(false);
      }
    };
    if (status === "authenticated") fetchPlants();
  }, [status]);

  const handleAddMixer = () => {
    setIsCreateModalOpen(true);
  };

  const handleCreateMixer = async () => {
    try {
      await createTransitMixerMutation.mutateAsync(newMixer);
    } catch (error) {
      console.error("Error creating transit mixer:", error);
    }
  };

  const handleEdit = (mixer: TransitMixer) => {
    setSelectedMixer(mixer);
    setIsEditModalOpen(true);
  };

  const handleDelete = (mixer: TransitMixer) => {
    setSelectedMixer(mixer);
    setIsDeleteModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedMixer) return;
    try {
      await editTransitMixerMutation.mutateAsync({
        id: selectedMixer._id,
        data: {
          identifier: selectedMixer.identifier,
          capacity: selectedMixer.capacity,
          plant_id: selectedMixer.plant_id,
          status: selectedMixer.status,
        },
      });
    } catch (error) {
      console.error("Error updating transit mixer:", error);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedMixer) return;
    try {
      await deleteTransitMixerMutation.mutateAsync(selectedMixer._id);
    } catch (error) {
      console.error("Error deleting transit mixer:", error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewMixer((prev) => ({
      ...prev,
      [name]: name === "capacity" ? Number(value) : value,
    }));
  };

  // For edit modal, add a handler for all fields
  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (!selectedMixer) return;
    setSelectedMixer({
      ...selectedMixer,
      [name]: name === "capacity" ? Number(value) : value,
    });
  };

  // const plantsOptions = ["Main Plant", "North Plant", "South Plant", "East Plant"];
  const dateRanges = ["Last 7 days", "Last 30 days", "Last 90 days", "All time"];
  const statusOptions = ["active", "inactive", "all"];

  const filteredData =
    (transitMixersData || []).filter((mixer) => {
      // Search filter (identifier, driver name, driver contact)
      const matchesSearch =
        mixer.identifier.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (mixer.driver_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (mixer.driver_contact || "").toLowerCase().includes(searchQuery.toLowerCase());

      // Plant filter
      const matchesPlant = !selectedPlant || mixer.plant_id === selectedPlant;

      // Status filter
      const matchesStatus = selectedStatus === "all" || mixer.status === selectedStatus;

      // Date filter
      let matchesDate = true;
      if (selectedDate && selectedDate !== "All time") {
        const now = new Date();
        let days = 0;
        if (selectedDate === "Last 7 days") days = 7;
        else if (selectedDate === "Last 30 days") days = 30;
        else if (selectedDate === "Last 90 days") days = 90;
        if (days > 0) {
          const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
          matchesDate = new Date(mixer.created_at) >= cutoff;
        }
      }

      return matchesSearch && matchesPlant && matchesStatus && matchesDate;
    }) || [];

  // Calculate average capacity based on filteredData
  const calculateAverageCapacity = () => {
    if (!filteredData || filteredData.length === 0) return 0;
    const totalCapacity = filteredData.reduce((sum, mixer) => sum + mixer.capacity, 0);
    return (totalCapacity / filteredData.length).toFixed(1);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Transit Mixers</h2>

          {/* Tiny Metric Card */}
        </div>

        {/* Add Button */}
        <nav className="flex flex-row gap-2">
          <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <Truck className="text-gray-800 size-4 dark:text-white/90" />
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 dark:text-gray-400">Avg Capacity</span>
              <span className="font-semibold text-gray-800 dark:text-white/90">{calculateAverageCapacity()}m³</span>
            </div>
          </div>
          <Button className="flex items-center gap-2" size="sm" onClick={handleAddMixer}>
            <PlusIcon className="w-4 h-4" />
            Add Transit Mixer
          </Button>
        </nav>
      </div>

      <div className="space-y-6">
        <div className={`rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]`}>
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
                  className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-14 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 xl:w-[430px]"
                />
              </div>

              {/* Plant Filter */}
              <div className="relative text-sm">
                <Button
                  variant="outline"
                  onClick={() => setIsPlantFilterOpen(!isPlantFilterOpen)}
                  className="dropdown-toggle"
                  size="sm"
                >
                  Plant: {selectedPlant ? plants.find((p) => p._id === selectedPlant)?.name || "Unknown" : "All"}
                </Button>
                <Dropdown isOpen={isPlantFilterOpen} onClose={() => setIsPlantFilterOpen(false)} className="w-48">
                  <div className="p-2 text-gray-800 dark:text-white/90 ">
                    <button
                      className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      onClick={() => {
                        setSelectedPlant("");
                        setIsPlantFilterOpen(false);
                      }}
                    >
                      All
                    </button>
                    {plants.map((plant) => (
                      <button
                        key={plant._id}
                        className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        onClick={() => {
                          setSelectedPlant(plant._id);
                          setIsPlantFilterOpen(false);
                        }}
                      >
                        {plant.name}
                      </button>
                    ))}
                  </div>
                </Dropdown>
              </div>

              {/* Date Filter */}
              <div className="relative text-sm">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDateFilterOpen(!isDateFilterOpen)}
                  className="dropdown-toggle"
                >
                  Date Added: {selectedDate || "All time"}
                </Button>
                <Dropdown isOpen={isDateFilterOpen} onClose={() => setIsDateFilterOpen(false)} className="w-48 text-xs">
                  <div className="p-2 text-gray-800 dark:text-white/90">
                    {dateRanges.map((range) => (
                      <button
                        key={range}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        onClick={() => {
                          setSelectedDate(range);
                          setIsDateFilterOpen(false);
                        }}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                </Dropdown>
              </div>

              {/* Status Filter */}
              <div className="relative text-sm">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsStatusFilterOpen(!isStatusFilterOpen)}
                  className="dropdown-toggle"
                >
                  Status: {selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)}
                </Button>
                <Dropdown
                  isOpen={isStatusFilterOpen}
                  onClose={() => setIsStatusFilterOpen(false)}
                  className="w-48 text-xs"
                >
                  <div className="p-2 text-gray-800 dark:text-white/90">
                    {statusOptions.map((status) => (
                      <button
                        key={status}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
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
            </div>
          </div>

          {/* Card Body */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 sm:p-6">
            <div className="space-y-6">
              {status === "loading" ? (
                <div className="flex justify-center py-4">
                  <Spinner text="Loading session..." />
                </div>
              ) : isLoadingTransitMixers ? (
                <div className="flex justify-center py-4">
                  <Spinner text="Loading transit mixers..." />
                </div>
              ) : (
                <TransitMixersTable data={filteredData} onEdit={handleEdit} onDelete={handleDelete} plants={plants} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        className="max-w-[800px] p-5 lg:p-10"
      >
        <h4 className="font-semibold text-gray-800 mb-7 text-title-sm dark:text-white/90">Add New Transit Mixer</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Number</label>
            <Input
              type="text"
              name="identifier"
              placeholder="Enter number"
              value={newMixer.identifier}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Capacity (m³)</label>
            <Input
              type="number"
              name="capacity"
              placeholder="Enter capacity"
              value={newMixer.capacity}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Plant</label>
            <select
              name="plant_id"
              value={newMixer.plant_id || ""}
              onChange={handleInputChange}
              className="w-full h-11 rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="">Select Plant</option>
              {plants.map((plant) => (
                <option key={plant._id} value={plant._id}>
                  {plant.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Driver Name</label>
            <Input
              type="text"
              name="driver_name"
              placeholder="Enter driver name"
              value={newMixer.driver_name || ""}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Driver Contact</label>
            <Input
              type="text"
              name="driver_contact"
              placeholder="Enter driver contact"
              value={newMixer.driver_contact || ""}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Status</label>
            <select
              name="status"
              value={newMixer.status || "active"}
              onChange={handleInputChange}
              className="w-full h-11 rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateMixer} disabled={createTransitMixerMutation.isPending}>
            {createTransitMixerMutation.isPending ? (
              <div className="flex items-center gap-2">
                <Spinner size="sm" />
                <span>Creating...</span>
              </div>
            ) : (
              "Create"
            )}
          </Button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} className="max-w-[800px] p-5 lg:p-10">
        <h4 className="font-semibold text-gray-800 mb-7 text-title-sm dark:text-white/90">Edit Transit Mixer</h4>
        {selectedMixer && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Number</label>
              <Input type="text" name="identifier" value={selectedMixer.identifier} onChange={handleEditInputChange} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Capacity (m³)</label>
              <Input type="number" name="capacity" value={selectedMixer.capacity} onChange={handleEditInputChange} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Plant</label>
              <select
                name="plant_id"
                value={selectedMixer.plant_id || ""}
                onChange={handleEditInputChange}
                className="w-full h-11 rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="">Select Plant</option>
                {plants.map((plant) => (
                  <option key={plant._id} value={plant._id}>
                    {plant.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Driver Name</label>
              <Input
                type="text"
                name="driver_name"
                value={selectedMixer.driver_name || ""}
                onChange={handleEditInputChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Driver Contact
              </label>
              <Input
                type="text"
                name="driver_contact"
                value={selectedMixer.driver_contact || ""}
                onChange={handleEditInputChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Status</label>
              <select
                name="status"
                value={selectedMixer.status || "active"}
                onChange={handleEditInputChange}
                className="w-full h-11 rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="col-span-2 flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={editTransitMixerMutation.isPending}>
                {editTransitMixerMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <Spinner size="sm" />
                    <span>Saving...</span>
                  </div>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        className="max-w-[400px] p-5 lg:p-10"
      >
        <h4 className="font-semibold text-gray-800 mb-7 text-title-sm dark:text-white/90">Delete Transit Mixer</h4>
        {selectedMixer && (
          <>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete transit mixer {selectedMixer.identifier}? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="warning" onClick={handleConfirmDelete} disabled={deleteTransitMixerMutation.isPending}>
                {deleteTransitMixerMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <Spinner size="sm" />
                    <span>Deleting...</span>
                  </div>
                ) : (
                  "Delete"
                )}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
