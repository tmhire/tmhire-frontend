"use client";

import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import React, { useMemo } from "react";
import Button from "@/components/ui/button/Button";
import { Edit, Trash } from "lucide-react";
import { useCreatorLookup } from "@/hooks/useCompany";

interface Client {
  _id: string;
  user_id: string;
  name: string;
  legal_entity: string | null;
  created_at: string;
  last_updated: string;
  created_by?: string;
  created_by_name?: string;
  company_id?: string;
}

interface ClientsTableProps {
  data: Client[];
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
  isViewer?: boolean;
}

export default function ClientsTable({ data, onEdit, onDelete, isViewer = false }: ClientsTableProps) {
  const { creatorLookup } = useCreatorLookup();

  const getCreator = useMemo(() => {
    return (userId?: string) => {
      if (!userId || !creatorLookup) return null;
      return creatorLookup.get(userId) || null;
    };
  }, [creatorLookup]);

  const renderCreatorCell = (userId?: string) => {
    const creator = getCreator(userId);
    if (!creator) {
      return <span className="text-xs text-gray-400 dark:text-gray-500">-</span>;
    }

    const roleLabel = [creator.role, creator.sub_role].filter(Boolean).join(" • ");

    return (
      <div className="flex flex-col">
        <span className="font-medium text-gray-800 dark:text-white/90">{creator.name || "Unknown"}</span>
        {roleLabel && (
          <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
            {roleLabel.replace(/_/g, " ")}
          </span>
        )}
      </div>
    );
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
                  Legal Entity
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Created By
                </TableCell>
                {!isViewer && (
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Actions
                  </TableCell>
                )}
              </TableRow>
            </TableHeader>

            {/* Table Body */}
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {data.map((client) => (
                <TableRow key={client._id}>
                  <TableCell className="px-5 py-4 text-start">
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                          {client.name}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {client.legal_entity || "N/A"}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {renderCreatorCell(client.created_by)}
                  </TableCell>
                  {!isViewer && (
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => onEdit(client)}>
                          <Edit size={"12px"} />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => onDelete(client)}>
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