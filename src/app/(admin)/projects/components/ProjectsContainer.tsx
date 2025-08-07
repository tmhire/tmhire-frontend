"use client";

import ProjectsTable from "./ProjectsTable";
import { PlusIcon, Search } from "lucide-react";
import Button from "@/components/ui/button/Button";
import { useState, useMemo } from "react";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import { Modal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";
import { useApiClient } from "@/hooks/useApiClient";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/spinner";
import { ChevronDownIcon } from "lucide-react";

interface Project {
  _id: string;
  user_id: string;
  name: string;
  address: string;
  client_id: string;
  contact_name: string;
  contact_number: string;
  coordinates: string;
  remarks: string;
  created_at: string;
  last_updated: string;
}

interface Client {
  _id: string;
  user_id: string;
  name: string;
  legal_entity: string | null;
  created_at: string;
  last_updated: string;
}

interface CreateProjectData {
  name: string;
  address: string;
  client_id: string;
  contact_name: string;
  contact_number: string;
  coordinates: string;
  remarks: string;
}

export default function ProjectsContainer() {
  const { fetchWithAuth } = useApiClient();
  const { status } = useSession();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isClientFilterOpen, setIsClientFilterOpen] = useState(false);
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editedProject, setEditedProject] = useState<CreateProjectData>({
    name: "",
    address: "",
    client_id: "",
    contact_name: "",
    contact_number: "",
    coordinates: "",
    remarks: "",
  });
  const [newProject, setNewProject] = useState<CreateProjectData>({
    name: "",
    address: "",
    client_id: "",
    contact_name: "",
    contact_number: "",
    coordinates: "",
    remarks: "",
  });
  const [contactNumberError, setContactNumberError] = useState("");
  const [editContactNumberError, setEditContactNumberError] = useState("");

  const validateMobileNumber = (number: string): boolean => {
    // Remove all non-digits
    const digitsOnly = number.replace(/\D/g, "");
    // Check if it's a valid Indian mobile number (10 digits starting with 6-9)
    return /^[6-9]\d{9}$/.test(digitsOnly);
  };

  // Dropdown states for client selection
  const [isCreateClientDropdownOpen, setIsCreateClientDropdownOpen] = useState(false);
  const [isEditClientDropdownOpen, setIsEditClientDropdownOpen] = useState(false);

  const { data: projectsData, isLoading: isLoadingProjects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await fetchWithAuth("/projects");
      if (!response) throw new Error("No response from server");
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Failed to fetch projects");
      return data.data as Project[];
    },
    enabled: status === "authenticated",
  });

  const { data: clientsData } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const response = await fetchWithAuth("/clients");
      if (!response) throw new Error("No response from server");
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Failed to fetch clients");
      return data.data;
    },
    enabled: status === "authenticated",
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (projectData: CreateProjectData) => {
      const response = await fetchWithAuth("/projects", {
        method: "POST",
        body: JSON.stringify(projectData),
      });
      if (!response) throw new Error("No response from server");
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Failed to create project");
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setIsCreateModalOpen(false);
      setNewProject({
        name: "",
        address: "",
        client_id: "",
        contact_name: "",
        contact_number: "",
        coordinates: "",
        remarks: "",
      });
      setContactNumberError("");
    },
  });

  // Edit project mutation
  const editProjectMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CreateProjectData }) => {
      const response = await fetchWithAuth(`/projects/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (!response) throw new Error("No response from server");
      const responseData = await response.json();
      if (!responseData.success) throw new Error(responseData.message || "Failed to update project");
      return responseData.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setIsEditModalOpen(false);
      setSelectedProject(null);
      setEditContactNumberError("");
    },
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetchWithAuth(`/projects/${id}`, {
        method: "DELETE",
      });
      if (!response) throw new Error("No response from server");
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Failed to delete project");
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setIsDeleteModalOpen(false);
      setSelectedProject(null);
    },
  });

  const handleAddProject = () => {
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setContactNumberError("");
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditContactNumberError("");
  };

  const handleCreateProject = async () => {
    try {
      await createProjectMutation.mutateAsync(newProject);
    } catch (error) {
      console.error("Error creating project:", error);
    }
  };

  const handleEdit = (project: Project) => {
    setSelectedProject(project);
    setEditedProject({
      name: project.name,
      address: project.address,
      client_id: project.client_id,
      contact_name: project.contact_name,
      contact_number: project.contact_number,
      coordinates: project.coordinates,
      remarks: project.remarks,
    });
    setIsEditModalOpen(true);
  };

  const handleDelete = (project: Project) => {
    setSelectedProject(project);
    setIsDeleteModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedProject) return;
    try {
      await editProjectMutation.mutateAsync({
        id: selectedProject._id,
        data: editedProject,
      });
    } catch (error) {
      console.error("Error updating project:", error);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedProject) return;
    try {
      await deleteProjectMutation.mutateAsync(selectedProject._id);
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewProject((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Validate contact number if it's being changed
    if (name === "contact_number") {
      if (value && !validateMobileNumber(value)) {
        setContactNumberError("Please enter a valid 10-digit mobile number starting with 6-9");
      } else {
        setContactNumberError("");
      }
    }
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditedProject((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Validate contact number if it's being changed in edit modal
    if (name === "contact_number") {
      if (value && !validateMobileNumber(value)) {
        setEditContactNumberError("Please enter a valid 10-digit mobile number starting with 6-9");
      } else {
        setEditContactNumberError("");
      }
    }
  };

  // Client dropdown handlers
  const handleCreateClientSelect = (clientId: string) => {
    setNewProject((prev) => ({
      ...prev,
      client_id: clientId,
    }));
    setIsCreateClientDropdownOpen(false);
  };

  const handleEditClientSelect = (clientId: string) => {
    setEditedProject((prev) => ({
      ...prev,
      client_id: clientId,
    }));
    setIsEditClientDropdownOpen(false);
  };

  // Date range options
  const dateRanges = useMemo(() => {
    return [
      { label: "Last 7 days", days: 7 },
      { label: "Last 30 days", days: 30 },
      { label: "Last 90 days", days: 90 },
      { label: "All time", days: Infinity },
    ];
  }, []);

  // Filter projects based on search, client, and date
  const filteredData = useMemo(() => {
    if (!projectsData) return [];

    return projectsData.filter((project) => {
      // Search filter
      const matchesSearch =
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.contact_name.toLowerCase().includes(searchQuery.toLowerCase());

      // Client filter
      const matchesClient = !selectedClient || project.client_id === selectedClient;

      // Date filter
      const projectDate = new Date(project.created_at);
      const now = new Date();
      let matchesDate = true;

      if (selectedDate) {
        const selectedRange = dateRanges.find((range) => range.label === selectedDate);
        if (selectedRange) {
          if (selectedRange.days !== Infinity) {
            const cutoffDate = new Date(now.getTime() - selectedRange.days * 24 * 60 * 60 * 1000);
            matchesDate = projectDate >= cutoffDate;
          }
        }
      }

      return matchesSearch && matchesClient && matchesDate;
    });
  }, [projectsData, searchQuery, selectedClient, selectedDate, dateRanges]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Projects</h2>
        <nav>
          <Button className="flex items-center gap-2" size="sm" onClick={handleAddProject}>
            <PlusIcon className="w-4 h-4" />
            Add Project
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

              {/* Client Filter */}
              <div className="relative text-sm">
                <Button
                  variant="outline"
                  onClick={() => setIsClientFilterOpen(!isClientFilterOpen)}
                  className="dropdown-toggle"
                  size="sm"
                >
                  Client:{" "}
                  {selectedClient
                    ? clientsData?.find((c: Client) => c._id === selectedClient)?.name || "Unknown"
                    : "All"}
                </Button>
                <Dropdown isOpen={isClientFilterOpen} onClose={() => setIsClientFilterOpen(false)} className="w-48">
                  <div className="p-2 text-gray-800 dark:text-white/90 ">
                    <button
                      className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      onClick={() => {
                        setSelectedClient("");
                        setIsClientFilterOpen(false);
                      }}
                    >
                      All
                    </button>
                    {clientsData?.map((client: Client) => (
                      <button
                        key={client._id}
                        className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        onClick={() => {
                          setSelectedClient(client._id);
                          setIsClientFilterOpen(false);
                        }}
                      >
                        {client.name}
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
                <div className="text-center py-4 text-gray-800 dark:text-white/90">
                  Please sign in again to view projects
                </div>
              ) : isLoadingProjects ? (
                <div className="flex justify-center py-4">
                  <Spinner text="Loading projects..." />
                </div>
              ) : (
                <ProjectsTable
                  data={filteredData}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  clients={clientsData || []}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        className="max-w-[800px] p-5 lg:p-10"
      >
        <h4 className="font-semibold text-gray-800 mb-7 text-title-sm dark:text-white/90">Add New Project</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Client</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsCreateClientDropdownOpen(!isCreateClientDropdownOpen)}
                className="dropdown-toggle w-full h-11 rounded-lg border border-gray-200 bg-transparent py-2.5 px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 flex items-center justify-between"
              >
                <span
                  className={
                    newProject.client_id ? "text-gray-800 dark:text-white/90" : "text-gray-400 dark:text-white/30"
                  }
                >
                  {newProject.client_id
                    ? clientsData?.find((client: { _id: string }) => client._id === newProject.client_id)?.name ||
                      "Select a client"
                    : "Select a client"}
                </span>
                <ChevronDownIcon className="w-4 h-4 text-gray-400" />
              </button>

              <Dropdown
                isOpen={isCreateClientDropdownOpen}
                onClose={() => setIsCreateClientDropdownOpen(false)}
                className="w-full min-w-[300px] max-h-60 overflow-y-auto"
              >
                {clientsData?.map((client: Client) => (
                  <DropdownItem
                    key={client._id}
                    onClick={() => handleCreateClientSelect(client._id)}
                    className="text-sm py-2 px-4 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    {client.name}
                  </DropdownItem>
                ))}
              </Dropdown>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name</label>
            <Input
              type="text"
              name="name"
              placeholder="Enter project name"
              value={newProject.name}
              onChange={handleInputChange}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Address</label>
            <Input
              type="text"
              name="address"
              placeholder="Enter project address"
              value={newProject.address}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Contact Name</label>
            <Input
              type="text"
              name="contact_name"
              placeholder="Enter contact name"
              value={newProject.contact_name}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Contact Number</label>
            <Input
              type="tel"
              name="contact_number"
              placeholder="Enter contact number"
              value={newProject.contact_number}
              onChange={handleInputChange}
            />
            {contactNumberError && <p className="text-red-500 text-xs mt-1">{contactNumberError}</p>}
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Coordinates</label>
            <Input
              type="text"
              name="coordinates"
              placeholder="Enter Google Maps coordinates URL"
              value={newProject.coordinates}
              onChange={handleInputChange}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Remarks</label>
            <Input
              type="text"
              name="remarks"
              placeholder="Enter any additional remarks"
              value={newProject.remarks}
              onChange={handleInputChange}
            />
          </div>
        </div>
        <div className="flex items-center justify-end w-full gap-3 mt-8">
          <Button size="sm" variant="outline" onClick={handleCloseCreateModal}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleCreateProject} disabled={createProjectMutation.isPending}>
            {createProjectMutation.isPending ? (
              <div className="flex items-center gap-2">
                <Spinner size="sm" />
                <span>Creating...</span>
              </div>
            ) : (
              "Create Project"
            )}
          </Button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={handleCloseEditModal} className="max-w-[800px] p-5 lg:p-10">
        <h4 className="font-semibold text-gray-800 mb-7 text-title-sm dark:text-white/90">Edit Project</h4>
        {selectedProject && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Client</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsEditClientDropdownOpen(!isEditClientDropdownOpen)}
                  className="dropdown-toggle w-full h-11 rounded-lg border border-gray-200 bg-transparent py-2.5 px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 flex items-center justify-between"
                >
                  <span
                    className={
                      editedProject.client_id ? "text-gray-800 dark:text-white/90" : "text-gray-400 dark:text-white/30"
                    }
                  >
                    {editedProject.client_id
                      ? clientsData?.find((client: Client) => client._id === editedProject.client_id)?.name ||
                        "Select a client"
                      : "Select a client"}
                  </span>
                  <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                </button>

                <Dropdown
                  isOpen={isEditClientDropdownOpen}
                  onClose={() => setIsEditClientDropdownOpen(false)}
                  className="w-full min-w-[300px] max-h-60 overflow-y-auto"
                >
                  {clientsData?.map((client: Client) => (
                    <DropdownItem
                      key={client._id}
                      onClick={() => handleEditClientSelect(client._id)}
                      className="text-sm py-2 px-4 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      {client.name}
                    </DropdownItem>
                  ))}
                </Dropdown>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name</label>
              <Input type="text" name="name" value={editedProject.name} onChange={handleEditInputChange} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Address</label>
              <Input type="text" name="address" value={editedProject.address} onChange={handleEditInputChange} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Contact Name</label>
              <Input
                type="text"
                name="contact_name"
                value={editedProject.contact_name}
                onChange={handleEditInputChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Contact Number
              </label>
              <Input
                type="tel"
                name="contact_number"
                value={editedProject.contact_number}
                onChange={handleEditInputChange}
              />
              {editContactNumberError && <p className="text-red-500 text-xs mt-1">{editContactNumberError}</p>}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Coordinates</label>
              <Input
                type="text"
                name="coordinates"
                value={editedProject.coordinates}
                onChange={handleEditInputChange}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Remarks</label>
              <Input type="text" name="remarks" value={editedProject.remarks} onChange={handleEditInputChange} />
            </div>
          </div>
        )}
        <div className="flex items-center justify-end w-full gap-3 mt-8">
          <Button size="sm" variant="outline" onClick={handleCloseEditModal}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSaveEdit} disabled={editProjectMutation.isPending}>
            {editProjectMutation.isPending ? (
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
        <h4 className="font-semibold text-gray-800 mb-4 text-title-sm dark:text-white/90">Delete Project</h4>
        {selectedProject && (
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Are you sure you want to delete {selectedProject.name}? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end w-full gap-3 mt-8">
              <Button size="sm" variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="warning"
                onClick={handleConfirmDelete}
                disabled={deleteProjectMutation.isPending}
              >
                {deleteProjectMutation.isPending ? (
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
