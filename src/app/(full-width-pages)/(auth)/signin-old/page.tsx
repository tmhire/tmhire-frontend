import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Next.js SignIn Page | TM Grid - Next.js Dashboard Template",
  description: "This is Next.js Signin Page TM Grid Dashboard Template",
};

export default function SignIn() {
  return <SignInForm />;
}
