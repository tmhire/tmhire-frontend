import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import React from "react";
import Button from "@/components/ui/button/Button";
import { Edit, Trash } from "lucide-react";

interface TransitMixer {
  _id: string;
  user_id: string;
  plant_id: string | null;
  identifier: string;
  capacity: number;
  driver_name: string | null;
  driver_contact: string | null;
  status: "active" | "inactive";
  created_at: string;
}

interface TransitMixersTableProps {
  data: TransitMixer[];
  onEdit: (mixer: TransitMixer) => void;
  onDelete: (mixer: TransitMixer) => void;
  plants?: { _id: string; name: string }[]; // Add this prop
}

export default function TransitMixersTable({ data, onEdit, onDelete, plants = [] }: TransitMixersTableProps) {
  const getPlantName = (plant_id: string | null) => {
    if (!plant_id) return "Not Assigned";
    const plant = plants.find((p) => p._id === plant_id);
    return plant ? plant.name : plant_id;
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <div className="">
          <Table>
            {/* Table Header */}
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  TM No.
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Capacity (m³)
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Plant
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Driver Name
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Driver Contact
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Status
                </TableCell>
                {/* <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Created At</TableCell> */}
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>
            {/* Table Body */}
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {data.map((mixer) => (
                <TableRow key={mixer._id}>
                  <TableCell className="px-5 py-4 text-start">
                    <span className="block font-medium bg-yellow-400 w-fit px-3 py-2 rounded-lg border-2 border-gray-800 text-gray-800 text-theme-sm dark:text-white/90">
                      {mixer.identifier}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {mixer.capacity}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {getPlantName(mixer.plant_id)}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {mixer.driver_name || "-"}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {mixer.driver_contact || "-"}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-start">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        mixer.status === "active"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {mixer.status.charAt(0).toUpperCase() + mixer.status.slice(1)}
                    </span>
                  </TableCell>
                  {/* <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {new Date(mixer.created_at).toLocaleDateString()}
                  </TableCell> */}
                  <TableCell className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => onEdit(mixer)}>
                        <Edit size={"12px"} />
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onDelete(mixer)}>
                        <Trash size={"12px"} />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
