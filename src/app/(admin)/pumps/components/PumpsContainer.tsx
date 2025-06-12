"use client";

import PumpsTable from "./PumpsTable";
import { PlusIcon, Search } from "lucide-react";
import Button from "@/components/ui/button/Button";
import { useState } from "react";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { Modal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";

interface Pump {
  id: string;
  vehicleNo: string;
  capacity: string;
  plant: string;
  driverName: string;
  driverNo: string;
  created: string;
}

// Define the table data
const tableData: Pump[] = [
  {
    id: "P001",
    vehicleNo: "XYZ789",
    capacity: "15m³",
    plant: "Main Plant",
    driverName: "Jane Smith",
    driverNo: "DRV002",
    created: "2024-03-20",
  },
];

export default function PumpsContainer() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isPlantFilterOpen, setIsPlantFilterOpen] = useState(false);
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPump, setSelectedPump] = useState<Pump | null>(null);
  const [newPump, setNewPump] = useState<Partial<Pump>>({
    id: "",
    vehicleNo: "",
    capacity: "",
    plant: "",
    driverName: "",
    driverNo: "",
  });

  const handleAddPump = () => {
    setIsCreateModalOpen(true);
  };

  const handleCreatePump = () => {
    // Handle create logic here
    console.log("Creating new pump:", newPump);
    setIsCreateModalOpen(false);
    setNewPump({
      id: "",
      vehicleNo: "",
      capacity: "",
      plant: "",
      driverName: "",
      driverNo: "",
    });
  };

  const handleEdit = (pump: Pump) => {
    setSelectedPump(pump);
    setIsEditModalOpen(true);
  };

  const handleDelete = (pump: Pump) => {
    setSelectedPump(pump);
    setIsDeleteModalOpen(true);
  };

  const handleSaveEdit = () => {
    // Handle save logic here
    console.log("Saving changes for pump:", selectedPump);
    setIsEditModalOpen(false);
  };

  const handleConfirmDelete = () => {
    // Handle delete logic here
    console.log("Deleting pump:", selectedPump);
    setIsDeleteModalOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewPump((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const plants = ["Main Plant", "North Plant", "South Plant", "East Plant"];
  const dateRanges = ["Last 7 days", "Last 30 days", "Last 90 days", "All time"];

  const filteredData = tableData.filter((pump) => {
    const matchesSearch =
      pump.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pump.vehicleNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pump.driverName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlant = !selectedPlant || pump.plant === selectedPlant;
    return matchesSearch && matchesPlant;
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Pumps</h2>
        <nav>
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
              <PumpsTable 
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
        <h4 className="font-semibold text-gray-800 mb-7 text-title-sm dark:text-white/90">Add New Pump</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">ID</label>
            <Input
              type="text"
              name="id"
              placeholder="Enter ID"
              value={newPump.id}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Vehicle No.</label>
            <Input
              type="text"
              name="vehicleNo"
              placeholder="Enter vehicle number"
              value={newPump.vehicleNo}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Capacity</label>
            <Input
              type="text"
              name="capacity"
              placeholder="Enter capacity"
              value={newPump.capacity}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Plant</label>
            <Input
              type="text"
              name="plant"
              placeholder="Enter plant"
              value={newPump.plant}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Driver Name</label>
            <Input
              type="text"
              name="driverName"
              placeholder="Enter driver name"
              value={newPump.driverName}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Driver No.</label>
            <Input
              type="text"
              name="driverNo"
              placeholder="Enter driver number"
              value={newPump.driverNo}
              onChange={handleInputChange}
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePump}>Create</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} className="max-w-[600px] p-5 lg:p-10">
        <h4 className="font-semibold text-gray-800 mb-7 text-title-sm dark:text-white/90">Edit Pump</h4>
        {selectedPump && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">ID</label>
              <Input
                type="text"
                name="id"
                value={selectedPump.id}
                onChange={(e) => setSelectedPump({ ...selectedPump, id: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Vehicle No.</label>
              <Input
                type="text"
                name="vehicleNo"
                value={selectedPump.vehicleNo}
                onChange={(e) => setSelectedPump({ ...selectedPump, vehicleNo: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Capacity</label>
              <Input
                type="text"
                name="capacity"
                value={selectedPump.capacity}
                onChange={(e) => setSelectedPump({ ...selectedPump, capacity: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Plant</label>
              <Input
                type="text"
                name="plant"
                value={selectedPump.plant}
                onChange={(e) => setSelectedPump({ ...selectedPump, plant: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Driver Name</label>
              <Input
                type="text"
                name="driverName"
                value={selectedPump.driverName}
                onChange={(e) => setSelectedPump({ ...selectedPump, driverName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Driver No.</label>
              <Input
                type="text"
                name="driverNo"
                value={selectedPump.driverNo}
                onChange={(e) => setSelectedPump({ ...selectedPump, driverNo: e.target.value })}
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
        <h4 className="font-semibold text-gray-800 mb-7 text-title-sm dark:text-white/90">Delete Pump</h4>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Are you sure you want to delete this pump? This action cannot be undone.
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