"use client";

import TeamTable from "./TeamTable";
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
import { validateMobile, validateName } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";

type Designation = "sales-engineer" | "pump-operator" | "pipeline-gang" | "site-supervisor";

interface Team {
  _id: string;
  user_id: string;
  name: string;
  designation: Designation;
  contact: string;
  created_at: string;
}

interface CreateTeamData {
  name: string;
  designation: Designation;
  contact: string;
}

export default function TeamContainer() {
  const { fetchWithAuth } = useApiClient();
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDesignationFilterOpen, setIsDesignationFilterOpen] = useState(false);
  const [isContactFilterOpen, setIsContactFilterOpen] = useState(false);
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [selectedDesignation, setSelectedDesignation] = useState<string>("");
  const [selectedContact, setSelectedContact] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [editedTeam, setEditedTeam] = useState<CreateTeamData>({
    name: "",
    designation: "sales-engineer",
    contact: "",
  });
  const [newTeam, setNewTeam] = useState<CreateTeamData>({
    name: "",
    designation: "sales-engineer",
    contact: "",
  });
  const [contactError, setContactError] = useState<string>("");
  const [nameError, setNameError] = useState<string>("");
  const [editContactError, setEditContactError] = useState<string>("");
  const [editNameError, setEditNameError] = useState<string>("");

  // Form validation for create modal
  const isCreateFormValid = useMemo(() => {
    const name = newTeam.name || "";
    const contact = newTeam.contact || "";

    return (
      // name.trim() !== "" &&
      // contact.trim() !== "" &&
      validateName(name.trim()) &&
      validateMobile(contact.trim()) &&
      !nameError &&
      !contactError
    );
  }, [newTeam, nameError, contactError]);

  // Form validation for edit modal
  const isEditFormValid = useMemo(() => {
    // const name = editedTeam.name || "";
    // const contact = editedTeam.contact || "";

    return (
      // name.trim() !== "" &&
      // contact.trim() !== "" &&
      // validateName(name.trim()) &&
      // validateMobile(contact.trim()) &&
      !editNameError &&
      !editContactError
    );
  }, [editedTeam, editNameError, editContactError]);

  const { data: teamsData, isLoading: isLoadingTeams } = useQuery({
    queryKey: ["team"],
    queryFn: async () => {
      const response = await fetchWithAuth("/team");
      if (!response) throw new Error("No response from server");
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Failed to fetch team");
      return data.data as Team[];
    },
    enabled: status === "authenticated",
  });

  // Create team mutation
  const createTeamMutation = useMutation({
    mutationFn: async (teamData: CreateTeamData) => {
      const response = await fetchWithAuth("/team", {
        method: "POST",
        body: JSON.stringify(teamData),
      });
      if (!response) throw new Error("No response from server");
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Failed to create team");
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      setIsCreateModalOpen(false);
      setNewTeam({
        name: "",
        designation: "sales-engineer",
        contact: "",
      });
      showSuccess("Team member created successfully!");
    },
    onError: (error: Error) => {
      showError(error.message || "Failed to create team member");
    },
  });

  // Edit team mutation
  const editTeamMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CreateTeamData }) => {
      const response = await fetchWithAuth(`/team/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (!response) throw new Error("No response from server");
      const responseData = await response.json();
      if (!responseData.success) throw new Error(responseData.message || "Failed to update team");
      return responseData.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      setIsEditModalOpen(false);
      setSelectedTeam(null);
      showSuccess("Team member updated successfully!");
    },
    onError: (error: Error) => {
      showError(error.message || "Failed to update team member");
    },
  });

  // Delete team mutation
  const deleteTeamMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetchWithAuth(`/team/${id}`, {
        method: "DELETE",
      });
      if (!response) throw new Error("No response from server");
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Failed to delete team");
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      setIsDeleteModalOpen(false);
      setSelectedTeam(null);
      showSuccess("Team member deleted successfully!");
    },
    onError: (error: Error) => {
      showError(error.message || "Failed to delete team member");
    },
  });

  const handleAddTeam = () => {
    setIsCreateModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Handle name field with validation
    if (name === "name") {
      if (value.length > 25) return; // Prevent typing more than 25 characters
      if (value && !validateName(value)) {
        setNameError("Name must be 1-25 alphanumeric characters");
      } else {
        setNameError("");
      }
    }

    // Handle contact field with validation
    if (name === "contact") {
      if (value.length > 10) return; // Prevent typing more than 10 digits
      if (value && !validateMobile(value)) {
        setContactError("Please enter a valid 10-digit mobile number");
      } else {
        setContactError("");
      }
    }

    setNewTeam((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Handle name field with validation
    if (name === "name") {
      if (value.length > 25) return; // Prevent typing more than 25 characters
      if (value && !validateName(value)) {
        setEditNameError("Name must be 1-25 alphanumeric characters");
      } else {
        setEditNameError("");
      }
    }

    // Handle contact field with validation
    if (name === "contact") {
      if (value.length > 10) return; // Prevent typing more than 10 digits
      if (value && !validateMobile(value)) {
        setEditContactError("Please enter a valid 10-digit mobile number");
      } else {
        setEditContactError("");
      }
    }

    setEditedTeam((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateTeam = async () => {
    if (!validateName(newTeam.name)) {
      setNameError("Name must be 1-25 alphanumeric characters");
      return;
    }
    if (!validateMobile(newTeam.contact)) {
      setContactError("Please enter a valid 10-digit mobile number");
      return;
    }
    setNameError("");
    setContactError("");
    try {
      await createTeamMutation.mutateAsync(newTeam);
    } catch (error) {
      console.error("Error creating team:", error);
    }
  };

  const handleEdit = (team: Team) => {
    setSelectedTeam(team);
    setEditedTeam({
      name: team.name,
      designation: team.designation,
      contact: team.contact,
    });
    setIsEditModalOpen(true);
  };

  const handleDelete = (team: Team) => {
    setSelectedTeam(team);
    setIsDeleteModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedTeam) return;
    if (!validateName(editedTeam.name)) {
      setEditNameError("Name must be 1-25 alphanumeric characters");
      return;
    }
    if (!validateMobile(editedTeam.contact)) {
      setEditContactError("Please enter a valid 10-digit mobile number");
      return;
    }
    setEditNameError("");
    setEditContactError("");
    try {
      await editTeamMutation.mutateAsync({
        id: selectedTeam._id,
        data: editedTeam,
      });
    } catch (error) {
      console.error("Error updating team:", error);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedTeam) return;
    try {
      await deleteTeamMutation.mutateAsync(selectedTeam._id);
    } catch (error) {
      console.error("Error deleting team:", error);
    }
  };

  // Get unique designations from teams data
  const designations = useMemo(() => {
    if (!teamsData) return [];
    const uniqueDesignations = Array.from(new Set(teamsData.map((team) => team.designation)));
    return uniqueDesignations.sort();
  }, [teamsData]);

  // Get unique contacts for filtering
  const contacts = useMemo(() => {
    if (!teamsData) return [];
    const uniqueContacts = Array.from(new Set(teamsData.map((team) => team.contact).filter(Boolean)));
    return uniqueContacts.sort();
  }, [teamsData]);

  // Date range options
  const dateRanges = useMemo(
    () => [
      { label: "Last 7 days", days: 7 },
      { label: "Last 30 days", days: 30 },
      { label: "Last 90 days", days: 90 },
      { label: "All time", days: Infinity },
    ],
    []
  );

  // Filter teams based on search, designation, contact, and date
  const filteredData = useMemo(() => {
    if (!teamsData) return [];

    return teamsData.filter((team) => {
      // Search filter - search across all columns
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        team.name.toLowerCase().includes(searchLower) ||
        team.designation.toLowerCase().includes(searchLower) ||
        team.contact.toLowerCase().includes(searchLower) ||
        team._id.toLowerCase().includes(searchLower);

      // Designation filter
      const matchesDesignation = !selectedDesignation || team.designation === selectedDesignation;

      // Contact filter
      const matchesContact = !selectedContact || team.contact === selectedContact;

      // Date filter
      const teamDate = new Date(team.created_at);
      const now = new Date();
      let matchesDate = true;

      if (selectedDate) {
        const selectedRange = dateRanges.find((range) => range.label === selectedDate);
        if (selectedRange) {
          if (selectedRange.days !== Infinity) {
            const cutoffDate = new Date(now.getTime() - selectedRange.days * 24 * 60 * 60 * 1000);
            matchesDate = teamDate >= cutoffDate;
          }
        }
      }

      return matchesSearch && matchesDesignation && matchesContact && matchesDate;
    });
  }, [teamsData, searchQuery, selectedDesignation, selectedContact, selectedDate, dateRanges]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Teams</h2>
        {session?.sub_role !== "viewer" && (
          <nav>
            <Button className="flex items-center gap-2" size="sm" onClick={handleAddTeam}>
              <PlusIcon className="w-4 h-4" />
              Add Member
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

              {/* Designation Filter */}
              <div className="relative text-sm">
                <Button
                  variant="outline"
                  onClick={() => setIsDesignationFilterOpen(!isDesignationFilterOpen)}
                  className="dropdown-toggle"
                  size="sm"
                >
                  Designation: {selectedDesignation || "All"}
                </Button>
                <Dropdown
                  isOpen={isDesignationFilterOpen}
                  onClose={() => setIsDesignationFilterOpen(false)}
                  className="w-48"
                >
                  <div className="p-2 text-gray-800 dark:text-white/90 ">
                    <button
                      className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      onClick={() => {
                        setSelectedDesignation("");
                        setIsDesignationFilterOpen(false);
                      }}
                    >
                      All
                    </button>
                    {designations.map((designation) => (
                      <button
                        key={designation}
                        className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        onClick={() => {
                          setSelectedDesignation(designation);
                          setIsDesignationFilterOpen(false);
                        }}
                      >
                        {designation}
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
                    {contacts.map((contact) => (
                      <button
                        key={contact}
                        className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        onClick={() => {
                          setSelectedContact(contact);
                          setIsContactFilterOpen(false);
                        }}
                      >
                        {contact}
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
                <div className="text-center py-4 text-gray-800 dark:text-white/90">Please sign in to view teams</div>
              ) : isLoadingTeams ? (
                <div className="flex justify-center py-4">
                  <Spinner text="Loading teams..." />
                </div>
              ) : teamsData && teamsData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-4">
                  <span className="text-gray-800 dark:text-white/90 text-lg">No team member exists.</span>
                  {session?.sub_role !== "viewer" && (
                    <Button size="sm" onClick={handleAddTeam}>
                      <PlusIcon className="w-4 h-4 mr-2" />
                      Add Team Member
                    </Button>
                  )}
                </div>
              ) : (
                <TeamTable data={filteredData} onEdit={handleEdit} onDelete={handleDelete} isViewer={session?.sub_role === "viewer"} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        className="max-w-[600px] p-5 lg:p-10"
      >
        <h4 className="font-semibold text-gray-800 mb-7 text-title-sm dark:text-white/90">Add New Team</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name <span className="text-red-500">*</span></label>
            <Input
              type="text"
              name="name"
              placeholder="Enter team member name (max 25 characters)"
              value={newTeam.name}
              onChange={handleInputChange}
              maxLength={25}
            />
            {nameError && <span className="text-xs text-red-600 mt-1 block">{nameError}</span>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Designation <span className="text-red-500">*</span></label>
            <select
              name="designation"
              value={newTeam.designation}
              onChange={handleInputChange}
              className="w-full rounded-lg border border-gray-200 py-2.5 px-4 text-sm dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="sales-engineer">Sales Engineer</option>
              <option value="pump-operator">Pump Operator</option>
              <option value="pipeline-gang">Pipeline Gang</option>
              <option value="site-supervisor">Site Supervisor</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Contact Mobile Number <span className="text-red-500">*</span></label>
            <Input
              type="text"
              name="contact"
              placeholder="Enter 10-digit mobile number"
              value={newTeam.contact}
              onChange={handleInputChange}
              maxLength={10}
            />
            {contactError && <span className="text-xs text-red-600 mt-1 block">{contactError}</span>}
          </div>
        </div>
        <div className="flex items-center justify-end w-full gap-3 mt-8">
          <Button size="sm" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleCreateTeam}
            disabled={createTeamMutation.isPending || !isCreateFormValid}
          >
            {createTeamMutation.isPending ? (
              <div className="flex items-center gap-2">
                <Spinner size="sm" />
                <span>Creating...</span>
              </div>
            ) : (
              "Create Member"
            )}
          </Button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} className="max-w-[600px] p-5 lg:p-10">
        <h4 className="font-semibold text-gray-800 mb-7 text-title-sm dark:text-white/90">Edit Team</h4>
        {selectedTeam && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name <span className="text-red-500">*</span></label>
              <Input
                type="text"
                name="name"
                value={editedTeam.name}
                onChange={handleEditInputChange}
                maxLength={25}
              />
              {editNameError && <span className="text-xs text-red-600 mt-1 block">{editNameError}</span>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Designation <span className="text-red-500">*</span></label>
              <select
                name="designation"
                value={editedTeam.designation}
                onChange={handleEditInputChange}
                className="w-full rounded-lg border border-gray-200 py-2.5 px-4 text-sm dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="sales-engineer">Sales Engineer</option>
                <option value="pump-operator">Pump Operator</option>
                <option value="pipeline-gang">Pipeline Gang</option>
                <option value="site-supervisor">Site Supervisor</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Contact Mobile Number <span className="text-red-500">*</span></label>
              <Input
                type="text"
                name="contact"
                placeholder="Enter 10-digit mobile number"
                value={editedTeam.contact}
                onChange={handleEditInputChange}
                maxLength={10}
              />
              {editContactError && <span className="text-xs text-red-600 mt-1 block">{editContactError}</span>}
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
            disabled={editTeamMutation.isPending || !isEditFormValid}
          >
            {editTeamMutation.isPending ? (
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
        <h4 className="font-semibold text-gray-800 mb-4 text-title-sm dark:text-white/90">Delete Team</h4>
        {selectedTeam && (
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Are you sure you want to delete {selectedTeam.name}? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end w-full gap-3 mt-8">
              <Button size="sm" variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="warning" onClick={handleConfirmDelete} disabled={deleteTeamMutation.isPending}>
                {deleteTeamMutation.isPending ? (
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
