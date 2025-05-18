import { format, parseISO, addMinutes } from "date-fns";

/**
 * Converts a UTC time string or date to Indian Standard Time (IST - UTC+5:30)
 * @param timestamp - UTC timestamp as string, Date, or number
 * @returns Date object in Indian timezone
 */
export const toIndianTime = (timestamp: string | Date | number): Date => {
  if (!timestamp) return new Date();
  
  // Create a Date object if it's a string or number
  const date = typeof timestamp === "string" ? parseISO(timestamp) : new Date(timestamp);
  
  // Add 5 hours and 30 minutes (330 minutes) for IST
  return addMinutes(date, 330);
};

/**
 * Formats a time value to 12-hour format (e.g., "10:30 AM")
 * First converts to Indian time if it's a UTC timestamp
 * @param timestamp - UTC timestamp as string, Date, or number
 * @returns Formatted time string
 */
export const formatTo12Hour = (timestamp: string | Date | number): string => {
  if (!timestamp) return "-";
  
  // Convert to Indian time
  const indianTime = toIndianTime(timestamp);
  
  // Format to 12-hour clock
  return indianTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Formats a time value to 24-hour format (e.g., "14:30")
 * First converts to Indian time if it's a UTC timestamp
 * @param timestamp - UTC timestamp as string, Date, or number
 * @returns Formatted time string
 */
export const formatTo24Hour = (timestamp: string | Date | number): string => {
  if (!timestamp) return "-";
  
  // Convert to Indian time
  const indianTime = toIndianTime(timestamp);
  
  // Format to 24-hour clock
  return indianTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

/**
 * Similar to toIndianTime but handles time-only strings like "14:30"
 * @param timeString - Either a full ISO date string or a time string like "14:30"
 * @returns Formatted time string
 */
export const convertTimeToIST = (timeString: string): string => {
  // If the timeString is already just a time portion (HH:MM), we assume it's already in the correct timezone
  if (timeString && timeString.includes("T")) {
    // This is a full ISO date string, convert from UTC to Indian time
    return formatTo24Hour(timeString);
  }
  // Return as is for simple time strings like "14:30"
  return timeString;
};

/**
 * Format a date with a standard format
 * @param date - Date to format
 * @param formatString - Format string (defaults to "MMM dd, yyyy HH:mm")
 * @returns Formatted date string
 */
export const formatDate = (
  date: Date | string | number,
  formatString: string = "MMM dd, yyyy HH:mm"
): string => {
  if (!date) return "-";
  
  const dateObj = typeof date === "string" ? parseISO(date) : new Date(date);
  return format(dateObj, formatString);
};

/**
 * Format a UTC date to IST with a standard format
 * @param utcDate - UTC date to format
 * @param formatString - Format string (defaults to "MMM dd, yyyy HH:mm")
 * @returns Formatted date string in IST
 */
export const formatUTCtoIST = (
  utcDate: string | Date | number,
  formatString: string = "MMM dd, yyyy HH:mm"
): string => {
  if (!utcDate) return "-";
  
  // Convert to IST first
  const istDate = toIndianTime(utcDate);
  return formatDate(istDate, formatString);
}; 