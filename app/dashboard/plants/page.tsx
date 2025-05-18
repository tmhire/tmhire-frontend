"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { plantApi, Plant } from "@/lib/api/api";
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
import { toast } from "sonner";
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

const plantFormSchema = z.object({
  name: z.string().min(1, "Plant name is required"),
  address: z.string().min(1, "Address is required"),
  location: z.string().min(1, "Location is required"),
  contact_number: z.string().min(1, "Contact phone is required"),
});

type PlantFormValues = z.infer<typeof plantFormSchema>;

function PlantForm({
  isOpen,
  onClose,
  initialData,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Plant;
}) {
  const queryClient = useQueryClient();
  const isEditing = !!initialData;

  const form = useForm<PlantFormValues>({
    resolver: zodResolver(plantFormSchema),
    defaultValues: initialData || {
      name: "",
      address: "",
      location: "",
      contact_number: "",
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        address: initialData.address,
        location: initialData.location || "",
        contact_number: initialData.contact_number,
      });
    }
  }, [initialData, form]);

  const createMutation = useMutation({
    mutationFn: (data: PlantFormValues) => plantApi.createPlant(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plants"] });
      toast.success("Plant created successfully");
      onClose();
      form.reset();
    },
    onError: error => {
      console.error("Error creating plant:", error);
      toast.error("Failed to create plant");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: PlantFormValues) =>
      plantApi.updatePlant(initialData!._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plants"] });
      toast.success("Plant updated successfully");
      onClose();
    },
    onError: error => {
      console.error("Error updating plant:", error);
      toast.error("Failed to update plant");
    },
  });

  const onSubmit = (data: PlantFormValues) => {
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
          <DialogTitle>
            {isEditing ? "Edit Plant" : "Add New Plant"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update plant information"
              : "Enter details for a new plant"}
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
                    <FormLabel>Plant Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Concrete Plant 1" />
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
                name="location"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Chennai" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact_number"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Contact Phone</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="9876543210" />
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
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <Spinner size="small" />
                ) : isEditing ? (
                  "Update Plant"
                ) : (
                  "Add Plant"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function PlantsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingPlant, setEditingPlant] = useState<Plant | undefined>(
    undefined
  );

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch plants
  const { data: plants, isLoading } = useQuery({
    queryKey: ["plants"],
    queryFn: async () => {
      const response = await plantApi.getAllPlants();
      return response;
    },
    enabled: isAuthenticated, // Only run query if authenticated
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => plantApi.deletePlant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plants"] });
      toast.success("Plant deleted successfully");
    },
    onError: error => {
      console.error("Error deleting plant:", error);
      toast.error("Failed to delete plant");
    },
  });

  const handleDelete = (id: string) => {
    if (
      confirm(
        "Are you sure you want to delete this plant? This will also affect any transit mixers associated with this plant."
      )
    ) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (plant: Plant) => {
    setEditingPlant(plant);
    setIsAddOpen(true);
  };

  const handleCloseForm = () => {
    setIsAddOpen(false);
    setEditingPlant(undefined);
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
        <h1 className="text-3xl font-bold">Plants</h1>
        <Button onClick={() => setIsAddOpen(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Plant
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Plants</CardTitle>
          <CardDescription>Manage your concrete plants</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Spinner size="small" />
            </div>
          ) : plants?.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground">No plants found</p>
              <Button
                variant="outline"
                className="mt-2"
                onClick={() => setIsAddOpen(true)}
              >
                Add your first plant
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 text-left font-medium">Name</th>
                    <th className="py-3 text-left font-medium">Address</th>
                    <th className="py-3 text-left font-medium">Location</th>
                    <th className="py-3 text-left font-medium">Contact</th>
                    <th className="py-3 text-left font-medium">Created</th>
                    <th className="py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {plants?.map(plant => (
                    <tr key={plant._id} className="border-b">
                      <td className="py-3">{plant.name}</td>
                      <td className="py-3">{plant.address}</td>
                      <td className="py-3">{plant.location}</td>
                      <td className="py-3">
                        <div className="text-sm">
                          {plant.contact_number}
                        </div>
                      </td>
                      <td className="py-3">
                        {plant.created_at &&
                          formatDistanceToNow(new Date(plant.created_at), {
                            addSuffix: true,
                          })}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex space-x-2 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(plant)}
                          >
                            <PencilIcon className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(plant._id)}
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

      <PlantForm
        isOpen={isAddOpen}
        onClose={handleCloseForm}
        initialData={editingPlant}
      />
    </div>
  );
}
