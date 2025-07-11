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

interface Plant {
  _id: string;
  name: string;
  address: string;
  location: string;
  contact_number: string;
  created_at: string;
}

interface CreatePlantData {
  name: string;
  address: string;
  location: string;
  contact_number: string;
}

export default function PlantsContainer() {
  const { fetchWithAuth } = useApiClient();
  const { status } = useSession();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isLocationFilterOpen, setIsLocationFilterOpen] = useState(false);
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [editedPlant, setEditedPlant] = useState<CreatePlantData>({
    name: "",
    address: "",
    location: "",
    contact_number: "",
  });
  const [newPlant, setNewPlant] = useState<CreatePlantData>({
    name: "",
    address: "",
    location: "",
    contact_number: "",
  });

  const { data: plantsData, isLoading: isLoadingPlants } = useQuery({
    queryKey: ['plants'],
    queryFn: async () => {
      const response = await fetchWithAuth('/plants');
      if (!response) throw new Error('No response from server');
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to fetch plants');
      return data.data as Plant[];
    },
    enabled: status === "authenticated",
  });

  // Create plant mutation
  const createPlantMutation = useMutation({
    mutationFn: async (plantData: CreatePlantData) => {
      const response = await fetchWithAuth('/plants', {
        method: 'POST',
        body: JSON.stringify(plantData),
      });
      if (!response) throw new Error('No response from server');
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to create plant');
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plants'] });
      setIsCreateModalOpen(false);
      setNewPlant({
        name: "",
        address: "",
        location: "",
        contact_number: "",
      });
    },
  });

  // Edit plant mutation
  const editPlantMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CreatePlantData }) => {
      const response = await fetchWithAuth(`/plants/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      if (!response) throw new Error('No response from server');
      const responseData = await response.json();
      if (!responseData.success) throw new Error(responseData.message || 'Failed to update plant');
      return responseData.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plants'] });
      setIsEditModalOpen(false);
      setSelectedPlant(null);
    },
  });

  // Delete plant mutation
  const deletePlantMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetchWithAuth(`/plants/${id}`, {
        method: 'DELETE',
      });
      if (!response) throw new Error('No response from server');
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to delete plant');
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plants'] });
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
      console.error('Error creating plant:', error);
    }
  };

  const handleEdit = (plant: Plant) => {
    setSelectedPlant(plant);
    setEditedPlant({
      name: plant.name,
      address: plant.address,
      location: plant.location,
      contact_number: plant.contact_number,
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
      console.error('Error updating plant:', error);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedPlant) return;
    try {
      await deletePlantMutation.mutateAsync(selectedPlant._id);
    } catch (error) {
      console.error('Error deleting plant:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewPlant((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedPlant((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Get unique locations from plants data
  const locations = useMemo(() => {
    if (!plantsData) return [];
    const uniqueLocations = Array.from(new Set(plantsData.map(plant => plant.location)));
    return uniqueLocations.sort();
  }, [plantsData]);

  // Date range options
  const dateRanges = useMemo(() => {
    // const now = new Date();
    return [
      { label: "Last 7 days", days: 7 },
      { label: "Last 30 days", days: 30 },
      { label: "Last 90 days", days: 90 },
      { label: "All time", days: Infinity }
    ];
  }, []);

  // Filter plants based on search, location, and date
  const filteredData = useMemo(() => {
    if (!plantsData) return [];

    return plantsData.filter((plant) => {
      // Search filter
      const matchesSearch =
        plant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plant.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plant.location.toLowerCase().includes(searchQuery.toLowerCase());

      // Location filter
      const matchesLocation = !selectedLocation || plant.location === selectedLocation;

      // Date filter
      const plantDate = new Date(plant.created_at);
      const now = new Date();
      let matchesDate = true;

      if (selectedDate) {
        const selectedRange = dateRanges.find(range => range.label === selectedDate);
        if (selectedRange) {
          if (selectedRange.days !== Infinity) {
            const cutoffDate = new Date(now.getTime() - selectedRange.days * 24 * 60 * 60 * 1000);
            matchesDate = plantDate >= cutoffDate;
          }
        }
      }

      return matchesSearch && matchesLocation && matchesDate;
    });
  }, [plantsData, searchQuery, selectedLocation, selectedDate, dateRanges]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Plants</h2>
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
                <PlantsTable 
                  data={filteredData} 
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} className="max-w-[600px] p-5 lg:p-10">
        <h4 className="font-semibold text-gray-800 mb-7 text-title-sm dark:text-white/90">Add New Plant</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name</label>
            <Input
              type="text"
              name="name"
              placeholder="Enter plant name"
              value={newPlant.name}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Address</label>
            <Input
              type="text"
              name="address"
              placeholder="Enter plant address"
              value={newPlant.address}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Location</label>
            <Input
              type="text"
              name="location"
              placeholder="Enter plant location"
              value={newPlant.location}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Contact</label>
            <Input
              type="text"
              name="contact_number"
              placeholder="Enter contact number"
              value={newPlant.contact_number}
              onChange={handleInputChange}
            />
          </div>
        </div>
        <div className="flex items-center justify-end w-full gap-3 mt-8">
          <Button size="sm" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
            Cancel
          </Button>
          <Button 
            size="sm" 
            onClick={handleCreatePlant}
            disabled={createPlantMutation.isPending}
          >
            {createPlantMutation.isPending ? (
              <div className="flex items-center gap-2">
                <Spinner size="sm" />
                <span>Creating...</span>
              </div>
            ) : 'Create Plant'}
          </Button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} className="max-w-[600px] p-5 lg:p-10">
        <h4 className="font-semibold text-gray-800 mb-7 text-title-sm dark:text-white/90">Edit Plant</h4>
        {selectedPlant && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name</label>
              <Input
                type="text"
                name="name"
                value={editedPlant.name}
                onChange={handleEditInputChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Address</label>
              <Input
                type="text"
                name="address"
                value={editedPlant.address}
                onChange={handleEditInputChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Location</label>
              <Input
                type="text"
                name="location"
                value={editedPlant.location}
                onChange={handleEditInputChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Contact</label>
              <Input
                type="text"
                name="contact_number"
                value={editedPlant.contact_number}
                onChange={handleEditInputChange}
              />
            </div>
          </div>
        )}
        <div className="flex items-center justify-end w-full gap-3 mt-8">
          <Button size="sm" variant="outline" onClick={() => setIsEditModalOpen(false)}>
            Cancel
          </Button>
          <Button 
            size="sm" 
            onClick={handleSaveEdit}
            disabled={editPlantMutation.isPending}
          >
            {editPlantMutation.isPending ? (
              <div className="flex items-center gap-2">
                <Spinner size="sm" />
                <span>Saving...</span>
              </div>
            ) : 'Save Changes'}
          </Button>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} className="max-w-[500px] p-5 lg:p-10">
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
                ) : 'Delete'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
