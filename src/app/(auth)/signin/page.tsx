import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | TM Hire - Concrete Calculator",
  description: "Sign in to your TM Hire Concrete Calculator account to manage your concrete operations",
};

export default function SignIn() {
  return <SignInForm />;
}
