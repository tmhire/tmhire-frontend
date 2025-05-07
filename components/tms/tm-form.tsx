"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { TransitMixer } from "@/lib/api/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const formSchema = z.object({
  identifier: z.string().min(1, "Identifier is required"),
  capacity: z.coerce.number().positive("Capacity must be positive"),
});

type FormValues = z.infer<typeof formSchema>;

interface TMFormProps {
  tm?: TransitMixer | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormValues) => void;
  isLoading: boolean;
}

export default function TMForm({
  tm,
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: TMFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      identifier: "",
      capacity: 0,
    },
  });

  useEffect(() => {
    if (tm) {
      reset({
        identifier: tm.identifier,
        capacity: tm.capacity,
      });
    } else {
      reset({
        identifier: "",
        capacity: 0,
      });
    }
  }, [tm, reset]);

  const handleFormSubmit = (data: FormValues) => {
    onSubmit(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {tm ? "Edit Transit Mixer" : "Add Transit Mixer"}
          </DialogTitle>
          <DialogDescription>
            {tm
              ? "Update the details of your transit mixer"
              : "Add a new transit mixer to your fleet"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">Identifier</Label>
              <Input
                id="identifier"
                {...register("identifier")}
                placeholder="Enter identifier (e.g., TM-123)"
              />
              {errors.identifier && (
                <p className="text-sm text-red-500">
                  {errors.identifier.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity (m³)</Label>
              <Input
                id="capacity"
                type="number"
                step="0.1"
                {...register("capacity")}
                placeholder="Enter capacity in m³"
              />
              {errors.capacity && (
                <p className="text-sm text-red-500">
                  {errors.capacity.message}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? tm
                  ? "Updating..."
                  : "Creating..."
                : tm
                ? "Update"
                : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
