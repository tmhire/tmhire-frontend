import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import React, { useState } from "react";
import Button from "@/components/ui/button/Button";
import { Edit, Trash, Copy, Check } from "lucide-react";

interface Project {
  _id: string;
  user_id: string;
  name: string;
  address: string;
  client_id: string;
  mother_plant_id: string;
  contact_name: string;
  contact_number: string;
  coordinates: string;
  remarks: string;
  created_at: string;
  last_updated: string;
}

interface Client {
  _id: string;
  user_id: string;
  name: string;
  legal_entity: string | null;
  created_at: string;
  last_updated: string;
}

interface Plant {
  _id: string;
  user_id: string;
  name: string;
  location: string;
  address: string;
  coordinates: string | null;
  contact_name1: string | null;
  contact_number1: string | null;
  contact_name2: string | null;
  contact_number2: string | null;
  remarks: string | null;
  created_at: string;
}

interface ProjectsTableProps {
  data: Project[];
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  clients: Client[];
  plants: Plant[];
}

export default function ProjectsTable({ data, onEdit, onDelete, clients, plants }: ProjectsTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getClientName = (clientId: string) => {
    const client = clients.find((c) => c._id === clientId);
    return client ? client.name : "Unknown Client";
  };

  const getPlantName = (plantId: string) => {
    const plant = plants.find((p) => p._id === plantId);
    return plant ? plant.name : "Unknown Plant";
  };

  const handleCopyCoordinates = async (coordinates: string, projectId: string) => {
    try {
      await navigator.clipboard.writeText(coordinates);
      setCopiedId(projectId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy coordinates:", err);
    }
  };

  const truncateText = (text: string, maxLength: number = 6) => {
    if (!text) return "";
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <div className="min-w-[1000px]">
          <Table>
            {/* Table Header */}
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-2 pl-3 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 w-12"
                >
                  S.No
                </TableCell>
                <TableCell
                  isHeader
                  className="px-2 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 w-32"
                >
                  Name
                </TableCell>
                <TableCell
                  isHeader
                  className="px-2 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 w-20"
                >
                  Client
                </TableCell>
                <TableCell
                  isHeader
                  className="px-2 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 w-20"
                >
                  Mother Plant
                </TableCell>
                <TableCell
                  isHeader
                  className="px-2 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 w-20"
                >
                  Address
                </TableCell>
                <TableCell
                  isHeader
                  className="px-2 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 w-20"
                >
                  Contact
                </TableCell>
                <TableCell
                  isHeader
                  className="px-2 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 w-20"
                >
                  Coordinates
                </TableCell>
                <TableCell
                  isHeader
                  className="px-2 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 w-20"
                >
                  Remarks
                </TableCell>
                <TableCell
                  isHeader
                  className="px-2 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 w-20"
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>

            {/* Table Body */}
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {data.map((project, index) => (
                <TableRow key={project._id}>
                  <TableCell className="px-2 pl-3 py-4 text-start w-12">
                    <span className="text-gray-800 text-theme-sm dark:text-white/90 font-medium">{index + 1}</span>
                  </TableCell>
                  <TableCell className="px-2 py-4 text-start w-32">
                    <div className="flex items-start gap-3">
                      <div>
                        <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90 leading-tight break-words">
                          {project.name}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-2 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400 w-20">
                    <span className="truncate block">{getClientName(project.client_id)}</span>
                  </TableCell>
                  <TableCell className="px-2 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400 w-20">
                    <span className="truncate block">{getPlantName(project.mother_plant_id)}</span>
                  </TableCell>
                  <TableCell className="px-2 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400 w-20">
                    <span className="truncate block">{project.address}</span>
                  </TableCell>
                  <TableCell className="px-2 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400 w-20">
                    <div className="flex flex-col">
                      <span className="font-medium truncate"> {project.contact_name}</span>
                      <span className="text-xs text-gray-400 truncate">{project.contact_number}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-2 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400 w-20">
                    {project.coordinates ? (
                      <div className="flex items-center gap-1">
                        <div className="group relative cursor-pointer" title={project.coordinates}>
                          <span className="group-hover:hidden truncate block">{truncateText(project.coordinates)}</span>
                          <span className="hidden group-hover:block absolute z-10 bg-gray-800 text-white p-2 rounded text-xs max-w-xs break-all">
                            {project.coordinates}
                          </span>
                        </div>
                        <button
                          onClick={() => handleCopyCoordinates(project.coordinates, project._id)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
                          title="Copy coordinates"
                        >
                          {copiedId === project._id ? (
                            <Check size={10} className="text-green-500" />
                          ) : (
                            <Copy size={10} />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">Not provided</span>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400 w-20">
                    {project.remarks ? (
                      <div className="group relative cursor-pointer" title={project.remarks}>
                        <span className="group-hover:hidden truncate block">{truncateText(project.remarks)}</span>
                        <span className="hidden group-hover:block absolute z-10 bg-gray-800 text-white p-2 rounded text-xs max-w-xs break-all">
                          {project.remarks}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">No remarks</span>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-4 w-20">
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="outline" onClick={() => onEdit(project)} className="px-2 py-1 text-xs">
                        <Edit size={10} />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDelete(project)}
                        className="px-2 py-1 text-xs"
                      >
                        <Trash size={10} />
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
