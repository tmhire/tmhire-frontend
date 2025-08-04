import { Metadata } from "next";
import PlantsContainer from "./components/PlantsContainer";

export const metadata: Metadata = {
  title: "Plants | TM Grid - Concrete Calculator",
  description: "Manage your concrete plants, their locations, and production capabilities",
};

export default function PlantsPage() {

  return (
    <div>
      <PlantsContainer />
    </div>
  );
}
