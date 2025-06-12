import { Metadata } from "next";
import PlantsContainer from "./components/PlantsContainer";

export const metadata: Metadata = {
  title: "Plants | TMHire",
  description: "Manage your plants inventory",
};

export default function PlantsPage() {

  return (
    <div>
      <PlantsContainer />
    </div>
  );
}
