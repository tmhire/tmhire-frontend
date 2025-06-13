import type { Metadata } from "next";
import DashboardContainer from "./components/DashboardContainer";

export const metadata: Metadata = {
  title: "Dashboard | TM Hire - Concrete Calculator",
  description: "Monitor and manage your concrete operations with TM Hire's comprehensive dashboard",
};

export default function Ecommerce() {
  return <DashboardContainer />;
}
