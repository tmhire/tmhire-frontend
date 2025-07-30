import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import React from "react";
import Button from "@/components/ui/button/Button";
import { Edit, Trash } from "lucide-react";

interface Client {
  _id: string;
  user_id: string;
  name: string;
  legal_entity: string | null;
  created_at: string;
  last_updated: string;
}

interface Project {
  _id: string;
  user_id: string;
  name: string;
  address: string;
  client_id: string;
  contact_name: string;
  contact_number: string;
  coordinates: string;
  remarks: string;
  created_at: string;
  last_updated: string;
}

interface ProjectsTableProps {
  data: Project[];
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  clients: Client[];
}

export default function ProjectsTable({ data, onEdit, onDelete, clients }: ProjectsTableProps) {
  const getClientName = (clientId: string) => {
    const client = clients.find(c => c._id === clientId);
    return client ? client.name : "Unknown Client";
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
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Name
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Client
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Address
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Contact Name
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Contact Number
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Created
                </TableCell>
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
              {data.map((project) => (
                <TableRow key={project._id}>
                  <TableCell className="px-5 py-4 text-start">
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                          {project.name}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {getClientName(project.client_id)}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {project.address}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {project.contact_name}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {project.contact_number}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {new Date(project.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => onEdit(project)}>
                        <Edit size={"12px"} />
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onDelete(project)}>
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