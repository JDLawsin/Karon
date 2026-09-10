import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "../lib/cn";

const buttonVariants = cva(
  "inline-flex h-[var(--control-min-height)] min-h-[var(--control-min-height)] items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "border border-border bg-background hover:bg-muted",
        ghost: "hover:bg-muted"
      },
      size: {
        default: "",
        sm: "h-10 min-h-10 px-3",
        lg: "h-12 min-h-12 px-6"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

const Button = ({
  asChild = false,
  className,
  size,
  variant,
  ...props
}: ButtonProps) => {
  const Component = asChild ? Slot : "button";

  return (
    <Component
      className={cn(buttonVariants({ className, size, variant }))}
      {...props}
    />
  );
};

export { Button, buttonVariants };
export type { ButtonProps };
