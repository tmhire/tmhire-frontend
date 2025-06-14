"use client";

import { useEffect, useRef } from 'react';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
import { Instance as FlatpickrInstance } from 'flatpickr/dist/types/instance';

interface DatePickerInputProps {
  value?: string;
  onChange: (date: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export default function DatePickerInput({
  value,
  onChange,
  disabled = false,
  placeholder = "Select date",
  className = "",
}: DatePickerInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const flatpickrRef = useRef<FlatpickrInstance | null>(null);

  useEffect(() => {
    if (inputRef.current) {
      flatpickrRef.current = flatpickr(inputRef.current, {
        dateFormat: 'Y-m-d',
        defaultDate: value,
        onChange: ([selectedDate]) => {
          if (selectedDate) {
            // Use local date string to avoid timezone issues
            const year = selectedDate.getFullYear();
            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const day = String(selectedDate.getDate()).padStart(2, '0');
            onChange(`${year}-${month}-${day}`);
          }
        },
        onClose: () => {
          if (!inputRef.current?.value) {
            onChange('');
          }
        }
      });
    }

    return () => {
      if (flatpickrRef.current) {
        flatpickrRef.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (flatpickrRef.current && value) {
      flatpickrRef.current.setDate(value);
    }
  }, [value]);

  return (
    <input
      ref={inputRef}
      type="text"
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full rounded-lg border border-gray-200 bg-transparent p-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 ${className}`}
    />
  );
}
