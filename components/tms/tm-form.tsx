"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { plantApi, Plant, TransitMixer } from "@/lib/api/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/Spinner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const tmFormSchema = z.object({
  identifier: z.string().min(1, "Identifier is required"),
  capacity: z.coerce.number().positive("Capacity must be a positive number"),
  plant_id: z.string().optional(),
});

type TMFormValues = z.infer<typeof tmFormSchema>;

interface TMFormProps {
  tm: TransitMixer | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TMFormValues) => void;
  isLoading: boolean;
}

export default function TMForm({
  tm,
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: TMFormProps) {
  const isEditing = !!tm;

  const form = useForm<TMFormValues>({
    resolver: zodResolver(tmFormSchema),
    defaultValues: {
      identifier: tm?.identifier || "",
      capacity: tm?.capacity || undefined,
      plant_id: tm?.plant_id || undefined,
    },
  });

  useEffect(() => {
    if (tm) {
      form.reset({
        identifier: tm.identifier,
        capacity: tm.capacity,
        plant_id: tm.plant_id,
      });
    } else {
      form.reset({
        identifier: "",
        capacity: undefined,
        plant_id: undefined,
      });
    }
  }, [tm, form]);

  // Fetch plants for the dropdown
  const { data: plants, isLoading: plantsLoading } = useQuery({
    queryKey: ["plants"],
    queryFn: async () => {
      const response = await plantApi.getAllPlants();
      return response;
    },
  });

  const handleSubmit = (data: TMFormValues) => {
    onSubmit(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Transit Mixer" : "Add New Transit Mixer"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update transit mixer information"
              : "Enter details for a new transit mixer"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="identifier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Identifier</FormLabel>
                  <FormControl>
                    <Input placeholder="TM-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Capacity (m³)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="6"
                      step="0.1"
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "") {
                          field.onChange(undefined);
                        } else {
                          field.onChange(parseFloat(value));
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="plant_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plant</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a plant" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {plantsLoading ? (
                        <div className="flex justify-center py-2">
                          <Spinner size="small" />
                        </div>
                      ) : plants && plants.length > 0 ? (
                        plants.map((plant) => (
                          <SelectItem key={plant._id} value={plant._id}>
                            {plant.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>
                          No plants available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="mr-2"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <Spinner size="small" />
                ) : isEditing ? (
                  "Update Transit Mixer"
                ) : (
                  "Add Transit Mixer"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
