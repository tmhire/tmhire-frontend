"use client";

import PlantsTable from "./PlantsTable";
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
import { validateMobile, validateName, validateAddress, validateCoordinates } from "@/lib/utils";

interface Plant {
  _id: string;
  user_id: string;
  name: string;
  capacity: number | null;
  location: string;
  address: string;
  coordinates: string | null;
  contact_name1: string | null;
  contact_number1: string | null;
  contact_name2: string | null;
  contact_number2: string | null;
  remarks: string | null;
  status: "active" | "inactive";
  created_at: string;
}

interface CreatePlantData {
  name: string;
  capacity?: number;
  location: string;
  address: string;
  coordinates?: string;
  contact_name1: string;
  contact_number1: string;
  contact_name2?: string;
  contact_number2?: string;
  remarks?: string;
  status: "active" | "inactive";
}

export default function PlantsContainer() {
  const { fetchWithAuth } = useApiClient();
  const { status } = useSession();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isLocationFilterOpen, setIsLocationFilterOpen] = useState(false);
  const [isContactFilterOpen, setIsContactFilterOpen] = useState(false);
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedContact, setSelectedContact] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [editedPlant, setEditedPlant] = useState<CreatePlantData>({
    name: "",
    location: "",
    address: "",
    contact_name1: "",
    contact_number1: "",
    status: "active",
  });
  const [newPlant, setNewPlant] = useState<CreatePlantData>({
    name: "",
    location: "",
    address: "",
    contact_name1: "",
    contact_number1: "",
    status: "active",
  });

  // Validation state variables
  const [nameError, setNameError] = useState<string>("");
  const [contactName1Error, setContactName1Error] = useState<string>("");
  const [contactName2Error, setContactName2Error] = useState<string>("");
  const [contactNumber1Error, setContactNumber1Error] = useState<string>("");
  const [contactNumber2Error, setContactNumber2Error] = useState<string>("");
  const [editNameError, setEditNameError] = useState<string>("");
  const [editContactName1Error, setEditContactName1Error] = useState<string>("");
  const [editContactName2Error, setEditContactName2Error] = useState<string>("");
  const [editContactNumber1Error, setEditContactNumber1Error] = useState<string>("");
  const [editContactNumber2Error, setEditContactNumber2Error] = useState<string>("");
  const [capacityError, setCapacityError] = useState<string>("");
  const [editCapacityError, setEditCapacityError] = useState<string>("");

  // Form validation for create modal
  const isCreateFormValid = useMemo(() => {
    return (
      newPlant.name.trim() !== "" &&
      newPlant.location.trim() !== "" &&
      newPlant.address.trim() !== "" &&
      newPlant.contact_name1.trim() !== "" &&
      newPlant.contact_number1.trim() !== "" &&
      (!newPlant.capacity || (newPlant.capacity > 0 && newPlant.capacity <= 99)) &&
      validateName(newPlant.name.trim()) &&
      validateName(newPlant.contact_name1.trim()) &&
      validateMobile(newPlant.contact_number1.trim()) &&
      validateAddress(newPlant.address.trim()) &&
      (newPlant.coordinates === "" || (newPlant.coordinates && validateCoordinates(newPlant.coordinates.trim()))) &&
      !nameError &&
      !contactName1Error &&
      !contactNumber1Error &&
      !capacityError
    );
  }, [newPlant, nameError, contactName1Error, contactNumber1Error, capacityError]);

  // Form validation for edit modal
  const isEditFormValid = useMemo(() => {
    return (
      editedPlant.name.trim() !== "" &&
      editedPlant.location.trim() !== "" &&
      editedPlant.address.trim() !== "" &&
      editedPlant.contact_name1.trim() !== "" &&
      editedPlant.contact_number1.trim() !== "" &&
      (!editedPlant.capacity || (editedPlant.capacity > 0 && editedPlant.capacity <= 99)) &&
      validateName(editedPlant.name.trim()) &&
      validateName(editedPlant.contact_name1.trim()) &&
      validateMobile(editedPlant.contact_number1.trim()) &&
      validateAddress(editedPlant.address.trim()) &&
      (editedPlant.coordinates === "" ||
        (editedPlant.coordinates && validateCoordinates(editedPlant.coordinates.trim()))) &&
      (editedPlant.contact_name2 === "" ||
        (editedPlant.contact_name2 && validateName(editedPlant.contact_name2.trim()))) &&
      (editedPlant.contact_number2 === "" ||
        (editedPlant.contact_number2 && validateMobile(editedPlant.contact_number2.trim()))) &&
      !editNameError &&
      !editContactName1Error &&
      !editContactName2Error &&
      !editContactNumber1Error &&
      !editContactNumber2Error &&
      !editCapacityError
    );
  }, [
    editedPlant,
    editNameError,
    editContactName1Error,
    editContactName2Error,
    editContactNumber1Error,
    editContactNumber2Error,
    editCapacityError,
  ]);

  const { data: plantsData, isLoading: isLoadingPlants } = useQuery({
    queryKey: ["plants"],
    queryFn: async () => {
      const response = await fetchWithAuth("/plants");
      if (!response) throw new Error("No response from server");
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Failed to fetch plants");
      return data.data as Plant[];
    },
    enabled: status === "authenticated",
  });

  // Create plant mutation
  const createPlantMutation = useMutation({
    mutationFn: async (plantData: CreatePlantData) => {
      const response = await fetchWithAuth("/plants", {
        method: "POST",
        body: JSON.stringify(plantData),
      });
      if (!response) throw new Error("No response from server");
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Failed to create plant");
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plants"] });
      setIsCreateModalOpen(false);
      setNewPlant({
        name: "",
        location: "",
        address: "",
        contact_name1: "",
        contact_number1: "",
        status: "active",
      });
    },
  });

  // Edit plant mutation
  const editPlantMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CreatePlantData }) => {
      const response = await fetchWithAuth(`/plants/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (!response) throw new Error("No response from server");
      const responseData = await response.json();
      if (!responseData.success) throw new Error(responseData.message || "Failed to update plant");
      return responseData.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plants"] });
      setIsEditModalOpen(false);
      setSelectedPlant(null);
    },
  });

  // Delete plant mutation
  const deletePlantMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetchWithAuth(`/plants/${id}`, {
        method: "DELETE",
      });
      if (!response) throw new Error("No response from server");
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Failed to delete plant");
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plants"] });
      setIsDeleteModalOpen(false);
      setSelectedPlant(null);
    },
  });

  const handleAddPlant = () => {
    setIsCreateModalOpen(true);
  };

  const handleCreatePlant = async () => {
    try {
      await createPlantMutation.mutateAsync(newPlant);
    } catch (error) {
      console.error("Error creating plant:", error);
    }
  };

  const handleEdit = (plant: Plant) => {
    setSelectedPlant(plant);
    setEditedPlant({
      name: plant.name,
      capacity: plant.capacity || undefined,
      location: plant.location,
      address: plant.address,
      coordinates: plant.coordinates || "",
      contact_name1: plant.contact_name1 || "",
      contact_number1: plant.contact_number1 || "",
      contact_name2: plant.contact_name2 || "",
      contact_number2: plant.contact_number2 || "",
      remarks: plant.remarks || "",
      status: plant.status,
    });
    setIsEditModalOpen(true);
  };

  const handleDelete = (plant: Plant) => {
    setSelectedPlant(plant);
    setIsDeleteModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedPlant) return;
    try {
      await editPlantMutation.mutateAsync({
        id: selectedPlant._id,
        data: editedPlant,
      });
    } catch (error) {
      console.error("Error updating plant:", error);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedPlant) return;
    try {
      await deletePlantMutation.mutateAsync(selectedPlant._id);
    } catch (error) {
      console.error("Error deleting plant:", error);
    }
  };

  const { data: avgTMCapData } = useQuery<{ average_capacity: number }>({
    queryKey: ["average-tm-capacity"],
    queryFn: async () => {
      const response = await fetchWithAuth("/tms/average-capacity");
      const data = await response.json();
      if (data.success && data.data && typeof data.data.average_capacity === "number") {
        return { average_capacity: data.data.average_capacity };
      }
      throw new Error("Failed to fetch average TM capacity");
    },
  });
  const avgTMCap = Math.ceil(avgTMCapData?.average_capacity || 0) ?? null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Handle capacity field with validation
    if (name === "capacity") {
      // Strictly prevent entering values greater than 99
      if (value !== "" && Number(value) > 999) {
        return; // Don't update the state if value exceeds 99
      }

      if (value === "") {
        setCapacityError(""); // Allow empty capacity
      } else {
        const numValue = Number(value);
        if (numValue < 1 || numValue > 999) {
          setCapacityError("Capacity must be between 1 and 99 m³/hr");
        } else if (!Number.isInteger(numValue * 10)) {
          setCapacityError("Capacity can have maximum one decimal place");
        } else {
          setCapacityError("");
        }
      }
    }

    // Handle name fields with validation
    if (name === "name" || name === "contact_name1" || name === "contact_name2") {
      if (value.length > 25) return; // Prevent typing more than 25 characters
      if (value && !validateName(value)) {
        if (name === "name") setNameError("Name must be 1-25 alphanumeric characters");
        else if (name === "contact_name1") setContactName1Error("Contact name must be 1-25 alphanumeric characters");
        else if (name === "contact_name2") setContactName2Error("Contact name must be 1-25 alphanumeric characters");
      } else {
        if (name === "name") setNameError("");
        else if (name === "contact_name1") setContactName1Error("");
        else if (name === "contact_name2") setContactName2Error("");
      }
    }

    // Handle contact number fields with validation
    if (name === "contact_number1" || name === "contact_number2") {
      if (value.length > 10) return; // Prevent typing more than 10 digits
      if (value && !validateMobile(value)) {
        if (name === "contact_number1") setContactNumber1Error("Please enter a valid 10-digit mobile number");
        else if (name === "contact_number2") setContactNumber2Error("Please enter a valid 10-digit mobile number");
      } else {
        if (name === "contact_number1") setContactNumber1Error("");
        else if (name === "contact_number2") setContactNumber2Error("");
      }
    }

    setNewPlant((prev) => ({
      ...prev,
      [name]: name === "capacity" ? (value === "" ? undefined : Number(value)) : value,
    }));
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Handle capacity field with validation
    if (name === "capacity") {
      // Strictly prevent entering values greater than 99
      if (value !== "" && Number(value) > 999) {
        return; // Don't update the state if value exceeds 99
      }

      if (value === "") {
        setEditCapacityError(""); // Allow empty capacity
      } else {
        const numValue = Number(value);
        if (numValue < 1 || numValue > 999) {
          setEditCapacityError("Capacity must be between 1 and 99 m³/hr");
        } else if (!Number.isInteger(numValue * 10)) {
          setEditCapacityError("Capacity can have maximum one decimal place");
        } else {
          setEditCapacityError("");
        }
      }
    }

    // Handle name fields with validation
    if (name === "name" || name === "contact_name1" || name === "contact_name2") {
      if (value.length > 25) return; // Prevent typing more than 25 characters
      if (value && !validateName(value)) {
        if (name === "name") setEditNameError("Name must be 1-25 alphanumeric characters");
        else if (name === "contact_name1")
          setEditContactName1Error("Contact name must be 1-25 alphanumeric characters");
        else if (name === "contact_name2")
          setEditContactName2Error("Contact name must be 1-25 alphanumeric characters");
      } else {
        if (name === "name") setEditNameError("");
        else if (name === "contact_name1") setEditContactName1Error("");
        else if (name === "contact_name2") setEditContactName2Error("");
      }
    }

    // Handle contact number fields with validation
    if (name === "contact_number1" || name === "contact_number2") {
      if (value.length > 10) return; // Prevent typing more than 10 digits
      if (value && !validateMobile(value)) {
        if (name === "contact_number1") setEditContactNumber1Error("Please enter a valid 10-digit mobile number");
        else if (name === "contact_number2") setEditContactNumber2Error("Please enter a valid 10-digit mobile number");
      } else {
        if (name === "contact_number1") setEditContactNumber1Error("");
        else if (name === "contact_number2") setEditContactNumber2Error("");
      }
    }

    setEditedPlant((prev) => ({
      ...prev,
      [name]: name === "capacity" ? (value === "" ? undefined : Number(value)) : value,
    }));
  };

  // Get unique locations from plants data
  const locations = useMemo(() => {
    if (!plantsData) return [];
    const uniqueLocations = Array.from(new Set(plantsData.map((plant) => plant.location)));
    return uniqueLocations.sort();
  }, [plantsData]);

  // Get unique contact names for filtering
  const contactNames = useMemo(() => {
    if (!plantsData) return [];
    const names = plantsData
      .flatMap((plant) => [plant.contact_name1, plant.contact_name2])
      .filter((name): name is string => name !== null && name !== "");
    const uniqueNames = Array.from(new Set(names));
    return uniqueNames.sort();
  }, [plantsData]);

  // Date range options
  const dateRanges = useMemo(() => {
    // const now = new Date();
    return [
      { label: "Last 7 days", days: 7 },
      { label: "Last 30 days", days: 30 },
      { label: "Last 90 days", days: 90 },
      { label: "All time", days: Infinity },
    ];
  }, []);

  // Filter plants based on search, location, and date
  const filteredData = useMemo(() => {
    if (!plantsData) return [];

    return plantsData.filter((plant) => {
      // Search filter - search across all columns
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        plant.name.toLowerCase().includes(searchLower) ||
        plant.address.toLowerCase().includes(searchLower) ||
        plant.location.toLowerCase().includes(searchLower) ||
        (plant.coordinates && plant.coordinates.toLowerCase().includes(searchLower)) ||
        (plant.contact_name1 && plant.contact_name1.toLowerCase().includes(searchLower)) ||
        (plant.contact_number1 && plant.contact_number1.toLowerCase().includes(searchLower)) ||
        (plant.contact_name2 && plant.contact_name2.toLowerCase().includes(searchLower)) ||
        (plant.contact_number2 && plant.contact_number2.toLowerCase().includes(searchLower)) ||
        (plant.remarks && plant.remarks.toLowerCase().includes(searchLower)) ||
        plant._id.toLowerCase().includes(searchLower);

      // Location filter
      const matchesLocation = !selectedLocation || plant.location === selectedLocation;

      // Contact filter
      const matchesContact =
        !selectedContact || plant.contact_name1 === selectedContact || plant.contact_name2 === selectedContact;

      // Date filter
      const plantDate = new Date(plant.created_at);
      const now = new Date();
      let matchesDate = true;

      if (selectedDate) {
        const selectedRange = dateRanges.find((range) => range.label === selectedDate);
        if (selectedRange) {
          if (selectedRange.days !== Infinity) {
            const cutoffDate = new Date(now.getTime() - selectedRange.days * 24 * 60 * 60 * 1000);
            matchesDate = plantDate >= cutoffDate;
          }
        }
      }

      // Status filter
      const matchesStatus = !selectedStatus || plant.status === selectedStatus;

      return matchesSearch && matchesLocation && matchesContact && matchesDate && matchesStatus;
    });
  }, [plantsData, searchQuery, selectedLocation, selectedContact, selectedDate, selectedStatus, dateRanges]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">RMC Plants</h2>
        <nav>
          <Button className="flex items-center gap-2" size="sm" onClick={handleAddPlant}>
            <PlusIcon className="w-4 h-4" />
            Add Plant
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
                  className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-14 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 xl:w-[430px]"
                />
              </div>

              {/* Location Filter */}
              <div className="relative text-sm">
                <Button
                  variant="outline"
                  onClick={() => setIsLocationFilterOpen(!isLocationFilterOpen)}
                  className="dropdown-toggle"
                  size="sm"
                >
                  Location: {selectedLocation || "All"}
                </Button>
                <Dropdown isOpen={isLocationFilterOpen} onClose={() => setIsLocationFilterOpen(false)} className="w-48">
                  <div className="p-2 text-gray-800 dark:text-white/90 ">
                    <button
                      className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      onClick={() => {
                        setSelectedLocation("");
                        setIsLocationFilterOpen(false);
                      }}
                    >
                      All
                    </button>
                    {locations.map((location) => (
                      <button
                        key={location}
                        className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        onClick={() => {
                          setSelectedLocation(location);
                          setIsLocationFilterOpen(false);
                        }}
                      >
                        {location}
                      </button>
                    ))}
                  </div>
                </Dropdown>
              </div>

              {/* Contact Filter */}
              <div className="relative text-sm">
                <Button
                  variant="outline"
                  onClick={() => setIsContactFilterOpen(!isContactFilterOpen)}
                  className="dropdown-toggle"
                  size="sm"
                >
                  Contact: {selectedContact || "All"}
                </Button>
                <Dropdown isOpen={isContactFilterOpen} onClose={() => setIsContactFilterOpen(false)} className="w-48">
                  <div className="p-2 text-gray-800 dark:text-white/90 ">
                    <button
                      className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      onClick={() => {
                        setSelectedContact("");
                        setIsContactFilterOpen(false);
                      }}
                    >
                      All
                    </button>
                    {contactNames.map((name) => (
                      <button
                        key={name}
                        className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        onClick={() => {
                          setSelectedContact(name);
                          setIsContactFilterOpen(false);
                        }}
                      >
                        {name}
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
                        key={range.label}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        onClick={() => {
                          setSelectedDate(range.label);
                          setIsDateFilterOpen(false);
                        }}
                      >
                        {range.label}
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
                  Status: {selectedStatus || "All"}
                </Button>
                <Dropdown
                  isOpen={isStatusFilterOpen}
                  onClose={() => setIsStatusFilterOpen(false)}
                  className="w-48 text-xs"
                >
                  <div className="p-2 text-gray-800 dark:text-white/90">
                    <button
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      onClick={() => {
                        setSelectedStatus("");
                        setIsStatusFilterOpen(false);
                      }}
                    >
                      All
                    </button>
                    <button
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      onClick={() => {
                        setSelectedStatus("active");
                        setIsStatusFilterOpen(false);
                      }}
                    >
                      Active
                    </button>
                    <button
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      onClick={() => {
                        setSelectedStatus("inactive");
                        setIsStatusFilterOpen(false);
                      }}
                    >
                      Inactive
                    </button>
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
                <div className="text-center py-4 text-gray-800 dark:text-white/90">Please sign in to view plants</div>
              ) : isLoadingPlants ? (
                <div className="flex justify-center py-4">
                  <Spinner text="Loading plants..." />
                </div>
              ) : (
                <PlantsTable data={filteredData} onEdit={handleEdit} onDelete={handleDelete} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        className="max-w-[850px] p-5 lg:p-10"
      >
        <h4 className="font-semibold text-gray-800 mb-7 text-title-sm dark:text-white/90">Add New Plant</h4>
        <div className="space-y-4">
          <div className="flex flex-row w-full gap-2">
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name</label>
              <Input
                type="text"
                name="name"
                placeholder="Enter plant name (add prefix as your brand name)"
                value={newPlant.name}
                onChange={handleInputChange}
                maxLength={25}
              />
              {nameError && <span className="text-xs text-red-600 mt-1 block">{nameError}</span>}
            </div>
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Capacity m³/hr
              </label>
              <div className="flex flex-row items-center gap-2 w-full">
                <div className="relative w-full">
                  <Input
                    type="number"
                    name="capacity"
                    placeholder="Enter plant capacity (1-999)"
                    value={newPlant.capacity || ""}
                    onChange={handleInputChange}
                    step={0.1}
                    min="1"
                    max="999"
                    className="w-full"
                  />
                </div>
                <span className="text-xs text-gray-500 font-medium whitespace-nowrap">or</span>
              </div>
              {capacityError && <span className="text-xs text-red-600 mt-1 block">{capacityError}</span>}
            </div>

            <div className="w-full">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex flex-row justify-between">
                Loading Time (min){" "}
                {newPlant?.capacity && (
                  <span className="text-[10px] text-gray-500 block">Using Avg TM Cap: {avgTMCap}</span>
                )}
              </label>
              <div className="flex flex-row items-center gap-2 w-full">
                <div className="relative w-full">
                  <Input
                    type="number"
                    name="capacity"
                    placeholder="Enter capacity"
                    value={newPlant?.capacity ? Math.ceil(newPlant.capacity / avgTMCap / 5) * 5 : ""}
                    disabled
                    className="pr-28" // add right padding so text doesn't overlap
                  />
                  {newPlant?.capacity && (
                    <span className="absolute inset-y-0 right-2 flex items-center text-[10px] text-gray-500">
                      (rounded off to nearest 5)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-row w-full gap-2">
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Location</label>
              <Input
                type="text"
                name="location"
                placeholder="Enter plant location (max 30 characters)"
                value={newPlant.location}
                onChange={handleInputChange}
                maxLength={30}
              />
            </div>
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Coordinates</label>
              <Input
                type="text"
                name="coordinates"
                placeholder="Enter coordinates (optional, max 60 characters)"
                value={newPlant.coordinates || ""}
                onChange={handleInputChange}
                maxLength={60}
              />
            </div>
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Status</label>
              <select
                name="status"
                value={newPlant.status || ""}
                onChange={handleInputChange}
                className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-4 pr-12 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
              >
                <option value="">Select Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Address</label>
            <Input
              type="text"
              name="address"
              placeholder="Enter plant address (max 60 characters)"
              value={newPlant.address}
              onChange={handleInputChange}
              maxLength={60}
            />
          </div>

          <div className="flex flex-row w-full gap-2">
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ">
                Contact 1 Name
              </label>
              <Input
                type="text"
                name="contact_name1"
                placeholder="Enter contact 1 name (max 25 characters)"
                value={newPlant.contact_name1}
                onChange={handleInputChange}
                maxLength={25}
              />
              {contactName1Error && <span className="text-xs text-red-600 mt-1 block">{contactName1Error}</span>}
            </div>
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Contact 1 Mobile Number
              </label>
              <Input
                type="text"
                name="contact_number1"
                placeholder="Enter 10-digit mobile number"
                value={newPlant.contact_number1}
                onChange={handleInputChange}
                maxLength={10}
              />
              {contactNumber1Error && <span className="text-xs text-red-600 mt-1 block">{contactNumber1Error}</span>}
            </div>
          </div>
          <div className="flex flex-row w-full gap-2">
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Contact 2 Name
              </label>
              <Input
                type="text"
                name="contact_name2"
                placeholder="Enter contact 2 name (optional, max 25 characters)"
                value={newPlant.contact_name2 || ""}
                onChange={handleInputChange}
                maxLength={25}
              />
              {contactName2Error && <span className="text-xs text-red-600 mt-1 block">{contactName2Error}</span>}
            </div>
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Contact 2 Mobile Number
              </label>
              <Input
                type="text"
                name="contact_number2"
                placeholder="Enter 10-digit mobile number (optional)"
                value={newPlant.contact_number2 || ""}
                onChange={handleInputChange}
                maxLength={10}
              />
              {contactNumber2Error && <span className="text-xs text-red-600 mt-1 block">{contactNumber2Error}</span>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Remarks</label>
            <Input
              type="text"
              name="remarks"
              placeholder="Enter remarks (optional, max 50 characters)"
              value={newPlant.remarks || ""}
              onChange={handleInputChange}
              maxLength={50}
            />
          </div>
        </div>
        <div className="flex items-center justify-end w-full gap-3 mt-8">
          <Button size="sm" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleCreatePlant} disabled={createPlantMutation.isPending || !isCreateFormValid}>
            {createPlantMutation.isPending ? (
              <div className="flex items-center gap-2">
                <Spinner size="sm" />
                <span>Creating...</span>
              </div>
            ) : (
              "Create Plant"
            )}
          </Button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} className="max-w-[850px] p-5 lg:p-10">
        <h4 className="font-semibold text-gray-800 mb-7 text-title-sm dark:text-white/90">Edit Plant</h4>
        {selectedPlant && (
          <div className="space-y-4">
            <div className="flex flex-row w-full gap-2">
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name</label>
                <Input
                  type="text"
                  name="name"
                  value={editedPlant.name}
                  onChange={handleEditInputChange}
                  placeholder="Enter plant name (add prefix as your brand name)"
                  maxLength={25}
                />
                {editNameError && <span className="text-xs text-red-600 mt-1 block">{editNameError}</span>}
              </div>
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Capacity m³/hr
                </label>
                <Input
                  type="number"
                  name="capacity"
                  value={editedPlant.capacity || ""}
                  onChange={handleEditInputChange}
                  placeholder="Enter plant capacity (1-999)"
                  step={0.1}
                  min="1"
                  max="999"
                />
                {editCapacityError && <span className="text-xs text-red-600 mt-1 block">{editCapacityError}</span>}
              </div>
              <div className="w-full">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex flex-row justify-between">
                  Loading Time (min){" "}
                  {editedPlant?.capacity && (
                    <span className="text-[10px] text-gray-500 block">Using Avg TM Cap: {avgTMCap}</span>
                  )}
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    name="capacity"
                    placeholder="Enter plant capacity to calculate"
                    value={editedPlant?.capacity ? Math.ceil(editedPlant.capacity / avgTMCap / 5) * 5 : ""}
                    disabled
                    className="pr-28" // add right padding so text doesn't overlap
                  />
                  {editedPlant?.capacity && (
                    <span className="absolute inset-y-0 right-2 flex items-center text-[10px] text-gray-500">
                      (rounded off to nearest 5)
                    </span>
                  )}
                </div>

                {editCapacityError && <span className="text-xs text-red-600 mt-1 block">{editCapacityError}</span>}
              </div>
            </div>
            <div className="flex flex-row w-full gap-2">
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Location</label>
                <Input
                  type="text"
                  name="location"
                  value={editedPlant.location}
                  onChange={handleEditInputChange}
                  placeholder="Enter plant location (max 30 characters)"
                  maxLength={30}
                />
              </div>
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Coordinates</label>
                <Input
                  type="text"
                  name="coordinates"
                  placeholder="Enter coordinates (optional, max 60 characters)"
                  value={editedPlant.coordinates || ""}
                  onChange={handleEditInputChange}
                  maxLength={60}
                />
              </div>
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Status</label>
                <select
                  name="status"
                  value={editedPlant.status || ""}
                  onChange={handleEditInputChange}
                  className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-4 pr-12 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
                >
                  <option value="">Select Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Address</label>
              <Input
                type="text"
                name="address"
                value={editedPlant.address}
                onChange={handleEditInputChange}
                placeholder="Enter plant address (max 60 characters)"
                maxLength={60}
              />
            </div>

            <div className="flex flex-row w-full gap-2">
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ">
                  Contact 1 Name
                </label>
                <Input
                  type="text"
                  name="contact_name1"
                  placeholder="Enter contact 1 name (max 25 characters)"
                  value={editedPlant.contact_name1 || ""}
                  onChange={handleEditInputChange}
                  maxLength={25}
                />
                {editContactName1Error && (
                  <span className="text-xs text-red-600 mt-1 block">{editContactName1Error}</span>
                )}
              </div>
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Contact 1 Mobile Number
                </label>
                <Input
                  type="text"
                  name="contact_number1"
                  placeholder="Enter 10-digit mobile number"
                  value={editedPlant.contact_number1 || ""}
                  onChange={handleEditInputChange}
                  maxLength={10}
                />
                {editContactNumber1Error && (
                  <span className="text-xs text-red-600 mt-1 block">{editContactNumber1Error}</span>
                )}
              </div>
            </div>
            <div className="flex flex-row w-full gap-2">
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Contact 2 Name
                </label>
                <Input
                  type="text"
                  name="contact_name2"
                  placeholder="Enter contact 2 name (optional, max 25 characters)"
                  value={editedPlant.contact_name2 || ""}
                  onChange={handleEditInputChange}
                  maxLength={25}
                />
                {editContactName2Error && (
                  <span className="text-xs text-red-600 mt-1 block">{editContactName2Error}</span>
                )}
              </div>
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Contact 2 Mobile Number
                </label>
                <Input
                  type="text"
                  name="contact_number2"
                  placeholder="Enter 10-digit mobile number (optional)"
                  value={editedPlant.contact_number2 || ""}
                  onChange={handleEditInputChange}
                  maxLength={10}
                />
                {editContactNumber2Error && (
                  <span className="text-xs text-red-600 mt-1 block">{editContactNumber2Error}</span>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Remarks</label>
              <Input
                type="text"
                name="remarks"
                value={editedPlant.remarks || ""}
                onChange={handleEditInputChange}
                placeholder="Enter remarks (optional, max 50 characters)"
                maxLength={50}
              />
            </div>
          </div>
        )}
        <div className="flex items-center justify-end w-full gap-3 mt-8">
          <Button size="sm" variant="outline" onClick={() => setIsEditModalOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSaveEdit} disabled={editPlantMutation.isPending || !isEditFormValid}>
            {editPlantMutation.isPending ? (
              <div className="flex items-center gap-2">
                <Spinner size="sm" />
                <span>Saving...</span>
              </div>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        className="max-w-[500px] p-5 lg:p-10"
      >
        <h4 className="font-semibold text-gray-800 mb-4 text-title-sm dark:text-white/90">Delete Plant</h4>
        {selectedPlant && (
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Are you sure you want to delete {selectedPlant.name}? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end w-full gap-3 mt-8">
              <Button size="sm" variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="warning"
                onClick={handleConfirmDelete}
                disabled={deletePlantMutation.isPending}
              >
                {deletePlantMutation.isPending ? (
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
        )}
      </Modal>
    </div>
  );
}
