"use client";
import React from "react";
import { useReactTable, getCoreRowModel, createColumnHelper, flexRender } from "@tanstack/react-table";

export interface PlantRow {
  plant_name: string;
  pump_volume: number;
  pump_jobs: number[];
  supply_volume: number;
  supply_jobs: number[];
  tm_used: number;
  tm_used_total_hours: number;
  line_pump_used: number;
  line_pump_used_total_hours: number;
  boom_pump_used: number;
  boom_pump_used_total_hours: number;
  tm_active_but_not_used: number;
  line_pump_active_but_not_used: number;
  boom_pump_active_but_not_used: number;
}

export type PlantsTable = Record<string, PlantRow>;

function formatPercent(engagedHours: number, totalHours: number) {
  if (!totalHours || totalHours <= 0) return "0%";
  const pct = Math.round((engagedHours / totalHours) * 100);
  return `${pct}%`;
}

const columnHelper = createColumnHelper<PlantRow>();

export default function PlantsSummaryTable({ plantsTable }: { plantsTable: PlantsTable }) {
  const rows = Object.values(plantsTable || {});

  const totals = rows.reduce(
    (acc, r) => {
      acc.pump_volume += r.pump_volume || 0;
      acc.pump_jobs += r.pump_jobs?.length || 0;
      acc.supply_volume += r.supply_volume || 0;
      acc.supply_jobs += r.supply_jobs?.length || 0;
      acc.tm_used += r.tm_used || 0;
      acc.tm_hours += r.tm_used_total_hours || 0;
      acc.line_used += r.line_pump_used || 0;
      acc.line_hours += r.line_pump_used_total_hours || 0;
      acc.boom_used += r.boom_pump_used || 0;
      acc.boom_hours += r.boom_pump_used_total_hours || 0;
      return acc;
    },
    {
      pump_volume: 0,
      pump_jobs: 0,
      supply_volume: 0,
      supply_jobs: 0,
      tm_used: 0,
      tm_hours: 0,
      line_used: 0,
      line_hours: 0,
      boom_used: 0,
      boom_hours: 0,
    }
  );

  const columns = [
    columnHelper.group({
      id: "plant_name_group",
      header: "Plant Name",
      columns: [
        columnHelper.accessor("plant_name", {
          id: "plant_name",
          header: "",
          cell: (info) => <div className="font-medium text-gray-800 dark:text-white/90">{info.getValue()}</div>,
          footer: () => <div className="font-semibold text-gray-800 dark:text-white/90">Total</div>,
        }),
      ],
    }),
    columnHelper.group({
      id: "pumping",
      header: "Pumping",
      columns: [
        columnHelper.accessor("pump_volume", {
          header: "Vol (m³)",
          cell: (info) => <div className="text-center text-gray-500 dark:text-gray-400">{info.getValue()}</div>,
          footer: () => (
            <div className="text-center font-semibold text-gray-800 dark:text-white/90">{totals.pump_volume}</div>
          ),
        }),
        columnHelper.accessor("pump_jobs", {
          header: "Jobs",
          cell: (info) => (
            <div className="text-center text-gray-500 dark:text-gray-400">{info.getValue()?.length || 0}</div>
          ),
          footer: () => (
            <div className="text-center font-semibold text-gray-800 dark:text-white/90">{totals.pump_jobs}</div>
          ),
        }),
      ],
    }),
    columnHelper.group({
      id: "supply",
      header: "Supply",
      columns: [
        columnHelper.accessor("supply_volume", {
          header: "Vol (m³)",
          cell: (info) => <div className="text-center text-gray-500 dark:text-gray-400">{info.getValue()}</div>,
          footer: () => (
            <div className="text-center font-semibold text-gray-800 dark:text-white/90">{totals.supply_volume}</div>
          ),
        }),
        columnHelper.accessor("supply_jobs", {
          header: "Jobs",
          cell: (info) => (
            <div className="text-center text-gray-500 dark:text-gray-400">{info.getValue()?.length || 0}</div>
          ),
          footer: () => (
            <div className="text-center font-semibold text-gray-800 dark:text-white/90">{totals.supply_jobs}</div>
          ),
        }),
      ],
    }),
    columnHelper.group({
      id: "equipment_engagement",
      header: "Equipment Engagement",
      columns: [
        columnHelper.accessor((row) => ({ tm_used: row.tm_used, tm_hours: row.tm_used_total_hours }), {
          id: "tm_engagement",
          header: "TM (%)",
          cell: (info) => {
            const { tm_used, tm_hours } = info.getValue();
            return (
              <div className="text-center text-gray-500 dark:text-gray-400">
                {tm_used} ({formatPercent(tm_hours, 24)})
              </div>
            );
          },
          footer: () => (
            <div className="text-center font-semibold text-gray-800 dark:text-white/90">
              {totals.tm_used} ({formatPercent(totals.tm_hours, 24)})
            </div>
          ),
        }),
        columnHelper.accessor(
          (row) => ({ line_used: row.line_pump_used, line_hours: row.line_pump_used_total_hours }),
          {
            id: "line_engagement",
            header: "Line (%)",
            cell: (info) => {
              const { line_used, line_hours } = info.getValue();
              return (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  {line_used} ({formatPercent(line_hours, 24)})
                </div>
              );
            },
            footer: () => (
              <div className="text-center font-semibold text-gray-800 dark:text-white/90">
                {totals.line_used} ({formatPercent(totals.line_hours, 24)})
              </div>
            ),
          }
        ),
        columnHelper.accessor(
          (row) => ({ boom_used: row.boom_pump_used, boom_hours: row.boom_pump_used_total_hours }),
          {
            id: "boom_engagement",
            header: "Boom (%)",
            cell: (info) => {
              const { boom_used, boom_hours } = info.getValue();
              return (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  {boom_used} ({formatPercent(boom_hours, 24)})
                </div>
              );
            },
            footer: () => (
              <div className="text-center font-semibold text-gray-800 dark:text-white/90">
                {totals.boom_used} ({formatPercent(totals.boom_hours, 24)})
              </div>
            ),
          }
        ),
      ],
    }),
    columnHelper.group({
      id: "active_not_scheduled",
      header: "Active Not Scheduled",
      columns: [
        columnHelper.accessor("tm_active_but_not_used", {
          header: "TM",
          cell: (info) => <div className="text-center text-gray-500 dark:text-gray-400">{info.getValue()}</div>,
          footer: () => <div className="text-center font-semibold text-gray-800 dark:text-white/90">-</div>,
        }),
        columnHelper.accessor("line_pump_active_but_not_used", {
          header: "Line",
          cell: (info) => <div className="text-center text-gray-500 dark:text-gray-400">{info.getValue()}</div>,
          footer: () => <div className="text-center font-semibold text-gray-800 dark:text-white/90">-</div>,
        }),
        columnHelper.accessor("boom_pump_active_but_not_used", {
          header: "Boom",
          cell: (info) => <div className="text-center text-gray-500 dark:text-gray-400">{info.getValue()}</div>,
          footer: () => <div className="text-center font-semibold text-gray-800 dark:text-white/90">-</div>,
        }),
      ],
    }),
  ];

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Plant wise summary</h3>
      </div>
      <div className="max-w-full overflow-x-auto mb-4">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-gray-200 dark:border-gray-800">
                {headerGroup.headers.map((header) => {
                  const isGroupHeader = header.subHeaders && header.subHeaders.length > 0;
                  const isPlantName = header.id === "plant_name";
                  const isActiveGroup = header?.id === "active_not_scheduled";

                  return (
                    <th
                      key={header.id}
                      colSpan={header.colSpan}
                      className={`
                        py-3 px-4 font-medium text-theme-xs
                        ${
                          isGroupHeader
                            ? "text-gray-600 dark:text-gray-300 border-x border-gray-200 dark:border-gray-700"
                            : "text-gray-500 dark:text-gray-400"
                        }
                        ${!isGroupHeader && !isPlantName && !isActiveGroup ? "border-r border-gray-200 dark:border-gray-700" : ""}
                        ${isPlantName ? "text-left border-r border-gray-200 dark:border-gray-700" : "text-center"}
                        ${!isGroupHeader && !isPlantName ? "border-r border-gray-200 dark:border-gray-700" : ""}
                      `}
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell, index) => (
                  <td
                    key={cell.id}
                    className={`
                      py-3 px-4 text-theme-sm
                      ${
                        index === 0
                          ? "border-r border-gray-200 dark:border-gray-700"
                          : index < row.getVisibleCells().length - 1
                          ? "border-r border-gray-200 dark:border-gray-700"
                          : ""
                      }
                    `}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            {table.getFooterGroups().map((footerGroup) => {
              const allEmpty = footerGroup.headers.every(
                (header) => header.isPlaceholder || !header.column.columnDef.footer
              );
              if (allEmpty) return null;

              return (
                <tr
                  key={footerGroup.id}
                  className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-800"
                >
                  {footerGroup.headers.map((header, index) => (
                    <td
                      key={header.id}
                      className={`
              py-3 px-4 text-theme-sm
              ${
                index === 0
                  ? "border-r border-gray-200 dark:border-gray-700"
                  : index < footerGroup.headers.length - 1
                  ? "border-r border-gray-200 dark:border-gray-700"
                  : ""
              }
            `}
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.footer, header.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tfoot>
        </table>
      </div>
    </div>
  );
}
