"use client";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { useSession } from "next-auth/react";
import { Factory, Truck, Users, Wrench, Calendar } from "lucide-react";
import { useApiClient } from "@/hooks/useApiClient";

// interface SessionUser {
//   id?: string;
//   name?: string | null;
//   email?: string | null;
//   image?: string | null;
//   new_user?: boolean;
//   company?: string;
//   city?: string;
//   contact?: number;
// }

export default function WelcomeModal() {
  const { data: session, update } = useSession();
  const { fetchWithAuth } = useApiClient();
  const [isOpen, setIsOpen] = useState(true);
  const [isTimeFormatOpen, setIsTimeFormatOpen] = useState(false);
  const [formData, setFormData] = useState<{
    company: "";
    contact: "";
    city: "";
    globalFormat: "12h" | "24h";
    customStartHour: number;
  }>({
    company: "",
    contact: "",
    city: "",
    globalFormat: "12h",
    customStartHour: 6,
  });

  // Handle session loading state
  // useEffect(() => {
  //   if (status === "loading") {
  //     setIsOpen(false);
  //   } else if (status === "authenticated" && (session?.user as SessionUser)?.new_user) {
  //     setIsOpen(true);
  //   } else {
  //     setIsOpen(false);
  //   }
  // }, [status, session]);

  const steps = [
    {
      title: "Create Plants",
      description: "Set up your concrete plants and their details",
      icon: Factory,
    },
    {
      title: "Add TMs",
      description: "Add your transport mixers to the system",
      icon: Truck,
    },
    {
      title: "Add Clients",
      description: "Input your client information",
      icon: Users,
    },
    {
      title: "Add Pumps",
      description: "Configure your concrete pumps",
      icon: Wrench,
    },
    {
      title: "Start Scheduling",
      description: "Use the Gantt chart in calendar section",
      icon: Calendar,
    },
  ];

  const timeFormatOptions = [
    { label: "12-Hour Format", value: "12h" },
    { label: "24-Hour Format", value: "24h" },
  ];

  const floatToTimeString = (value: number) => {
    let hours = Math.floor(value); // whole hours
    const minutes = Math.round((value - hours) * 60); // remaining minutes
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
  };
  const handleSubmit = async (): Promise<void> => {
    if (!formData.company || !formData.contact || !formData.city) {
      return; // Don&apos;t submit if required fields are empty
    }

    try {
      const response = await fetchWithAuth("/auth/update", {
        method: "PUT",
        body: JSON.stringify({
          ...formData,
          contact: parseInt(formData.contact),
        }),
      });

      if (!response) throw new Error("No response from server");
      const data = await response.json();

      if (data.success) {
        await update({
          ...(session as unknown as Record<string, unknown>),
          user: {
            ...session?.user,
            new_user: false,
            company: formData.company,
            city: formData.city,
            contact: parseInt(formData.contact),
            globalFormat: formData.globalFormat,
          },
        });
        setIsOpen(false);
      } else {
        throw new Error(data.message || "Failed to update user information");
      }
    } catch (error) {
      console.error("Error updating user info:", error);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} // Disable closing
      className="max-w-[1000px] m-4"
    >
      <div className="no-scrollbar relative w-full overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
        <div className="px-2 mb-8">
          <h4 className="mb-2 text-xl font-semibold text-gray-800 dark:text-white/90">
            Welcome to TM Grid&apos;s Concrete Calculator
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Let&apos;s get you started by setting up your company information.
          </p>
        </div>

        <form
          className="flex flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Company Information Column */}
            <div className="custom-scrollbar px-2">
              <div className="grid grid-cols-1 gap-y-5">
                <div>
                  <Label>Company Name</Label>
                  <Input type="text" name="company" value={formData.company} onChange={handleChange} />
                </div>

                <div>
                  <Label>Phone Number</Label>
                  <Input type="tel" name="contact" value={formData.contact} onChange={handleChange} />
                </div>

                <div>
                  <Label>City</Label>
                  <Input type="text" name="city" value={formData.city} onChange={handleChange} />
                </div>

                <div>
                  <Label>Preferred Format</Label>
                  <button
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
                            className="w-full px-4 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            name="globalFormat"
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

                <div>
                  <Label>Custom Time</Label>
                  <select
                    className="w-full px-2 py-1 border border-gray-200 dark:border-white/[0.05] rounded-lg bg-white dark:bg-white/[0.05] text-gray-900 dark:text-white"
                    value={formData.customStartHour}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        customStartHour: parseFloat(e.target.value),
                      }))
                    }
                  >
                    {Array.from({ length: 48 }, (_, i) => (
                      <option key={i} value={i / 2}>
                        {floatToTimeString(i / 2)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Getting Started Guide Column */}
            <div className="px-2">
              <h5 className="mb-4 text-base font-medium text-gray-800 dark:text-white/90">Getting Started Guide</h5>
              <div className="grid grid-cols-2 gap-3">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div
                      key={index}
                      className={`flex items-start gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-800 ${
                        index === steps.length - 1 ? "col-span-2" : ""
                      }`}
                    >
                      <Icon className="w-4 h-4 mt-0.5 text-brand-500" />
                      <div>
                        <h6 className="text-sm font-medium text-gray-800 dark:text-white/90">{step.title}</h6>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{step.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-2 mt-6">
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!formData.company || !formData.contact || !formData.city}
            >
              Get Started
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
