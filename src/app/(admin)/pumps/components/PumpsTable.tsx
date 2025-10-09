import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import React from "react";
import Button from "@/components/ui/button/Button";
import { Edit, Trash } from "lucide-react";

interface Pump {
  _id: string;
  identifier: string;
  type: "line" | "boom";
  capacity: number;
  plant_id: string;
  status: "active" | "inactive";
  make: string;
  driver_name: string | null;
  driver_contact: string | null;
  created_at: string;
  remarks: string | null;
  pump_operator_id?: string | null;
  pipeline_gang_id?: string | null;
}

interface TeamMember {
  _id: string;
  name: string;
  designation?: string;
}

interface PumpsTableProps {
  data: Pump[];
  onEdit: (pump: Pump) => void;
  onDelete: (pump: Pump) => void;
  plantMap: Map<string, string>;
  teamMembers: TeamMember[];
}

export default function PumpsTable({ data, onEdit, onDelete, plantMap, teamMembers }: PumpsTableProps) {
  const getMemberName = (id?: string | null) => {
    if (!id) return "-";
    const m = teamMembers.find((tm) => tm._id === id);
    return m?.name || "-";
  };
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <div className="min-w-[1102px]">
          <Table>
            {/* Table Header */}
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  S.No
                </TableCell>
                <TableCell
                  isHeader
                  className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Pump No.
                </TableCell>
                <TableCell
                  isHeader
                  className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Type
                </TableCell>
                <TableCell
                  isHeader
                  className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Capacity (m3)
                </TableCell>
                <TableCell
                  isHeader
                  className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Make
                </TableCell>
                <TableCell
                  isHeader
                  className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Plant
                </TableCell>
                <TableCell
                  isHeader
                  className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Driver
                </TableCell>
                <TableCell
                  isHeader
                  className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Pump Operator
                </TableCell>
                <TableCell
                  isHeader
                  className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Pipeline Gang
                </TableCell>
                <TableCell
                  isHeader
                  className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Status
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
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>

            {/* Table Body */}
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {data.map((pump, index) => (
                <TableRow key={pump._id}>
                  <TableCell className="px-3 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {index + 1}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-start">
                    <div
                      className={`flex w-full rounded-lg border-2 border-black shadow items-center ${
                        pump.type === "line" ? "bg-blue-500" : "bg-green-500"
                      }`}
                    >
                      <label
                        className={`flex flex-col justify-between gap-1 text-center rounded-l p-2 text-[6px] font-bold text-white ${
                          pump.type === "line" ? "bg-blue-700" : "bg-green-700"
                        }`}
                      >
                        <img className="h-3" src="https://cdn.cdnlogo.com/logos/e/51/eu.svg" alt="EU" />
                        {pump.type === "line" ? "LINE" : "BOOM"}
                      </label>
                      <label className="p-1 px-2 font-mono text-sm font-medium items-center">{pump.identifier}</label>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    <span
                      className={
                        pump.type === "line"
                          ? "inline-block px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-semibold"
                          : "inline-block px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-semibold"
                      }
                    >
                      {pump.type}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {pump.capacity}
                  </TableCell>
                  <TableCell className="px-3 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {pump.make || "N/A"}
                  </TableCell>
                  <TableCell className="px-3 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {plantMap.get(pump.plant_id) || "N/A"}
                  </TableCell>
                  <TableCell className="px-3 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    <div className="flex flex-col">
                      <span className="font-medium">{pump.driver_name || "-"}</span>
                      <span className="text-xs text-gray-400">{pump.driver_contact || "-"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {getMemberName(pump.pump_operator_id)}
                  </TableCell>
                  <TableCell className="px-3 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {getMemberName(pump.pipeline_gang_id)}
                  </TableCell>
                  <TableCell className="px-3 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        pump.status === "active"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {pump.status.charAt(0).toUpperCase() + pump.status.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {pump.remarks || "-"}
                  </TableCell>
                  <TableCell className="px-3 py-4">
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => onEdit(pump)}>
                        <Edit size={"12px"} />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onDelete(pump)}>
                        <Trash size={"12px"} />
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
