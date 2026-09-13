"use client";

import { toast } from "sonner";

import ToastMessage, { type ToastVariant } from "../patterns/toast-message";

type ShowToastOptions = {
  description?: string;
  duration?: number;
  id?: string | number;
};

const DEFAULT_TOAST_DURATION_MS = 4000;

const showToast = (
  variant: ToastVariant,
  title: string,
  options?: ShowToastOptions
) =>
  toast.custom(
    () => (
      <ToastMessage
        description={options?.description}
        title={title}
        variant={variant}
      />
    ),
    {
      duration: options?.duration ?? DEFAULT_TOAST_DURATION_MS,
      id: options?.id,
      unstyled: true
    }
  );

const showSuccessToast = (title: string, options?: ShowToastOptions) =>
  showToast("success", title, options);

const showErrorToast = (title: string, options?: ShowToastOptions) =>
  showToast("error", title, options);

export { showErrorToast, showSuccessToast, showToast };
export type { ShowToastOptions };
