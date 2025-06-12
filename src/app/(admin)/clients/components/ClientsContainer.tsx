"use client";

import ClientsTable from "./ClientsTable";
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

interface Client {
  _id: string;
  user_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  notes: string;
  created_at: string;
  last_updated: string;
}

interface CreateClientData {
  name: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  notes: string;
}

export default function ClientsContainer() {
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
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editedClient, setEditedClient] = useState<CreateClientData>({
    name: "",
    address: "",
    city: "",
    state: "",
    postal_code: "",
    contact_person: "",
    contact_email: "",
    contact_phone: "",
    notes: "",
  });
  const [newClient, setNewClient] = useState<CreateClientData>({
    name: "",
    address: "",
    city: "",
    state: "",
    postal_code: "",
    contact_person: "",
    contact_email: "",
    contact_phone: "",
    notes: "",
  });

  const { data: clientsData, isLoading: isLoadingClients } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const response = await fetchWithAuth('/clients');
      if (!response) throw new Error('No response from server');
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to fetch clients');
      return data.data as Client[];
    },
    enabled: status === "authenticated",
  });

  // Create client mutation
  const createClientMutation = useMutation({
    mutationFn: async (clientData: CreateClientData) => {
      const response = await fetchWithAuth('/clients', {
        method: 'POST',
        body: JSON.stringify(clientData),
      });
      if (!response) throw new Error('No response from server');
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to create client');
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setIsCreateModalOpen(false);
      setNewClient({
        name: "",
        address: "",
        city: "",
        state: "",
        postal_code: "",
        contact_person: "",
        contact_email: "",
        contact_phone: "",
        notes: "",
      });
    },
  });

  // Edit client mutation
  const editClientMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CreateClientData }) => {
      const response = await fetchWithAuth(`/clients/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      if (!response) throw new Error('No response from server');
      const responseData = await response.json();
      if (!responseData.success) throw new Error(responseData.message || 'Failed to update client');
      return responseData.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setIsEditModalOpen(false);
      setSelectedClient(null);
    },
  });

  // Delete client mutation
  const deleteClientMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetchWithAuth(`/clients/${id}`, {
        method: 'DELETE',
      });
      if (!response) throw new Error('No response from server');
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to delete client');
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setIsDeleteModalOpen(false);
      setSelectedClient(null);
    },
  });

  const handleAddClient = () => {
    setIsCreateModalOpen(true);
  };

  const handleCreateClient = async () => {
    try {
      await createClientMutation.mutateAsync(newClient);
    } catch (error) {
      console.error('Error creating client:', error);
    }
  };

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setEditedClient({
      name: client.name,
      address: client.address,
      city: client.city,
      state: client.state,
      postal_code: client.postal_code,
      contact_person: client.contact_person,
      contact_email: client.contact_email,
      contact_phone: client.contact_phone,
      notes: client.notes,
    });
    setIsEditModalOpen(true);
  };

  const handleDelete = (client: Client) => {
    setSelectedClient(client);
    setIsDeleteModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedClient) return;
    try {
      await editClientMutation.mutateAsync({
        id: selectedClient._id,
        data: editedClient,
      });
    } catch (error) {
      console.error('Error updating client:', error);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedClient) return;
    try {
      await deleteClientMutation.mutateAsync(selectedClient._id);
    } catch (error) {
      console.error('Error deleting client:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewClient((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedClient((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Get unique cities from clients data
  const locations = useMemo(() => {
    if (!clientsData) return [];
    const uniqueLocations = Array.from(new Set(clientsData.map(client => client.city)));
    return uniqueLocations.sort();
  }, [clientsData]);

  // Date range options
  const dateRanges = useMemo(() => {
    return [
      { label: "Last 7 days", days: 7 },
      { label: "Last 30 days", days: 30 },
      { label: "Last 90 days", days: 90 },
      { label: "All time", days: Infinity }
    ];
  }, []);

  // Filter clients based on search, location, and date
  const filteredData = useMemo(() => {
    if (!clientsData) return [];

    return clientsData.filter((client) => {
      // Search filter
      const matchesSearch =
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.city.toLowerCase().includes(searchQuery.toLowerCase());

      // Location filter
      const matchesLocation = !selectedLocation || client.city === selectedLocation;

      // Date filter
      const clientDate = new Date(client.created_at);
      const now = new Date();
      let matchesDate = true;

      if (selectedDate) {
        const selectedRange = dateRanges.find(range => range.label === selectedDate);
        if (selectedRange) {
          if (selectedRange.days !== Infinity) {
            const cutoffDate = new Date(now.getTime() - selectedRange.days * 24 * 60 * 60 * 1000);
            matchesDate = clientDate >= cutoffDate;
          }
        }
      }

      return matchesSearch && matchesLocation && matchesDate;
    });
  }, [clientsData, searchQuery, selectedLocation, selectedDate, dateRanges]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Clients</h2>
        <nav>
          <Button className="flex items-center gap-2" size="sm" onClick={handleAddClient}>
            <PlusIcon className="w-4 h-4" />
            Add Client
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
                <div className="text-center py-4 text-gray-800 dark:text-white/90">Please sign in again to view clients</div>
              ) : isLoadingClients ? (
                <div className="flex justify-center py-4">
                  <Spinner text="Loading clients..." />
                </div>
              ) : (
                <ClientsTable 
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
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} className="max-w-[800px] p-5 lg:p-10">
        <h4 className="font-semibold text-gray-800 mb-7 text-title-sm dark:text-white/90">Add New Client</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name</label>
            <Input
              type="text"
              name="name"
              placeholder="Enter client name"
              value={newClient.name}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Address</label>
            <Input
              type="text"
              name="address"
              placeholder="Enter client address"
              value={newClient.address}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">City</label>
            <Input
              type="text"
              name="city"
              placeholder="Enter city"
              value={newClient.city}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">State</label>
            <Input
              type="text"
              name="state"
              placeholder="Enter state"
              value={newClient.state}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Postal Code</label>
            <Input
              type="text"
              name="postal_code"
              placeholder="Enter postal code"
              value={newClient.postal_code}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Contact Person</label>
            <Input
              type="text"
              name="contact_person"
              placeholder="Enter contact person name"
              value={newClient.contact_person}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Contact Email</label>
            <Input
              type="email"
              name="contact_email"
              placeholder="Enter contact email"
              value={newClient.contact_email}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Contact Phone</label>
            <Input
              type="tel"
              name="contact_phone"
              placeholder="Enter contact phone"
              value={newClient.contact_phone}
              onChange={handleInputChange}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
            <Input
              type="text"
              name="notes"
              placeholder="Enter any additional notes"
              value={newClient.notes}
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
            onClick={handleCreateClient}
            disabled={createClientMutation.isPending}
          >
            {createClientMutation.isPending ? (
              <div className="flex items-center gap-2">
                <Spinner size="sm" />
                <span>Creating...</span>
              </div>
            ) : 'Create Client'}
          </Button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} className="max-w-[800px] p-5 lg:p-10">
        <h4 className="font-semibold text-gray-800 mb-7 text-title-sm dark:text-white/90">Edit Client</h4>
        {selectedClient && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name</label>
              <Input
                type="text"
                name="name"
                value={editedClient.name}
                onChange={handleEditInputChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Address</label>
              <Input
                type="text"
                name="address"
                value={editedClient.address}
                onChange={handleEditInputChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">City</label>
              <Input
                type="text"
                name="city"
                value={editedClient.city}
                onChange={handleEditInputChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">State</label>
              <Input
                type="text"
                name="state"
                value={editedClient.state}
                onChange={handleEditInputChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Postal Code</label>
              <Input
                type="text"
                name="postal_code"
                value={editedClient.postal_code}
                onChange={handleEditInputChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Contact Person</label>
              <Input
                type="text"
                name="contact_person"
                value={editedClient.contact_person}
                onChange={handleEditInputChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Contact Email</label>
              <Input
                type="email"
                name="contact_email"
                value={editedClient.contact_email}
                onChange={handleEditInputChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Contact Phone</label>
              <Input
                type="tel"
                name="contact_phone"
                value={editedClient.contact_phone}
                onChange={handleEditInputChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
              <Input
                type="text"
                name="notes"
                value={editedClient.notes}
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
            disabled={editClientMutation.isPending}
          >
            {editClientMutation.isPending ? (
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
        <h4 className="font-semibold text-gray-800 mb-4 text-title-sm dark:text-white/90">Delete Client</h4>
        {selectedClient && (
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Are you sure you want to delete {selectedClient.name}? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end w-full gap-3 mt-8">
              <Button size="sm" variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                size="sm" 
                variant="warning" 
                onClick={handleConfirmDelete}
                disabled={deleteClientMutation.isPending}
              >
                {deleteClientMutation.isPending ? (
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
