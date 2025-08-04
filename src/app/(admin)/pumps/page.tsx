import { Metadata } from "next";
import PumpsContainer from "./components/PumpsContainer";

export const metadata: Metadata = {
  title: "Pumps | TM Grid - Concrete Calculator",
  description: "Manage your concrete pumps, their specifications, and availability",
};

export default function PumpsPage() {
  return (
    <div>
      <PumpsContainer />
    </div>
  );
} 