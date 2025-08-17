import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import React from "react";
import Button from "@/components/ui/button/Button";
import { Edit, Trash } from "lucide-react";

type Designation = "sales-engineer" | "pump-operator" | "pipeline-gang" | "site-supervisor";

interface Team {
  _id: string;
  user_id: string;
  name: string;
  designation: Designation;
  contact: string;
  created_at: string;
}

interface TeamTableProps {
  data: Team[];
  onEdit: (team: Team) => void;
  onDelete: (team: Team) => void;
}

const DesignationLabels: Record<Designation, string> = {
  "sales-engineer": "Sales Engineer",
  "pump-operator": "Pump Operator",
  "pipeline-gang": "Pipeline Gang",
  "site-supervisor": "Site Supervisor",
};

export default function TeamTable({ data, onEdit, onDelete }: TeamTableProps) {
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
                  Designation
                </TableCell>
                <TableCell
                  isHeader
                  className="px-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Mobile number
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
              {data.map((member) => (
                <TableRow key={member._id}>
                  <TableCell className="px-3 py-4 text-start">
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                          {member.name}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {DesignationLabels[member.designation]}
                  </TableCell>
                  <TableCell className="px-3 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {member.contact}
                  </TableCell>
                  <TableCell className="px-3 py-4">
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => onEdit(member)}>
                        <Edit size={"12px"} />
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onDelete(member)}>
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
