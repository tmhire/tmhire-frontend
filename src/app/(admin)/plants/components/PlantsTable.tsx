import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import React from "react";
import Button from "@/components/ui/button/Button";
import { Edit, Trash } from "lucide-react";

interface Plant {
  _id: string;
  user_id: string;
  name: string;
  location: string;
  address: string;
  coordinates: string | null;
  capacity: number | null;
  contact_name1: string | null;
  contact_number1: string | null;
  contact_name2: string | null;
  contact_number2: string | null;
  remarks: string | null;
  status: "active" | "inactive";
  created_at: string;
}

interface PlantsTableProps {
  data: Plant[];
  onEdit: (plant: Plant) => void;
  onDelete: (plant: Plant) => void;
  isViewer?: boolean;
}

export default function PlantsTable({ data, onEdit, onDelete, isViewer = false }: PlantsTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <div className="min-w-[1100px]">
          <Table>
            {/* Table Header */}
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Name
                </TableCell>
                <TableCell
                  isHeader
                  className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Capacity
                </TableCell>
                <TableCell
                  isHeader
                  className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Location
                </TableCell>
                <TableCell
                  isHeader
                  className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Address
                </TableCell>
                {/* <TableCell
                  isHeader
                  className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Coordinates
                </TableCell> */}
                <TableCell
                  isHeader
                  className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Contact 1
                </TableCell>
                <TableCell
                  isHeader
                  className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Contact 2
                </TableCell>
                <TableCell
                  isHeader
                  className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Remarks
                </TableCell>
                <TableCell
                  isHeader
                  className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Status
                </TableCell>
                {!isViewer && (
                  <TableCell
                    isHeader
                    className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Actions
                  </TableCell>
                )}
              </TableRow>
            </TableHeader>

            {/* Table Body */}
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {data.map((plant) => (
                <TableRow key={plant._id}>
                  <TableCell className="px-3 py-4 text-start">
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                          {plant.name}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {plant.capacity ? plant.capacity : "-"}
                  </TableCell>
                  <TableCell className="px-3 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    <div className="max-w-[120px] truncate group relative cursor-pointer" title={plant.location}>
                      <a
                        href={plant.location}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        {plant.location}
                      </a>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {plant.address}
                  </TableCell>
                  {/* <TableCell className="px-3 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {plant.coordinates || "-"}
                  </TableCell> */}
                  <TableCell className="px-3 py-4 text-gray-500 text-theme-sm dark:text-gray-400">
                    <div className="flex flex-col">
                      <span className="font-medium">{plant.contact_name1 || "-"}</span>
                      <span className="text-xs text-gray-400">{plant.contact_number1 || "-"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-4 text-gray-500 text-theme-sm dark:text-gray-400">
                    <div className="flex flex-col">
                      <span className="font-medium">{plant.contact_name2 || "-"}</span>
                      <span className="text-xs text-gray-400">{plant.contact_number2 || "-"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-4 text-gray-500 text-theme-sm dark:text-gray-400">
                    {plant.remarks || "-"}
                  </TableCell>
                  <TableCell className="px-3 py-4 text-gray-500 text-theme-sm dark:text-gray-400">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${plant.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}>
                      {plant.status}
                    </span>
                  </TableCell>
                  {!isViewer && (
                    <TableCell className="px-3 py-4">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => onEdit(plant)}>
                          <Edit size={"12px"} />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => onDelete(plant)}>
                          <Trash size={"12px"} />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
