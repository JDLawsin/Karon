"use client";

import * as AvatarPrimitive from "@radix-ui/react-avatar";
import type { ComponentProps } from "react";

import { cn } from "../lib/cn";

const Avatar = ({
  className,
  ...props
}: ComponentProps<typeof AvatarPrimitive.Root>) => (
  <AvatarPrimitive.Root
    className={cn(
      "relative flex size-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
);

const AvatarImage = ({
  className,
  ...props
}: ComponentProps<typeof AvatarPrimitive.Image>) => (
  <AvatarPrimitive.Image
    className={cn("aspect-square size-full", className)}
    {...props}
  />
);

const AvatarFallback = ({
  className,
  ...props
}: ComponentProps<typeof AvatarPrimitive.Fallback>) => (
  <AvatarPrimitive.Fallback
    className={cn(
      "flex size-full items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground",
      className
    )}
    {...props}
  />
);

export { Avatar, AvatarFallback, AvatarImage };
