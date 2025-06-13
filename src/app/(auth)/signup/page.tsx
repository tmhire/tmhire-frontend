import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up | TM Hire - Concrete Calculator",
  description: "Create your TM Hire Concrete Calculator account to start managing your concrete operations",
};

export default function SignUp() {
  return <SignUpForm />;
}
