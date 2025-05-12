"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientApi, Client } from "@/lib/api/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusIcon, PencilIcon, TrashIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/lib/auth/auth-context";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/Spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const clientFormSchema = z.object({
  name: z.string().min(1, "Client name is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postal_code: z.string().min(1, "Postal code is required"),
  contact_person: z.string().min(1, "Contact person is required"),
  contact_phone: z.string().min(1, "Contact phone is required"),
  contact_email: z.string().email("Valid email is required"),
  notes: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

function ClientForm({
  isOpen,
  onClose,
  initialData,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Client;
}) {
  const queryClient = useQueryClient();
  const isEditing = !!initialData;

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: initialData || {
      name: "",
      address: "",
      city: "",
      state: "",
      postal_code: "",
      contact_person: "",
      contact_phone: "",
      contact_email: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    }
  }, [initialData, form]);

  const createMutation = useMutation({
    mutationFn: (data: ClientFormValues) => clientApi.createClient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client created successfully");
      onClose();
      form.reset();
    },
    onError: (error) => {
      console.error("Error creating client:", error);
      toast.error("Failed to create client");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: ClientFormValues) => clientApi.updateClient(initialData!._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client updated successfully");
      onClose();
    },
    onError: (error) => {
      console.error("Error updating client:", error);
      toast.error("Failed to update client");
    },
  });

  const onSubmit = (data: ClientFormValues) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Client" : "Add New Client"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update client information"
              : "Enter details for a new client"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Client Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="ABC Constructions" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="123 Main St" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Chennai" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Tamil Nadu" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="postal_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal Code</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="600001" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact_person"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Person</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="John Doe" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Phone</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="9876543210" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="john@example.com" type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Additional notes about this client..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="mr-2"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? (
                  <Spinner size="small" />
                ) : isEditing ? (
                  "Update Client"
                ) : (
                  "Add Client"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function ClientsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>(undefined);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch clients
  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const response = await clientApi.getAllClients();
      return response;
    },
    enabled: isAuthenticated, // Only run query if authenticated
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => clientApi.deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting client:", error);
      toast.error("Failed to delete client");
    },
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this client? This will also affect any schedules associated with this client.")) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setIsAddOpen(true);
  };

  const handleCloseForm = () => {
    setIsAddOpen(false);
    setEditingClient(undefined);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-6rem)]">
        <Spinner size="small" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Clients</h1>
        <Button onClick={() => setIsAddOpen(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Clients</CardTitle>
          <CardDescription>Manage your clients</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-4"><Spinner size="small" /></div>
          ) : clients?.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground">No clients found</p>
              <Button
                variant="outline"
                className="mt-2"
                onClick={() => setIsAddOpen(true)}
              >
                Add your first client
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 text-left font-medium">Name</th>
                    <th className="py-3 text-left font-medium">Location</th>
                    <th className="py-3 text-left font-medium">Contact</th>
                    <th className="py-3 text-left font-medium">Notes</th>
                    <th className="py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients?.map(client => (
                    <tr key={client._id} className="border-b">
                      <td className="py-3">{client.name}</td>
                      <td className="py-3">{client.city}, {client.state}</td>
                      <td className="py-3">
                        <div>
                          <div>{client.contact_person}</div>
                          <div className="text-sm text-muted-foreground">{client.contact_phone}</div>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="max-w-[200px] truncate text-muted-foreground">
                          {client.notes || "-"}
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex space-x-2 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(client)}
                          >
                            <PencilIcon className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(client._id)}
                          >
                            <TrashIcon className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ClientForm 
        isOpen={isAddOpen} 
        onClose={handleCloseForm} 
        initialData={editingClient} 
      />
    </div>
  );
} 