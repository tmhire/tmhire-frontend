import { Metadata } from "next";
import TransitMixersContainer from "./components/TransitMixersContainer";

export const metadata: Metadata = {
  title: "Transit Mixers",
  description: "Manage your transit mixers inventory",
};

export default function TransitMixersPage() {
  return (
    <div>
      <TransitMixersContainer />
    </div>
  );
} 