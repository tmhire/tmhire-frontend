"use client";

import SchedulesTable from "./SchedulesTable";
import { PlusIcon, Search } from "lucide-react";
import Button from "@/components/ui/button/Button";
import { useState } from "react";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { Modal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";

interface Schedule {
  id: string;
  clientName: string;
  capacity: string;
  plantsUsed: string[];
  tmsUsed: number;
  created: string;
}

// Define the table data
const tableData: Schedule[] = [
  {
    id: "SCH001",
    clientName: "ABC Construction",
    capacity: "50m³",
    plantsUsed: ["Main Plant", "North Plant"],
    tmsUsed: 3,
    created: "2024-03-20",
  },
];

export default function SchedulesContainer() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isPlantFilterOpen, setIsPlantFilterOpen] = useState(false);
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [newSchedule, setNewSchedule] = useState<Partial<Schedule>>({
    id: "",
    clientName: "",
    capacity: "",
    plantsUsed: [],
    tmsUsed: 0,
  });

  const handleAddSchedule = () => {
    setIsCreateModalOpen(true);
  };

  const handleCreateSchedule = () => {
    // Handle create logic here
    console.log("Creating new schedule:", newSchedule);
    setIsCreateModalOpen(false);
    setNewSchedule({
      id: "",
      clientName: "",
      capacity: "",
      plantsUsed: [],
      tmsUsed: 0,
    });
  };

  const handleEdit = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setIsEditModalOpen(true);
  };

  const handleDelete = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setIsDeleteModalOpen(true);
  };

  const handleSaveEdit = () => {
    // Handle save logic here
    console.log("Saving changes for schedule:", selectedSchedule);
    setIsEditModalOpen(false);
  };

  const handleConfirmDelete = () => {
    // Handle delete logic here
    console.log("Deleting schedule:", selectedSchedule);
    setIsDeleteModalOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewSchedule((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const plants = ["Main Plant", "North Plant", "South Plant", "East Plant"];
  const dateRanges = ["Last 7 days", "Last 30 days", "Last 90 days", "All time"];

  const filteredData = tableData.filter((schedule) => {
    const matchesSearch =
      schedule.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      schedule.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlant = !selectedPlant || schedule.plantsUsed.includes(selectedPlant);
    return matchesSearch && matchesPlant;
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Schedules</h2>
        <nav>
          <Button className="flex items-center gap-2" size="sm" onClick={handleAddSchedule}>
            <PlusIcon className="w-4 h-4" />
            Add Schedule
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
              <SchedulesTable 
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
        <h4 className="font-semibold text-gray-800 mb-7 text-title-sm dark:text-white/90">Add New Schedule</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">ID</label>
            <Input
              type="text"
              name="id"
              placeholder="Enter ID"
              value={newSchedule.id}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Client Name</label>
            <Input
              type="text"
              name="clientName"
              placeholder="Enter client name"
              value={newSchedule.clientName}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Capacity</label>
            <Input
              type="text"
              name="capacity"
              placeholder="Enter capacity"
              value={newSchedule.capacity}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Plants Used</label>
            <Input
              type="text"
              name="plantsUsed"
              placeholder="Enter plants (comma-separated)"
              value={newSchedule.plantsUsed?.join(", ")}
              onChange={(e) => setNewSchedule({ ...newSchedule, plantsUsed: e.target.value.split(",").map(p => p.trim()) })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">TMs Used</label>
            <Input
              type="number"
              name="tmsUsed"
              placeholder="Enter number of TMs"
              value={newSchedule.tmsUsed}
              onChange={(e) => setNewSchedule({ ...newSchedule, tmsUsed: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSchedule}>Create</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} className="max-w-[600px] p-5 lg:p-10">
        <h4 className="font-semibold text-gray-800 mb-7 text-title-sm dark:text-white/90">Edit Schedule</h4>
        {selectedSchedule && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">ID</label>
              <Input
                type="text"
                name="id"
                value={selectedSchedule.id}
                onChange={(e) => setSelectedSchedule({ ...selectedSchedule, id: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Client Name</label>
              <Input
                type="text"
                name="clientName"
                value={selectedSchedule.clientName}
                onChange={(e) => setSelectedSchedule({ ...selectedSchedule, clientName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Capacity</label>
              <Input
                type="text"
                name="capacity"
                value={selectedSchedule.capacity}
                onChange={(e) => setSelectedSchedule({ ...selectedSchedule, capacity: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Plants Used</label>
              <Input
                type="text"
                name="plantsUsed"
                value={selectedSchedule.plantsUsed.join(", ")}
                onChange={(e) => setSelectedSchedule({ ...selectedSchedule, plantsUsed: e.target.value.split(",").map(p => p.trim()) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">TMs Used</label>
              <Input
                type="number"
                name="tmsUsed"
                value={selectedSchedule.tmsUsed}
                onChange={(e) => setSelectedSchedule({ ...selectedSchedule, tmsUsed: parseInt(e.target.value) || 0 })}
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
        <h4 className="font-semibold text-gray-800 mb-7 text-title-sm dark:text-white/90">Delete Schedule</h4>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Are you sure you want to delete this schedule? This action cannot be undone.
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