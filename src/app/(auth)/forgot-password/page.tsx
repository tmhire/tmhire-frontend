import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot Password | TM Grid - Concrete Calculator",
  description: "Reset your password using OTP sent to your email",
};

export default function ForgotPassword() {
  return <ForgotPasswordForm />;
}

