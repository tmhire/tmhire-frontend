"use client";

import PumpsTable from "./PumpsTable";
import { PlusIcon, Search } from "lucide-react";
import Button from "@/components/ui/button/Button";
import { useState, useMemo } from "react";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { Modal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";
import { useApiClient } from "@/hooks/useApiClient";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/spinner";

interface Plant {
  _id: string;
  name: string;
  location: string;
  address: string;
  contact_number: string;
  created_at: string;
}

interface Pump {
  _id: string;
  identifier: string;
  type: "line" | "boom";
  capacity: number;
  plant_id: string;
  status: string;
  make: string;
  driver_name: string | null;
  driver_contact: string | null;
  remarks: string | null; // <-- Added
  created_at: string;
}

interface CreatePumpData {
  identifier: string;
  type: "line" | "boom";
  capacity: number;
  plant_id: string;
  make: string;
  driver_name?: string;
  driver_contact?: string;
  remarks?: string | null; // <-- Added
}

export default function PumpsContainer() {
  const { fetchWithAuth } = useApiClient();
  const { status } = useSession();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isPlantFilterOpen, setIsPlantFilterOpen] = useState(false);
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [isPumpTypeFilterOpen, setIsPumpTypeFilterOpen] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedPumpType, setSelectedPumpType] = useState<string>("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPump, setSelectedPump] = useState<Pump | null>(null);
  const [editedPump, setEditedPump] = useState<CreatePumpData>({
    identifier: "",
    type: "line",
    capacity: 0,
    plant_id: "",
    make: "",
    driver_name: "",
    driver_contact: "",
    remarks: "", // <-- Added
  });
  const [newPump, setNewPump] = useState<CreatePumpData>({
    identifier: "",
    type: "line",
    capacity: 0,
    plant_id: "",
    make: "",
    driver_name: "",
    driver_contact: "",
    remarks: "", // <-- Added
  });
  const [error, setError] = useState("");
  const [driverContactError, setDriverContactError] = useState("");
  const [editDriverContactError, setEditDriverContactError] = useState("");

  const validateMobileNumber = (number: string): boolean => {
    // Remove all non-digits
    const digitsOnly = number.replace(/\D/g, "");
    // Check if it's a valid Indian mobile number (10 digits starting with 6-9)
    return /^[6-9]\d{9}$/.test(digitsOnly);
  };

  const handleIdentifierInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase();
    const sanitized = raw.replace(/[^A-Z0-9\s]/g, "");
    setNewPump((prev) => ({
      ...prev,
      identifier: sanitized,
    }));

    if (sanitized && !/^[A-Z]{0,2}\s?\d{0,2}\s?[A-Z]{0,2}\s?\d{0,4}$/.test(sanitized)) {
      setError("Invalid. Correct format: XX 00 AA 0000");
    } else {
      setError("");
    }
  };

  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("");

  // Fetch pumps query
  const {
    data: pumpsData,
    isLoading: isLoadingPumps,
    isError: isPumpError,
  } = useQuery({
    queryKey: ["pumps"],
    queryFn: async () => {
      const response = await fetchWithAuth("/pumps/");
      if (!response) throw new Error("No response from server");
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Failed to fetch pumps");
      return data.data as Pump[];
    },
    enabled: status === "authenticated",
  });

  // Status options (move after pumpsData is declared)
  const statusOptions = useMemo(() => {
    if (!pumpsData) return [];
    return Array.from(new Set(pumpsData.map((pump) => pump.status))).filter(Boolean);
  }, [pumpsData]);

  // Fetch plants for dropdowns
  const { data: plantsData } = useQuery({
    queryKey: ["plants"],
    queryFn: async () => {
      const response = await fetchWithAuth("/plants/");
      if (!response) throw new Error("No response from server");
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Failed to fetch plants");
      return data.data as Plant[];
    },
    enabled: status === "authenticated",
  });

  // Map of plant IDs to names for display
  const plantMap = useMemo(() => {
    if (!plantsData) return new Map<string, string>();
    return new Map(plantsData.map((plant) => [plant._id, plant.name]));
  }, [plantsData]);

  // Create pump mutation
  const createPumpMutation = useMutation({
    mutationFn: async (pumpData: CreatePumpData) => {
      const response = await fetchWithAuth("/pumps/", {
        method: "POST",
        body: JSON.stringify(pumpData),
      });
      if (!response) throw new Error("No response from server");
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Failed to create pump");
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pumps"] });
      setIsCreateModalOpen(false);
      setNewPump({
        identifier: "",
        type: "line",
        capacity: 0,
        plant_id: "",
        make: "",
        driver_name: "",
        driver_contact: "",
        remarks: "", // <-- Added
      });
      setDriverContactError("");
    },
  });

  // Edit pump mutation
  const editPumpMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CreatePumpData }) => {
      const response = await fetchWithAuth(`/pumps/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (!response) throw new Error("No response from server");
      const responseData = await response.json();
      if (!responseData.success) throw new Error(responseData.message || "Failed to update pump");
      return responseData.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pumps"] });
      setIsEditModalOpen(false);
      setSelectedPump(null);
      setEditDriverContactError("");
    },
  });

  // Delete pump mutation
  const deletePumpMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetchWithAuth(`/pumps/${id}`, {
        method: "DELETE",
      });
      if (!response) throw new Error("No response from server");
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Failed to delete pump");
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pumps"] });
      setIsDeleteModalOpen(false);
      setSelectedPump(null);
    },
  });

  const handleAddPump = () => {
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setDriverContactError("");
    setError("");
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditDriverContactError("");
  };

  const handleCreatePump = async () => {
    try {
      await createPumpMutation.mutateAsync(newPump);
    } catch (error) {
      console.error("Error creating pump:", error);
    }
  };

  const handleEdit = (pump: Pump) => {
    setSelectedPump(pump);
    setEditedPump({
      identifier: pump.identifier,
      type: pump.type,
      capacity: pump.capacity,
      plant_id: pump.plant_id,
      make: pump.make || "",
      driver_name: pump.driver_name || "",
      driver_contact: pump.driver_contact || "",
      remarks: pump.remarks || "", // <-- Added
    });
    setIsEditModalOpen(true);
  };

  const handleDelete = (pump: Pump) => {
    setSelectedPump(pump);
    setIsDeleteModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedPump) return;
    try {
      await editPumpMutation.mutateAsync({
        id: selectedPump._id,
        data: editedPump,
      });
    } catch (error) {
      console.error("Error updating pump:", error);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedPump) return;
    try {
      await deletePumpMutation.mutateAsync(selectedPump._id);
    } catch (error) {
      console.error("Error deleting pump:", error);
    }
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    const newValue = name === "capacity" ? Number(value) : value;
    setEditedPump((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    // Validate driver contact if it's being changed in edit modal
    if (name === "driver_contact") {
      if (value && !validateMobileNumber(value)) {
        setEditDriverContactError("Please enter a valid 10-digit mobile number starting with 6-9");
      } else {
        setEditDriverContactError("");
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewPump((prev) => ({
      ...prev,
      [name]: name === "capacity" ? Number(value) : value,
    }));

    // Validate driver contact if it's being changed
    if (name === "driver_contact") {
      if (value && !validateMobileNumber(value)) {
        setDriverContactError("Please enter a valid 10-digit mobile number starting with 6-9");
      } else {
        setDriverContactError("");
      }
    }
  };

  // Get unique plants from pumps data
  // const plants = useMemo(() => {
  //   if (!pumpsData) return [];
  //   const uniquePlants = Array.from(new Set(pumpsData.map((pump) => pump.plant_id)));
  //   return uniquePlants.sort();
  // }, [pumpsData]);

  // Date range options
  const dateRanges = ["Last 7 days", "Last 30 days", "Last 90 days", "All time"];
  const pumpTypes = ["line", "boom"];

  // Filter pumps based on search, plant, and type
  const filteredData = useMemo(() => {
    if (!pumpsData) return [];
    return pumpsData.filter((pump) => {
      const matchesSearch =
        pump.identifier.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pump.type.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPlant = !selectedPlant || pump.plant_id === selectedPlant;
      const matchesPumpType = !selectedPumpType || pump.type === selectedPumpType.toLowerCase();
      const matchesStatus = !selectedStatus || pump.status === selectedStatus;
      return matchesSearch && matchesPlant && matchesPumpType && matchesStatus;
    });
  }, [pumpsData, searchQuery, selectedPlant, selectedPumpType, selectedStatus]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Concrete Pumps</h2>
        <nav className="flex flex-row gap-2">
          <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex flex-row gap-6 items-center">
              <button
                className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded cursor-pointer transition-colors"
                onClick={() => setSelectedPumpType(selectedPumpType === "Line" ? "" : "Line")}
              >
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span
                  className={`text-xs ${
                    selectedPumpType === "Line"
                      ? "text-blue-600 dark:text-blue-400 font-medium"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  Line
                </span>
              </button>
              <button
                className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded cursor-pointer transition-colors"
                onClick={() => setSelectedPumpType(selectedPumpType === "Boom" ? "" : "Boom")}
              >
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span
                  className={`text-xs ${
                    selectedPumpType === "Boom"
                      ? "text-green-600 dark:text-green-400 font-medium"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  Boom
                </span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex flex-row gap-8 items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400">Total Count</span>
              <span className="font-semibold text-gray-800 dark:text-white/90">{filteredData.length}</span>
            </div>
          </div>
          <Button className="flex items-center gap-2" size="sm" onClick={handleAddPump}>
            <PlusIcon className="w-4 h-4" />
            Add Pump
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
                  placeholder="Search by identifier or type"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-14 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 xl:w-[430px]"
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
                  Plant: {selectedPlant ? plantMap.get(selectedPlant) || "Unknown" : "All"}
                </Button>
                <Dropdown isOpen={isPlantFilterOpen} onClose={() => setIsPlantFilterOpen(false)} className="w-48">
                  <div className="p-2 text-gray-800 dark:text-white/90">
                    <button
                      className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      onClick={() => {
                        setSelectedPlant("");
                        setIsPlantFilterOpen(false);
                      }}
                    >
                      All
                    </button>{" "}
                    {plantsData?.map((plant) => (
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

              {/* Pump Type Filter */}
              <div className="relative text-sm">
                <Button
                  variant="outline"
                  onClick={() => setIsPumpTypeFilterOpen(!isPumpTypeFilterOpen)}
                  className="dropdown-toggle"
                  size="sm"
                >
                  Type: {selectedPumpType || "All"}
                </Button>
                <Dropdown isOpen={isPumpTypeFilterOpen} onClose={() => setIsPumpTypeFilterOpen(false)} className="w-48">
                  <div className="p-2 text-gray-800 dark:text-white/90">
                    <button
                      className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      onClick={() => {
                        setSelectedPumpType("");
                        setIsPumpTypeFilterOpen(false);
                      }}
                    >
                      All
                    </button>
                    {pumpTypes.map((type) => (
                      <button
                        key={type}
                        className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        onClick={() => {
                          setSelectedPumpType(type);
                          setIsPumpTypeFilterOpen(false);
                        }}
                      >
                        {type}
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
                    {statusOptions.map((status) => (
                      <button
                        key={status}
                        className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        onClick={() => {
                          setSelectedStatus(status);
                          setIsStatusFilterOpen(false);
                        }}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </Dropdown>
              </div>

              {/* Date Filter */}
              <div className="relative text-sm">
                <Button
                  variant="outline"
                  onClick={() => setIsDateFilterOpen(!isDateFilterOpen)}
                  className="dropdown-toggle"
                  size="sm"
                >
                  Date Added: {selectedDate || "All time"}
                </Button>
                <Dropdown isOpen={isDateFilterOpen} onClose={() => setIsDateFilterOpen(false)} className="w-48">
                  <div className="p-2 text-gray-800 dark:text-white/90">
                    <button
                      className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      onClick={() => {
                        setSelectedDate("");
                        setIsDateFilterOpen(false);
                      }}
                    >
                      All time
                    </button>
                    {dateRanges.map((range) => (
                      <button
                        key={range}
                        className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
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
                <div className="text-center py-4 text-gray-800 dark:text-white/90">Please sign in to view pumps</div>
              ) : isLoadingPumps ? (
                <div className="flex justify-center py-4">
                  <Spinner text="Loading pumps..." />
                </div>
              ) : isPumpError ? (
                <div className="flex justify-center py-4">
                  <div className="text-center py-4 text-gray-800 dark:text-white/90">
                    There was an error while retriving pumps
                  </div>
                </div>
              ) : (
                <PumpsTable data={filteredData} onEdit={handleEdit} onDelete={handleDelete} plantMap={plantMap} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={handleCloseCreateModal} className="max-w-[800px] p-5 lg:p-10">
        <div className="flex justify-between pr-10 items-center w-full h-fit">
          <h4 className="font-semibold text-gray-800 mb-7 text-title-sm dark:text-white/90">Add New Pump</h4>

          <div
            className={`flex h-6 w-fit rounded border border-black ${
              newPump.type ? (newPump.type === "line" ? "bg-blue-500" : "bg-green-500") : "bg-yellow-500"
            } shadow items-center gap-1`}
          >
            <label
              className={`flex flex-col justify-between ${
                newPump.type === "line" ? "bg-blue-700" : "bg-green-700"
              } rounded-l px-1 py-1 text-[7px] text-white h-full`}
            >
              <img className="h-2 w-auto" src="https://cdn.cdnlogo.com/logos/e/51/eu.svg" alt="EU" />
              IND
            </label>
            <label className="px-2 font-mono text-sm font-medium whitespace-nowrap">
              {newPump.identifier ? newPump.identifier : "XX 00 AA 0000"}
            </label>
          </div>
        </div>{" "}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Pump No.</label>
            <Input
              type="text"
              name="identifier"
              placeholder="e.g. TN 37 DS 5958"
              value={newPump.identifier}
              onChange={handleIdentifierInputChange}
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Capacity</label>
            <Input
              type="number"
              name="capacity"
              placeholder="Enter capacity"
              value={newPump.capacity}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Plant</label>
            <select
              name="plant_id"
              value={newPump.plant_id}
              onChange={handleInputChange}
              className="w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            >
              <option value="">Select Plant</option>
              {plantsData?.map((plant) => (
                <option key={plant._id} value={plant._id}>
                  {plant.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Pump Type</label>
            <select
              name="type"
              value={newPump.type}
              onChange={handleInputChange}
              className="w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            >
              {pumpTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Make</label>
            <Input type="text" name="make" placeholder="Enter make" value={newPump.make} onChange={handleInputChange} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Driver Name</label>
            <Input
              type="text"
              name="driver_name"
              placeholder="Enter driver name"
              value={newPump.driver_name || ""}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Driver Contact</label>
            <Input
              type="text"
              name="driver_contact"
              placeholder="Enter driver contact"
              value={newPump.driver_contact || ""}
              onChange={handleInputChange}
            />
            {driverContactError && <p className="text-red-500 text-xs mt-1">{driverContactError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Remarks</label>
            <Input
              type="text"
              name="remarks"
              placeholder="Enter remarks"
              value={newPump.remarks || ""}
              onChange={handleInputChange}
            />
          </div>
          <div className="col-span-2 flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={handleCloseCreateModal}>
              Cancel
            </Button>
            <Button onClick={handleCreatePump} disabled={createPumpMutation.isPending || !newPump.identifier}>
              {createPumpMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <Spinner size="sm" />
                  <span>Creating...</span>
                </div>
              ) : (
                "Create"
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={handleCloseEditModal} className="max-w-[800px] p-5 lg:p-10">
        <h4 className="font-semibold text-gray-800 mb-7 text-title-sm dark:text-white/90">Edit Pump</h4>
        {selectedPump && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Pump No.</label>
              <Input type="text" name="identifier" value={editedPump.identifier} onChange={handleEditInputChange} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Capacity</label>
              <Input type="number" name="capacity" value={editedPump.capacity} onChange={handleEditInputChange} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Plant</label>
              <select
                name="plant_id"
                value={editedPump.plant_id}
                onChange={handleEditInputChange}
                className="w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              >
                <option value="">Select Plant</option>
                {plantsData?.map((plant) => (
                  <option key={plant._id} value={plant._id}>
                    {plant.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Pump Type</label>
              <select
                name="type"
                value={editedPump.type}
                onChange={handleEditInputChange}
                className="w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              >
                {pumpTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Make</label>
              <Input type="text" name="make" value={editedPump.make} onChange={handleEditInputChange} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Driver Name</label>
              <Input
                type="text"
                name="driver_name"
                value={editedPump.driver_name || ""}
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
                value={editedPump.driver_contact || ""}
                onChange={handleEditInputChange}
              />
              {editDriverContactError && <p className="text-red-500 text-xs mt-1">{editDriverContactError}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Remarks</label>
              <Input type="text" name="remarks" value={editedPump.remarks || ""} onChange={handleEditInputChange} />
            </div>
            <div className="col-span-2 flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={handleCloseEditModal}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={editPumpMutation.isPending}>
                {editPumpMutation.isPending ? (
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
        <h4 className="font-semibold text-gray-800 mb-7 text-title-sm dark:text-white/90">Delete Pump</h4>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Are you sure you want to delete this pump? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="warning" onClick={handleConfirmDelete} disabled={deletePumpMutation.isPending}>
            {deletePumpMutation.isPending ? (
              <div className="flex items-center gap-2">
                <Spinner size="sm" />
                <span>Deleting...</span>
              </div>
            ) : (
              "Delete"
            )}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
