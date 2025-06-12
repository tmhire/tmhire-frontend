"use client";

import TransitMixersTable from "./TransitMixersTable";
import { PlusIcon, Search } from "lucide-react";
import Button from "@/components/ui/button/Button";
import { useState } from "react";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { Modal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";

interface TransitMixer {
  id: string;
  vehicleNo: string;
  capacity: string;
  plant: string;
  driverName: string;
  driverNo: string;
  created: string;
}

// Define the table data
const tableData: TransitMixer[] = [
  {
    id: "TM001",
    vehicleNo: "ABC123",
    capacity: "10m³",
    plant: "Main Plant",
    driverName: "John Doe",
    driverNo: "DRV001",
    created: "2024-03-20",
  },
];

export default function TransitMixersContainer() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isPlantFilterOpen, setIsPlantFilterOpen] = useState(false);
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedMixer, setSelectedMixer] = useState<TransitMixer | null>(null);
  const [newMixer, setNewMixer] = useState<Partial<TransitMixer>>({
    id: "",
    vehicleNo: "",
    capacity: "",
    plant: "",
    driverName: "",
    driverNo: "",
  });

  const handleAddMixer = () => {
    setIsCreateModalOpen(true);
  };

  const handleCreateMixer = () => {
    // Handle create logic here
    console.log("Creating new mixer:", newMixer);
    setIsCreateModalOpen(false);
    setNewMixer({
      id: "",
      vehicleNo: "",
      capacity: "",
      plant: "",
      driverName: "",
      driverNo: "",
    });
  };

  const handleEdit = (mixer: TransitMixer) => {
    setSelectedMixer(mixer);
    setIsEditModalOpen(true);
  };

  const handleDelete = (mixer: TransitMixer) => {
    setSelectedMixer(mixer);
    setIsDeleteModalOpen(true);
  };

  const handleSaveEdit = () => {
    // Handle save logic here
    console.log("Saving changes for mixer:", selectedMixer);
    setIsEditModalOpen(false);
  };

  const handleConfirmDelete = () => {
    // Handle delete logic here
    console.log("Deleting mixer:", selectedMixer);
    setIsDeleteModalOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewMixer((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const plants = ["Main Plant", "North Plant", "South Plant", "East Plant"];
  const dateRanges = ["Last 7 days", "Last 30 days", "Last 90 days", "All time"];

  const filteredData = tableData.filter((mixer) => {
    const matchesSearch =
      mixer.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mixer.vehicleNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mixer.driverName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlant = !selectedPlant || mixer.plant === selectedPlant;
    return matchesSearch && matchesPlant;
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Transit Mixers</h2>
        <nav>
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
                  className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-14 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 xl:w-[430px]"
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
                  Plant: {selectedPlant || "All"}
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
                        key={plant}
                        className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        onClick={() => {
                          setSelectedPlant(plant);
                          setIsPlantFilterOpen(false);
                        }}
                      >
                        {plant}
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
              <TransitMixersTable 
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
        <h4 className="font-semibold text-gray-800 mb-7 text-title-sm dark:text-white/90">Add New Transit Mixer</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">ID</label>
            <Input
              type="text"
              name="id"
              placeholder="Enter serial number"
              value={newMixer.id}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Vehicle No.</label>
            <Input
              type="text"
              name="vehicleNo"
              placeholder="Enter vehicle number"
              value={newMixer.vehicleNo}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Capacity</label>
            <Input
              type="text"
              name="capacity"
              placeholder="Enter capacity"
              value={newMixer.capacity}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Plant</label>
            <Input
              type="text"
              name="plant"
              placeholder="Enter plant"
              value={newMixer.plant}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Driver Name</label>
            <Input
              type="text"
              name="driverName"
              placeholder="Enter driver name"
              value={newMixer.driverName}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Driver No.</label>
            <Input
              type="text"
              name="driverNo"
              placeholder="Enter driver number"
              value={newMixer.driverNo}
              onChange={handleInputChange}
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateMixer}>Create</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} className="max-w-[600px] p-5 lg:p-10">
        <h4 className="font-semibold text-gray-800 mb-7 text-title-sm dark:text-white/90">Edit Transit Mixer</h4>
        {selectedMixer && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Serial No.</label>
              <Input
                type="text"
                name="id"
                value={selectedMixer.id}
                onChange={(e) => setSelectedMixer({ ...selectedMixer, id: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Vehicle No.</label>
              <Input
                type="text"
                name="vehicleNo"
                value={selectedMixer.vehicleNo}
                onChange={(e) => setSelectedMixer({ ...selectedMixer, vehicleNo: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Capacity</label>
              <Input
                type="text"
                name="capacity"
                value={selectedMixer.capacity}
                onChange={(e) => setSelectedMixer({ ...selectedMixer, capacity: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Plant</label>
              <Input
                type="text"
                name="plant"
                value={selectedMixer.plant}
                onChange={(e) => setSelectedMixer({ ...selectedMixer, plant: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Driver Name</label>
              <Input
                type="text"
                name="driverName"
                value={selectedMixer.driverName}
                onChange={(e) => setSelectedMixer({ ...selectedMixer, driverName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Driver No.</label>
              <Input
                type="text"
                name="driverNo"
                value={selectedMixer.driverNo}
                onChange={(e) => setSelectedMixer({ ...selectedMixer, driverNo: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} className="max-w-[400px] p-5 lg:p-10">
        <h4 className="font-semibold text-gray-800 mb-7 text-title-sm dark:text-white/90">Delete Transit Mixer</h4>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Are you sure you want to delete this transit mixer? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="warning" onClick={handleConfirmDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
} 