"use client";

import PlantsTable from "./PlantsTable";
import { PlusIcon, Search } from "lucide-react";
import Button from "@/components/ui/button/Button";
import { useState } from "react";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { Modal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";

interface Plant {
  id: string;
  name: string;
  address: string;
  location: string;
  contact: string;
  created: string;
}

// Define the table data
const tableData: Plant[] = [
  {
    id: "1",
    name: "Main Plant",
    address: "123 Industrial Ave",
    location: "New York",
    created: "2024-03-20",
    contact: "999999999",
  },
];

export default function PlantsContainer() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isLocationFilterOpen, setIsLocationFilterOpen] = useState(false);
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [newPlant, setNewPlant] = useState<Partial<Plant>>({
    name: "",
    address: "",
    location: "",
    contact: "",
  });

  const handleAddPlant = () => {
    setIsCreateModalOpen(true);
  };

  const handleCreatePlant = () => {
    // Handle create logic here
    console.log("Creating new plant:", newPlant);
    setIsCreateModalOpen(false);
    setNewPlant({
      name: "",
      address: "",
      location: "",
      contact: "",
    });
  };

  const handleEdit = (plant: Plant) => {
    setSelectedPlant(plant);
    setIsEditModalOpen(true);
  };

  const handleDelete = (plant: Plant) => {
    setSelectedPlant(plant);
    setIsDeleteModalOpen(true);
  };

  const handleSaveEdit = () => {
    // Handle save logic here
    console.log("Saving changes for plant:", selectedPlant);
    setIsEditModalOpen(false);
  };

  const handleConfirmDelete = () => {
    // Handle delete logic here
    console.log("Deleting plant:", selectedPlant);
    setIsDeleteModalOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewPlant((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const locations = ["New York", "Los Angeles", "Chicago", "Houston"];
  const dateRanges = ["Last 7 days", "Last 30 days", "Last 90 days", "All time"];

  const filteredData = tableData.filter((plant) => {
    const matchesSearch =
      plant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plant.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plant.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = !selectedLocation || plant.location === selectedLocation;
    return matchesSearch && matchesLocation;
  });

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
            </div>
          </div>

          {/* Card Body */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 sm:p-6">
            <div className="space-y-6">
              <PlantsTable 
                data={filteredData} 
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
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
              name="contact"
              placeholder="Enter contact number"
              value={newPlant.contact}
              onChange={handleInputChange}
            />
          </div>
        </div>
        <div className="flex items-center justify-end w-full gap-3 mt-8">
          <Button size="sm" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleCreatePlant}>
            Create Plant
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
                defaultValue={selectedPlant.name}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Address</label>
              <Input
                type="text"
                name="address"
                defaultValue={selectedPlant.address}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Location</label>
              <Input
                type="text"
                name="location"
                defaultValue={selectedPlant.location}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Contact</label>
              <Input
                type="text"
                name="contact"
                defaultValue={selectedPlant.contact}
              />
            </div>
          </div>
        )}
        <div className="flex items-center justify-end w-full gap-3 mt-8">
          <Button size="sm" variant="outline" onClick={() => setIsEditModalOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSaveEdit}>
            Save Changes
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
              <Button size="sm" variant="warning" onClick={handleConfirmDelete}>
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
