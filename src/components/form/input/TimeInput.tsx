import React, { FC } from "react";
import TimePicker from "react-time-picker";
import "react-time-picker/dist/TimePicker.css";
import "react-clock/dist/Clock.css";

interface TimeInputProps {
  type?: "text" | "number" | "email" | "password" | "date" | "time" | string;
  id?: string;
  name?: string;
  placeholder?: string;
  defaultValue?: string | number;
  value?: string | number;
  onChange?: (value: string | null) => void;
  className?: string;
  min?: string;
  max?: string;
  format?: string;
  step?: number;
  isOpen?: boolean;
  disabled?: boolean;
  success?: boolean;
  error?: boolean;
  hint?: string;
}

const TimeInput: FC<TimeInputProps> = ({
  id,
  name,
  value,
  onChange,
  className = "",
  format,
  isOpen = false,
  disabled = false,
  success = false,
  error = false,
  hint,
}) => {
  // Determine container styles based on state
  const containerClasses = `relative ${className}`;
  
  // Determine picker wrapper styles
  const pickerWrapperClasses = `
    [&_.react-time-picker]:h-11 
    [&_.react-time-picker]:w-full 
    [&_.react-time-picker]:rounded-lg 
    [&_.react-time-picker]:border 
    [&_.react-time-picker]:px-4 
    [&_.react-time-picker]:py-2.5 
    [&_.react-time-picker]:text-sm 
    [&_.react-time-picker]:shadow-theme-xs
    [&_.react-time-picker__wrapper]:border-none
    [&_.react-time-picker__inputGroup]:gap-1
    [&_.react-time-picker__inputGroup__input]:border-none
    [&_.react-time-picker__inputGroup__input]:outline-none
    [&_.react-time-picker__inputGroup__input]:bg-transparent
    [&_.react-time-picker__inputGroup__input]:text-inherit
    [&_.react-time-picker__inputGroup__divider]:color-inherit
  `;

  // Add styles for the different states
  if (disabled) {
    pickerWrapperClasses += ` 
      [&_.react-time-picker]:text-gray-500 
      [&_.react-time-picker]:border-gray-300 
      [&_.react-time-picker]:cursor-not-allowed 
      [&_.react-time-picker]:bg-gray-50
      dark:[&_.react-time-picker]:bg-gray-800 
      dark:[&_.react-time-picker]:text-gray-400 
      dark:[&_.react-time-picker]:border-gray-700
    `;
  } else if (error) {
    pickerWrapperClasses += ` 
      [&_.react-time-picker]:text-error-800 
      [&_.react-time-picker]:border-error-500 
      [&_.react-time-picker]:focus-within:ring-3 
      [&_.react-time-picker]:focus-within:ring-error-500/10
      dark:[&_.react-time-picker]:text-error-400 
      dark:[&_.react-time-picker]:border-error-500
    `;
  } else if (success) {
    pickerWrapperClasses += ` 
      [&_.react-time-picker]:text-success-500 
      [&_.react-time-picker]:border-success-400 
      [&_.react-time-picker]:focus-within:ring-success-500/10 
      [&_.react-time-picker]:focus-within:border-success-300
      dark:[&_.react-time-picker]:text-success-400 
      dark:[&_.react-time-picker]:border-success-500
    `;
  } else {
    pickerWrapperClasses += ` 
      [&_.react-time-picker]:bg-transparent 
      [&_.react-time-picker]:text-gray-800 
      [&_.react-time-picker]:border-gray-300 
      [&_.react-time-picker]:focus-within:border-brand-300 
      [&_.react-time-picker]:focus-within:ring-3 
      [&_.react-time-picker]:focus-within:ring-brand-500/10
      dark:[&_.react-time-picker]:border-gray-700 
      dark:[&_.react-time-picker]:bg-gray-900 
      dark:[&_.react-time-picker]:text-white/90 
      dark:[&_.react-time-picker]:focus-within:border-brand-800
    `;
  }

  // Fix the format - use HH:mm for 24-hour format
  const timeFormat = format === "hh:mm" ? "HH:mm" : format;

  // Ensure value is in correct format for TimePicker
  const timeValue = value ? String(value) : null;

  return (
    <div className={containerClasses}>
      <div className={pickerWrapperClasses}>
        <TimePicker
          id={id}
          name={name}
          disableClock
          isOpen={isOpen}
          format={timeFormat}
          value={timeValue}
          onChange={onChange}
          clearIcon={null}
          disabled={disabled}
          // Add these props to help with stability
          clockIcon={null}
          locale="en-US"
        />
      </div>

      {/* Optional Hint Text */}
      {hint && (
        <p className={`mt-1.5 text-xs ${
          error ? "text-error-500" : 
          success ? "text-success-500" : 
          "text-gray-500"
        }`}>
          {hint}
        </p>
      )}
    </div>
  );
};

export default TimeInput;