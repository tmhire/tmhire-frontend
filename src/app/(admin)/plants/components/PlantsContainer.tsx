"use client";

import PlantsTable from "./PlantsTable";
import { PlusIcon, Search, Info } from "lucide-react";
import Button from "@/components/ui/button/Button";
import { useState, useMemo } from "react";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { Modal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";
import { useApiClient } from "@/hooks/useApiClient";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/spinner";
import { validateMobile, validateName, validatePlantName, validateAddress, validateCoordinates } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";

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
  created_by?: string;
  created_by_name?: string;
  company_id?: string;
}

interface CreatePlantData {
  name: string;
  capacity?: number;
  unloading_time?: number;
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
  // Standard TM capacity constant
  const STANDARD_TM_CAPACITY = 7; // m³

  const { fetchWithAuth } = useApiClient();
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
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
  const [unloadingTimeError, setUnloadingTimeError] = useState<string>("");
  const [editUnloadingTimeError, setEditUnloadingTimeError] = useState<string>("");

  // Create modal validation
  const isCreateFormValid = useMemo(() => {
    const name = newPlant.name?.trim() ?? "";
    const location = newPlant.location?.trim() ?? "";
    const address = newPlant.address?.trim() ?? "";
    const contactName1 = newPlant.contact_name1?.trim() ?? "";
    const contactNumber1 = newPlant.contact_number1?.trim() ?? "";
    const contactName2 = newPlant.contact_name2?.trim() ?? "";
    const contactNumber2 = newPlant.contact_number2?.trim() ?? "";
    const coordinates = newPlant.coordinates?.trim() ?? "";
    // Either capacity or unloading_time must be provided (not both required, but at least one)
    const hasCapacityOrUnloading = (newPlant.capacity && newPlant.capacity > 0) || (newPlant.unloading_time && newPlant.unloading_time > 0);

    return (
      name !== "" &&
      location !== "" &&
      address !== "" &&
      contactName1 !== "" &&
      contactNumber1 !== "" &&
      hasCapacityOrUnloading &&
      validatePlantName(name) &&
      validateName(contactName1) &&
      validateMobile(contactNumber1) &&
      validateAddress(address) &&
      (coordinates === "" || validateCoordinates(coordinates)) &&
      (contactName2 === "" || validateName(contactName2)) &&
      (contactNumber2 === "" || validateMobile(contactNumber2)) &&
      !nameError &&
      !contactName1Error &&
      !contactNumber1Error &&
      !capacityError &&
      !unloadingTimeError &&
      (contactName2 === "" || !contactName2Error) &&
      (contactNumber2 === "" || !contactNumber2Error)
    );
  }, [
    newPlant,
    nameError,
    contactName1Error,
    contactNumber1Error,
    contactName2Error,
    contactNumber2Error,
    capacityError,
    unloadingTimeError,
  ]);


  // Edit modal validation
  const isEditFormValid = useMemo(() => {
    const name = editedPlant.name?.trim() ?? "";
    const location = editedPlant.location?.trim() ?? "";
    const address = editedPlant.address?.trim() ?? "";
    const contactName1 = editedPlant.contact_name1?.trim() ?? "";
    const contactNumber1 = editedPlant.contact_number1?.trim() ?? "";
    const contactName2 = editedPlant.contact_name2?.trim() ?? "";
    const contactNumber2 = editedPlant.contact_number2?.trim() ?? "";
    const coordinates = editedPlant.coordinates?.trim() ?? "";
    // Either capacity or unloading_time must be provided (not both required, but at least one)
    const hasCapacityOrUnloading = (editedPlant.capacity && editedPlant.capacity > 0) || (editedPlant.unloading_time && editedPlant.unloading_time > 0);

    return (
      name !== "" &&
      location !== "" &&
      address !== "" &&
      contactName1 !== "" &&
      contactNumber1 !== "" &&
      hasCapacityOrUnloading &&
      validatePlantName(name) &&
      validateName(contactName1) &&
      validateMobile(contactNumber1) &&
      validateAddress(address) &&
      (coordinates === "" || validateCoordinates(coordinates)) &&
      (contactName2 === "" || validateName(contactName2)) &&
      (contactNumber2 === "" || validateMobile(contactNumber2)) &&
      !editNameError &&
      !editContactName1Error &&
      !editContactNumber1Error &&
      !editCapacityError &&
      !editUnloadingTimeError &&
      (contactName2 === "" || !editContactName2Error) &&
      (contactNumber2 === "" || !editContactNumber2Error)
    );
  }, [
    editedPlant,
    editNameError,
    editContactName1Error,
    editContactNumber1Error,
    editContactName2Error,
    editContactNumber2Error,
    editCapacityError,
    editUnloadingTimeError,
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
      showSuccess("Plant created successfully!");
    },
    onError: (error: Error) => {
      showError(error.message || "Failed to create plant");
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
      showSuccess("Plant updated successfully!");
    },
    onError: (error: Error) => {
      showError(error.message || "Failed to update plant");
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
      showSuccess("Plant deleted successfully!");
    },
    onError: (error: Error) => {
      showError(error.message || "Failed to delete plant");
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
    // Calculate unloading time if capacity exists
    const unloadingTime = plant.capacity ? Math.ceil(plant.capacity / STANDARD_TM_CAPACITY) : undefined;
    setEditedPlant({
      name: plant.name,
      capacity: plant.capacity || undefined,
      unloading_time: unloadingTime,
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Handle capacity field with validation and auto-calculate unloading time
    if (name === "capacity") {
      if (value !== "" && Number(value) > 999) {
        return;
      }

      if (value === "") {
        setCapacityError("");
        setNewPlant((prev) => ({
          ...prev,
          capacity: undefined,
          unloading_time: undefined,
        }));
      } else {
        const numValue = Number(value);
        if (numValue < 1 || numValue > 999) {
          setCapacityError("Capacity must be between 1 and 999 m³/hr");
        } else if (!Number.isInteger(numValue * 10)) {
          setCapacityError("Capacity can have maximum one decimal place");
        } else {
          setCapacityError("");
          // Auto-calculate unloading time: ceil(capacity / 7)
          const calculatedUnloadingTime = Math.ceil(numValue / STANDARD_TM_CAPACITY);
          setNewPlant((prev) => ({
            ...prev,
            capacity: numValue,
            unloading_time: calculatedUnloadingTime,
          }));
        }
        return;
      }
    }

    // Handle unloading time field with validation and auto-calculate capacity
    if (name === "unloading_time") {
      if (value !== "" && Number(value) > 999) {
        return;
      }

      if (value === "") {
        setUnloadingTimeError("");
        setNewPlant((prev) => ({
          ...prev,
          unloading_time: undefined,
          capacity: undefined,
        }));
      } else {
        const numValue = Number(value);
        if (numValue < 1 || numValue > 999) {
          setUnloadingTimeError("Unloading time must be between 1 and 999 minutes");
        } else if (!Number.isInteger(numValue)) {
          setUnloadingTimeError("Unloading time must be a whole number");
        } else {
          setUnloadingTimeError("");
          // Auto-calculate capacity: (60 / unloading_time) * 7
          const calculatedCapacity = (60 / numValue) * STANDARD_TM_CAPACITY;
          setNewPlant((prev) => ({
            ...prev,
            unloading_time: numValue,
            capacity: Math.round(calculatedCapacity * 10) / 10, // Round to 1 decimal place
          }));
        }
        return;
      }
    }

    // Handle name fields with validation
    if (name === "name" || name === "contact_name1" || name === "contact_name2") {
      if (value.length > 25) return;
      if (value && !(name === "name" ? validatePlantName(value) : validateName(value))) {
        if (name === "name") setNameError("Name must be 1-25 characters");
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
      if (value.length > 10) return;
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
      [name]: name === "capacity" || name === "unloading_time" ? (value === "" ? undefined : Number(value)) : value,
    }));
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Handle capacity field with validation and auto-calculate unloading time
    if (name === "capacity") {
      if (value !== "" && Number(value) > 999) {
        return;
      }

      if (value === "") {
        setEditCapacityError("");
        setEditedPlant((prev) => ({
          ...prev,
          capacity: undefined,
          unloading_time: undefined,
        }));
      } else {
        const numValue = Number(value);
        if (numValue < 1 || numValue > 999) {
          setEditCapacityError("Capacity must be between 1 and 999 m³/hr");
        } else if (!Number.isInteger(numValue * 10)) {
          setEditCapacityError("Capacity can have maximum one decimal place");
        } else {
          setEditCapacityError("");
          // Auto-calculate unloading time: ceil(capacity / 7)
          const calculatedUnloadingTime = Math.ceil(numValue / STANDARD_TM_CAPACITY);
          setEditedPlant((prev) => ({
            ...prev,
            capacity: numValue,
            unloading_time: calculatedUnloadingTime,
          }));
        }
        return;
      }
    }

    // Handle unloading time field with validation and auto-calculate capacity
    if (name === "unloading_time") {
      if (value !== "" && Number(value) > 999) {
        return;
      }

      if (value === "") {
        setEditUnloadingTimeError("");
        setEditedPlant((prev) => ({
          ...prev,
          unloading_time: undefined,
          capacity: undefined,
        }));
      } else {
        const numValue = Number(value);
        if (numValue < 1 || numValue > 999) {
          setEditUnloadingTimeError("Unloading time must be between 1 and 999 minutes");
        } else if (!Number.isInteger(numValue)) {
          setEditUnloadingTimeError("Unloading time must be a whole number");
        } else {
          setEditUnloadingTimeError("");
          // Auto-calculate capacity: (60 / unloading_time) * 7
          const calculatedCapacity = (60 / numValue) * STANDARD_TM_CAPACITY;
          setEditedPlant((prev) => ({
            ...prev,
            unloading_time: numValue,
            capacity: Math.round(calculatedCapacity * 10) / 10, // Round to 1 decimal place
          }));
        }
        return;
      }
    }

    // Handle name fields with validation
    if (name === "name" || name === "contact_name1" || name === "contact_name2") {
      if (value.length > 25) return;
      if (value && !(name === "name" ? validatePlantName(value) : validateName(value))) {
        if (name === "name") setEditNameError("Name must be 1-25 characters");
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
      if (value.length > 10) return;
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
      [name]: name === "capacity" || name === "unloading_time" ? (value === "" ? undefined : Number(value)) : value,
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
        {session?.sub_role !== "viewer" && (
          <nav>
            <Button className="flex items-center gap-2" size="sm" onClick={handleAddPlant}>
              <PlusIcon className="w-4 h-4" />
              Add Plant
            </Button>
          </nav>
        )}
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
              ) : filteredData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <p className="text-gray-800 dark:text-white/90 text-lg font-medium">
                    {session?.role === "company_admin"
                      ? "No plants in your company yet. Create the first plant!"
                      : session?.sub_role === "viewer"
                        ? "No plants in your company yet. Contact your company admin."
                        : "No plants in your company yet. Create the first plant!"}
                  </p>
                  {session?.sub_role !== "viewer" && (
                    <Button size="sm" onClick={handleAddPlant}>
                      <PlusIcon className="w-4 h-4 mr-2" />
                      Add Plant
                    </Button>
                  )}
                </div>
              ) : (
                <PlantsTable data={filteredData} onEdit={handleEdit} onDelete={handleDelete} isViewer={session?.sub_role === "viewer"} />
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
            <div className="w-2/4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name <span className="text-red-500">*</span></label>
              <Input
                type="text"
                name="name"
                placeholder="Enter plant name (add prefix as company code)"
                value={newPlant.name}
                onChange={handleInputChange}
                maxLength={25}
                className="placeholder:text-s"
              />
              {nameError && <span className="text-xs text-red-600 mt-1 block">{nameError}</span>}
            </div>
            <div className="w-1/4">
              <div className="flex items-center gap-1 -mt-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Capacity (m³/hr)
                </label>
                <div className="group relative">
                  <Info size={16} className="text-gray-500 dark:text-gray-400 cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-1000">
                    <div className="bg-gray-900 dark:bg-gray-800 text-white dark:text-gray-200 text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-lg">
                      <p className="font-semibold mb-1">Auto-calculated or enter manually</p>
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900 dark:border-t-gray-800"></div>
                  </div>
                </div>
              </div>
              <Input
                type="number"
                name="capacity"
                placeholder="Enter Capacity"
                value={newPlant.capacity || ""}
                onChange={handleInputChange}
                step={0.1}
                min="1"
                max="999"
                className="w-full placeholder:text-s"
              />
              {capacityError && <span className="text-xs text-red-600 mt-1 block">{capacityError}</span>}
            </div>
            <div className="w-12 h-full flex items-center justify-center text-gray-500 dark:text-gray-400 mt-8">
              or
            </div>

            <div className="w-1/4">
              <div className="flex items-center gap-1 mb-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                  Loading Time (min) <span className="text-red-500">*</span>
                </label>
                <div className="group relative">
                  <Info size={16} className="text-gray-500 dark:text-gray-400 cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-1000">
                    <div className="bg-gray-900 dark:bg-gray-800 text-white dark:text-gray-200 text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-lg">
                      <p className="font-semibold mb-1">Standard TM Capacity = 7 m³</p>
                      <p>Capacity = (60 ÷ Time) × 7</p>
                      <p>Time = ⌈ Capacity ÷ 7 ⌉</p>
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900 dark:border-t-gray-800"></div>
                  </div>
                </div>
              </div>
              <Input
                type="number"
                name="unloading_time"
                placeholder="Enter Loading time"
                value={newPlant.unloading_time || ""}
                onChange={handleInputChange}
                min="1"
                max="999"
                className="w-full placeholder:text-xs"
              />
              {unloadingTimeError && <span className="text-xs text-red-600 mt-1 block">{unloadingTimeError}</span>}
            </div>
          </div>
          <div className="flex flex-row w-full gap-2">
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Location <span className="text-red-500">*</span></label>
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Status <span className="text-red-500">*</span></label>
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Address <span className="text-red-500">*</span></label>
            <Input
              type="text"
              name="address"
              placeholder="Enter plant address (max 120 characters)"
              value={newPlant.address}
              onChange={handleInputChange}
              maxLength={120}
            />
          </div>

          <div className="flex flex-row w-full gap-2">
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ">
                Contact 1 Name <span className="text-red-500">*</span>
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
                Contact 1 Mobile Number <span className="text-red-500">*</span>
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
              <div className="w-2/4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name <span className="text-red-500">*</span></label>
                <Input
                  type="text"
                  name="name"
                  value={editedPlant.name}
                  onChange={handleEditInputChange}
                  placeholder="Enter plant name (add prefix as company code)"
                  maxLength={25}
                  className="placeholder:text-s"
                />
                {editNameError && <span className="text-xs text-red-600 mt-1 block">{editNameError}</span>}
              </div>
              <div className="w-1/4">
                <div className="flex items-center gap-1 -mt-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Capacity (m³/hr)
                  </label>
                  <div className="group relative">
                    <Info size={16} className="text-gray-500 dark:text-gray-400 cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-1000">
                      <div className="bg-gray-900 dark:bg-gray-800 text-white dark:text-gray-200 text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-lg">
                        <p className="font-semibold mb-1">Auto-calculated or enter manually</p>
                      </div>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900 dark:border-t-gray-800"></div>
                    </div>
                  </div>
                </div>
                <Input
                  type="number"
                  name="capacity"
                  value={editedPlant.capacity || ""}
                  onChange={handleEditInputChange}
                  placeholder="Enter Capacity"
                  step={0.1}
                  className="w-full placeholder:text-s"
                  min="1"
                  max="999"
                />
                {editCapacityError && <span className="text-xs text-red-600 mt-1 block">{editCapacityError}</span>}
              </div>
              <div className="w-12 h-full flex items-center justify-center text-gray-500 dark:text-gray-400 mt-8">
                or
              </div>
              <div className="w-1/4">
                <div className="flex items-center gap-1 mb-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                    Loading Time (min) <span className="text-red-500">*</span>
                  </label>
                  <div className="group relative">
                    <Info size={16} className="text-gray-500 dark:text-gray-400 cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-1000">
                      <div className="bg-gray-900 dark:bg-gray-800 text-white dark:text-gray-200 text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-lg">
                        <p className="font-semibold mb-1">Standard TM Capacity = 7 m³</p>
                        <p>Capacity = (60 ÷ Time) × 7</p>
                        <p>Time = ⌈ Capacity ÷ 7 ⌉</p>
                      </div>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900 dark:border-t-gray-800"></div>
                    </div>
                  </div>
                </div>
                <Input
                  type="number"
                  name="unloading_time"
                  placeholder="Enter Loading time"
                  value={editedPlant.unloading_time || ""}
                  onChange={handleEditInputChange}
                  className="w-full placeholder:text-xs"
                  min="1"
                  max="999"
                />
                {editUnloadingTimeError && <span className="text-xs text-red-600 mt-1 block">{editUnloadingTimeError}</span>}
              </div>
            </div>
            <div className="flex flex-row w-full gap-2">
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Location <span className="text-red-500">*</span></label>
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Status <span className="text-red-500">*</span></label>
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Address <span className="text-red-500">*</span></label>
              <Input
                type="text"
                name="address"
                value={editedPlant.address}
                onChange={handleEditInputChange}
                placeholder="Enter plant address (max 120 characters)"
                maxLength={120}
              />
            </div>

            <div className="flex flex-row w-full gap-2">
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ">
                  Contact 1 Name <span className="text-red-500">*</span>
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
                  Contact 1 Mobile Number <span className="text-red-500">*</span>
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
