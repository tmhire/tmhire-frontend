"use client";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { useSession } from "next-auth/react";
import { Building2, Users, ArrowLeft } from "lucide-react";
import { useApiClient } from "@/hooks/useApiClient";
import { validateCompanyName, validateCity } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

type RoleType = "company_admin" | "user" | null;

export default function WelcomeModal() {
  const { data: session, update } = useSession();
  const { fetchWithAuth } = useApiClient();
  const [isOpen, setIsOpen] = useState(true);
  const [selectedRole, setSelectedRole] = useState<RoleType>(null);
  const [isTimeFormatOpen, setIsTimeFormatOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [companyCodeError, setCompanyCodeError] = useState("");

  // Fetch all companies
  const { data: companiesData } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const response = await fetchWithAuth("/company");
      return response.json() as Promise<{ data: Array<{ company_code?: string }> }>;
    },
  });

  const [formData, setFormData] = useState<{
    company: string;
    contact: string;
    city: string;
    companyCode: string;
    globalFormat: "12h" | "24h";
    customStartHour: number;
  }>({
    company: "",
    contact: "",
    city: "",
    companyCode: "",
    globalFormat: "12h",
    customStartHour: 6,
  });

  const timeFormatOptions = [
    { label: "12-Hour Format", value: "12h" },
    { label: "24-Hour Format", value: "24h" },
  ];

  const floatToTimeString = (value: number) => {
    let hours = Math.floor(value);
    const minutes = Math.round((value - hours) * 60);
    const period = formData.globalFormat == "12h" ? (hours >= 12 ? " PM" : " AM") : "";
    if (formData.globalFormat === "12h") {
      hours = hours % 12;
      if (hours === 0) hours = 12;
    }
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}${period}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
  };

  const validateCompanyCode = (code: string): boolean => {
    if (!code) {
      setCompanyCodeError("Company code is required");
      return false;
    }

    // Get companies list from the query
    const companies = companiesData?.data || [];

    if (selectedRole === "company_admin") {
      // For admin, code must NOT exist
      const codeExists = companies.some(
        (company: { company_code?: string }) => company.company_code?.toLowerCase() === code.toLowerCase()
      );

      if (codeExists) {
        setCompanyCodeError("Company code already exists. Please choose a different code.");
        return false;
      }
    } else {
      // For user, code MUST exist (validation can be added if needed)
    }

    setCompanyCodeError("");
    return true;
  };

  const handleSubmit = async (): Promise<void> => {
    setError("");
    setIsSubmitting(true);

    try {
      // Validate company code
      if (selectedRole === "company_admin") {
        if (!formData.company || !formData.contact || !formData.city || !formData.companyCode) {
          setError("Please fill in all required fields");
          setIsSubmitting(false);
          return;
        }

        if (!validateCompanyName(formData.company)) {
          setError("Invalid company name format");
          setIsSubmitting(false);
          return;
        }

        if (!validateCity(formData.city)) {
          setError("Invalid city format");
          setIsSubmitting(false);
          return;
        }

        const isCodeValid = validateCompanyCode(formData.companyCode);
        if (!isCodeValid) {
          setIsSubmitting(false);
          return;
        }
      } else if (selectedRole === "user") {
        if (!formData.companyCode || !formData.contact) {
          setError("Please fill in all required fields");
          setIsSubmitting(false);
          return;
        }
      }

      // Prepare payload based on role
      let payload: Record<string, string | number | boolean>;
      if (selectedRole === "company_admin") {
        payload = {
          role: "company_admin",
          company_name: formData.company,
          contact: formData.contact,
          city: formData.city,
          preferred_format: formData.globalFormat,
          custom_start_hour: formData.customStartHour,
          company_code: formData.companyCode,
        };
      } else {
        payload = {
          role: "user",
          contact: formData.contact,
          company_code: formData.companyCode,
        };
      }

      const response = await fetchWithAuth("/auth/onboard", {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      if (!response) throw new Error("No response from server");
      const data = await response.json();

      if (data.success) {
        // Update session with new data
        await update({
          ...(session as unknown as Record<string, unknown>),
          new_user: false,
          company: data.data.company || formData.company,
          city: data.data.city || formData.city,
          contact: data.data.contact,
          role: data.data.role,
          sub_role: data.data.sub_role,
          status: data.data.status,
          company_id: data.data.company_id,
          preferred_format: formData.globalFormat,
          custom_start_hour: formData.customStartHour,
        });
        setIsOpen(false);
      } else {
        throw new Error(data.message || "Failed to complete onboarding");
      }
    } catch (error) {
      console.error("Error during onboarding:", error);
      setError(error instanceof Error ? error.message : "An error occurred during onboarding");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleSelect = (role: RoleType) => {
    setSelectedRole(role);
    setError("");
    setCompanyCodeError("");
    // Reset form data when switching roles
    setFormData({
      company: "",
      contact: "",
      city: "",
      companyCode: "",
      globalFormat: "12h",
      customStartHour: 6,
    });
  };

  const handleBack = () => {
    setSelectedRole(null);
    setError("");
    setCompanyCodeError("");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { }}
      className="max-w-[900px] m-4 overflow-y-visible"
      showCloseButton={false}
    >
      <div className="no-scrollbar relative w-full overflow-y-visible rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-6">
        <div className="px-2 mb-4">
          <h4 className="mb-2 text-xl font-semibold text-gray-800 dark:text-white/90">
            {selectedRole ? "Complete Your Profile" : "Welcome to TM Grid"}
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {selectedRole
              ? selectedRole === "company_admin"
                ? "Create your company account to get started."
                : "Join an existing company to collaborate."
              : "Choose how you'd like to get started."}
          </p>
        </div>

        {!selectedRole ? (
          // Role selection view
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-2">
            <button
              onClick={() => handleRoleSelect("company_admin")}
              className="group relative overflow-hidden rounded-2xl border-2 border-gray-200 dark:border-gray-800 p-8 text-left transition-all hover:border-brand-500 hover:shadow-lg dark:hover:border-brand-500"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-full bg-brand-50 dark:bg-brand-500/10 p-4">
                  <Building2 className="h-8 w-8 text-brand-500" />
                </div>
                <div className="text-center">
                  <h5 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-2">
                    Company Admin
                  </h5>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Create a new company account and manage your team
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => handleRoleSelect("user")}
              className="group relative overflow-hidden rounded-2xl border-2 border-gray-200 dark:border-gray-800 p-8 text-left transition-all hover:border-brand-500 hover:shadow-lg dark:hover:border-brand-500"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-full bg-brand-50 dark:bg-brand-500/10 p-4">
                  <Users className="h-8 w-8 text-brand-500" />
                </div>
                <div className="text-center">
                  <h5 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-2">
                    Company User
                  </h5>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Join an existing company with your company code
                  </p>
                </div>
              </div>
            </button>
          </div>
        ) : (
          // Form view based on selected role
          <form
            className="flex flex-col"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            <div className="px-2 mb-4">
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to role selection
              </button>
            </div>

            <div className="custom-scrollbar px-2">
              <div className="grid grid-cols-1 gap-y-5">
                {selectedRole === "company_admin" ? (
                  <>
                    <div className="flex flex-row gap-4">
                      <div className="w-1/2">
                        <Label>Company Name</Label>
                        <Input
                          type="text"
                          name="company"
                          value={formData.company}
                          onChange={handleChange}
                          maxLength={50}
                          placeholder="Enter company name"
                        />
                      </div>
                      <div className="w-1/2">
                        <Label>Company Code</Label>
                        <input
                          type="text"
                          name="companyCode"
                          value={formData.companyCode}
                          onChange={handleChange}
                          onBlur={() => formData.companyCode && validateCompanyCode(formData.companyCode)}
                          placeholder="Enter a unique company code"
                          required
                          className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
                        />
                        {companyCodeError && (
                          <p className="mt-1 text-sm text-red-500">{companyCodeError}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-row gap-4">

                      <div className="w-1/2">
                        <Label>Phone Number</Label>
                        <Input
                          type="tel"
                          name="contact"
                          value={formData.contact}
                          onChange={handleChange}
                          placeholder="Enter phone number"
                        />
                      </div>

                      <div className="w-1/2">
                        <Label>City</Label>
                        <Input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleChange}
                          maxLength={20}
                          placeholder="Enter city"
                        />
                      </div>
                    </div>

                    <div className="flex flex-row gap-4">
                      <div className="w-1/2">
                        <Label>Preferred Time Format</Label>
                        <button
                          type="button"
                          onClick={() => setIsTimeFormatOpen(!isTimeFormatOpen)}
                          className="w-full px-3 py-2 text-left border border-gray-200 dark:border-white/[0.05] rounded-lg bg-white dark:bg-white/[0.05] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        >
                          {formData.globalFormat === "24h" ? "24-Hour Format" : "12-Hour Format"}
                        </button>
                        {isTimeFormatOpen && (
                          <div className="absolute z-20 mt-1 w-sm bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-white/[0.05]">
                            {timeFormatOptions.map((option) => (
                              <div className="p-2 text-gray-800 dark:text-white/90" key={option.value}>
                                <button
                                  type="button"
                                  className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                  onClick={() => {
                                    setFormData((prev) => ({
                                      ...prev,
                                      globalFormat: option.value as "12h" | "24h",
                                    }));
                                    setIsTimeFormatOpen(false);
                                  }}
                                >
                                  {option.label}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="w-1/2">
                        <Label>Custom Start Time</Label>
                        <select
                          className="w-full px-2 py-2 border border-gray-200 dark:border-white/[0.05] rounded-lg bg-white dark:bg-white/[0.05] text-gray-900 dark:text-white"
                          value={formData.customStartHour}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              customStartHour: parseFloat(e.target.value),
                            }))
                          }
                        >
                          {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i} className="dark:bg-gray-800 dark:text-white">
                              {floatToTimeString(i)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-row gap-4">
                    <div className="w-1/2">
                      <Label>Phone Number</Label>
                      <Input
                        type="tel"
                        name="contact"
                        value={formData.contact}
                        onChange={handleChange}
                        placeholder="Enter phone number"
                      />
                    </div>
                    <div className="w-1/2">
                      <Label>Company Code</Label>
                      <Input
                        type="text"
                        name="companyCode"
                        value={formData.companyCode}
                        onChange={handleChange}
                        placeholder="Enter your company code"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Ask your company admin for the company code
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="px-2 mt-4">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 px-2 mt-6">
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isSubmitting || !!companyCodeError}
              >
                {isSubmitting ? "Submitting..." : "Get Started"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
