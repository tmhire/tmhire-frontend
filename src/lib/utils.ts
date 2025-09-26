import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

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

export function formatHoursAndMinutes(decimalHours: number): string {
  if (isNaN(decimalHours) || decimalHours < 0) return "0 mins";

  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);

  if (decimalHours < 1) {
    return `${Math.round(decimalHours * 60)} mins`;
  } else if (minutes === 0) {
    return `${hours} hrs`;
  } else {
    return `${hours} hrs ${minutes} mins`;
  }
}


export const validateMobile = (value: string) => {
  return /^\d{10}$/.test(value);
};

export const validateName = (value: string) => {
  return /^[A-Za-z0-9 ]{1,25}$/.test(value.trim());
};

export const validateProfileName = (value: string) => {
  return /^[A-Za-z0-9 ]{1,30}$/.test(value.trim());
};

export const validateCity = (value: string) => {
  return /^[A-Za-z0-9 ]{1,20}$/.test(value.trim());
};

export const validateCompanyName = (value: string) => {
  return /^[A-Za-z0-9 ]{1,50}$/.test(value.trim());
};

export const validateAddress = (value: string) => {
  return value.trim().length <= 60;
};

export const validateCoordinates = (value: string) => {
  return value.trim().length <= 60;
};
