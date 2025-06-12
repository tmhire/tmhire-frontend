import type { Metadata } from "next";
import DashboardContainer from "./components/DashboardContainer";

export const metadata: Metadata = {
  title: "TM Hire",
  description: "This is Dashboard for TM Hire",
};

export default function Ecommerce() {
  return <DashboardContainer />;
}
