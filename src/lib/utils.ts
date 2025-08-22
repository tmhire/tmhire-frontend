import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTimeByPreference(date: string | number | Date, preferredFormat = "12h") {
  if (!date) return "-";

  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";

  const is12h = preferredFormat === "12h";

  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: is12h,
  });
}

export const validateMobile = (value: string) => {
    return /^\d{10}$/.test(value);
};

export const validateName = (value: string) => {
    return /^[A-Za-z0-9 ]{1,25}$/.test(value.trim());
};
