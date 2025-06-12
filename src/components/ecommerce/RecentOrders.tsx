import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import Badge from "../ui/badge/Badge";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Schedule {
  client: string;
  quantity: string;
  order_date: string;
  status: string;
}

interface RecentSchedulesProps {
  orders: Schedule[];
}

export default function RecentSchedules({ orders }: RecentSchedulesProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<"all" | "today" | "week" | "month">("all");

  const filterSchedules = (schedules: Schedule[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const week = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const month = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    return schedules
      .filter((order) => {
        const orderDate = new Date(order.order_date);
        switch (selectedDate) {
          case "today":
            return orderDate >= today;
          case "week":
            return orderDate >= week;
          case "month":
            return orderDate >= month;
          default:
            return true;
        }
      })
      .slice(0, 5);
  };

  const filteredOrders = filterSchedules(orders);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Recent Schedules</h3>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              setSelectedDate((curr) => {
                switch (curr) {
                  case "all":
                    return "today";
                  case "today":
                    return "week";
                  case "week":
                    return "month";
                  case "month":
                    return "all";
                }
              })
            }
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
          >
            {selectedDate === "all"
              ? "All Time"
              : selectedDate === "today"
              ? "Today"
              : selectedDate === "week"
              ? "This Week"
              : "This Month"}
          </button>
          <button
            onClick={() => router.push("/schedules")}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
          >
            See all
          </button>
        </div>
      </div>
      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
            <TableRow>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Client
              </TableCell>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Quantity
              </TableCell>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Schedule Date
              </TableCell>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Status
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredOrders.map((order, index) => (
              <TableRow key={index}>
                <TableCell className="py-3 text-gray-800 font-medium text-theme-sm dark:text-white/90">
                  {order.client}
                </TableCell>

                <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                  {order.quantity}
                </TableCell>

                <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                  {new Date(order.order_date).toLocaleDateString()}
                </TableCell>

                <TableCell className="py-3">
                  <Badge
                    size="sm"
                    color={
                      order.status === "Delivered"
                        ? "success"
                        : order.status === "Pending"
                        ? "warning"
                        : "error"
                    }
                  >
                    {order.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
