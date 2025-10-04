"use client";

import { Toaster } from "react-hot-toast";

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      containerClassName=""
      containerStyle={{}}
      toastOptions={{
        // Default options for all toasts
        duration: 4000,
        style: {
          background: "var(--toast-bg, #fff)",
          color: "var(--toast-color, #333)",
          borderRadius: "8px",
          border: "1px solid var(--toast-border, #e5e7eb)",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          fontSize: "14px",
          fontWeight: "500",
          padding: "12px 16px",
        },
        // Success toast styling
        success: {
          style: {
            background: "#f0fdf4",
            color: "#166534",
            border: "1px solid #bbf7d0",
          },
          iconTheme: {
            primary: "#22c55e",
            secondary: "#f0fdf4",
          },
        },
        // Error toast styling
        error: {
          style: {
            background: "#fef2f2",
            color: "#dc2626",
            border: "1px solid #fecaca",
          },
          iconTheme: {
            primary: "#ef4444",
            secondary: "#fef2f2",
          },
        },
        // Loading toast styling
        loading: {
          style: {
            background: "#f8fafc",
            color: "#475569",
            border: "1px solid #e2e8f0",
          },
        },
      }}
    />
  );
}
