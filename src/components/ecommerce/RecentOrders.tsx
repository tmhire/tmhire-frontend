import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import Badge from "../ui/badge/Badge";
import { useRouter } from "next/navigation";

interface Schedule {
  client: string;
  quantity: string;
  order_date: string;
  status: string;
}

interface RecentSchedulesProps {
  orders: Schedule[];
  selectedDate?: string;
}

export default function RecentSchedules({ orders, selectedDate: dashboardDate }: RecentSchedulesProps) {
  const router = useRouter();

  const filteredOrders = orders.slice(0, 5);


  const handleSeeAllClick = () => {
    if (dashboardDate) {
      // Convert YYYY-MM-DD to MM/DD/YYYY format for URL
      const dateParts = dashboardDate.split("-");
      if (dateParts.length === 3) {
        const formattedDate = `${dateParts[1]}/${dateParts[2]}/${dateParts[0]}`;
        router.push(`/pumping-schedules?date=${encodeURIComponent(formattedDate)}`);
      } else {
        router.push("/pumping-schedules");
      }
    } else {
      router.push("/pumping-schedules");
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Recent Schedules</h3>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSeeAllClick}
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
                Order Date
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
                    color={order.status === "generated" ? "success" : order.status === "draft" ? "warning" : "error"}
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
