import { Metadata } from "next";
import TeamContainer from "./components/TeamContainer";

export const metadata: Metadata = {
  title: "Team | TM Grid - Concrete Calculator",
  description: "Manage your concrete team members and their roles",
};

export default function TeamPage() {
  return (
    <div>
      <TeamContainer />
    </div>
  );
}
