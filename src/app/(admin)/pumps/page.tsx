import { Metadata } from "next";
import PumpsContainer from "./components/PumpsContainer";

export const metadata: Metadata = {
  title: "Pumps | TMHire",
  description: "Manage your pumps inventory",
};

export default function PumpsPage() {
  return (
    <div>
      <PumpsContainer />
    </div>
  );
} 