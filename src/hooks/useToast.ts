import toast from "react-hot-toast";

export interface ToastOptions {
  duration?: number;
  position?: "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";
}

export const useToast = () => {
  const showSuccess = (message: string, options?: ToastOptions) => {
    return toast.success(message, {
      duration: options?.duration || 4000,
      position: options?.position || "top-right",
    });
  };

  const showError = (message: string, options?: ToastOptions) => {
    return toast.error(message, {
      duration: options?.duration || 5000,
      position: options?.position || "top-right",
    });
  };

  const showLoading = (message: string, options?: ToastOptions) => {
    return toast.loading(message, {
      duration: options?.duration || Infinity,
      position: options?.position || "top-right",
    });
  };

  const showInfo = (message: string, options?: ToastOptions) => {
    return toast(message, {
      duration: options?.duration || 4000,
      position: options?.position || "top-right",
      style: {
        background: "#f0f9ff",
        color: "#0369a1",
        border: "1px solid #bae6fd",
      },
      icon: "ℹ️",
    });
  };

  const dismiss = (toastId?: string) => {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  };

  const updateToast = (toastId: string, message: string, type: "success" | "error" | "loading" | "info" = "success") => {
    const toastOptions = {
      duration: type === "error" ? 5000 : 4000,
      position: "top-right" as const,
    };

    switch (type) {
      case "success":
        return toast.success(message, { id: toastId, ...toastOptions });
      case "error":
        return toast.error(message, { id: toastId, ...toastOptions });
      case "loading":
        return toast.loading(message, { id: toastId, ...toastOptions });
      case "info":
        return toast(message, { 
          id: toastId, 
          ...toastOptions,
          style: {
            background: "#f0f9ff",
            color: "#0369a1",
            border: "1px solid #bae6fd",
          },
          icon: "ℹ️",
        });
      default:
        return toast.success(message, { id: toastId, ...toastOptions });
    }
  };

  return {
    showSuccess,
    showError,
    showLoading,
    showInfo,
    dismiss,
    updateToast,
  };
};

// Helper function for API action toasts
export const createApiActionToast = () => {
  const { showLoading, updateToast } = useToast();

  const startAction = (message: string) => {
    return showLoading(message);
  };

  const completeAction = (toastId: string, message: string, isSuccess: boolean = true) => {
    updateToast(toastId, message, isSuccess ? "success" : "error");
  };

  return {
    startAction,
    completeAction,
  };
};
