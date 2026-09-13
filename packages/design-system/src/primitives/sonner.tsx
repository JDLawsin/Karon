/* Hallmark · component: sonner · genre: modern-minimal · theme: Flat
 * states: default · success · error
 * contrast: pass (toast on paper)
 */
"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

import { useTheme } from "../theme/theme-provider";

const Toaster = ({
  closeButton = true,
  expand = false,
  gap = 12,
  offset = 16,
  position = "top-right",
  richColors = false,
  toastOptions,
  ...props
}: ToasterProps) => {
  const { resolved } = useTheme();

  return (
    <Sonner
      className="toaster group"
      closeButton={closeButton}
      expand={expand}
      gap={gap}
      offset={offset}
      position={position}
      richColors={richColors}
      theme={resolved}
      toastOptions={{
        unstyled: true,
        ...toastOptions
      }}
      {...props}
    />
  );
};

export { Toaster };
