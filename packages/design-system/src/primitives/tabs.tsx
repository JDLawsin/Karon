/* Hallmark · component: tabs · genre: modern-minimal · theme: Flat
 * states: default · hover · focus · active · disabled · loading · error · success
 * contrast: pass (active tab on paper)
 */
"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/cn";

const Tabs = ({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) => (
  <TabsPrimitive.Root
    className={cn(
      "group/tabs flex w-full min-w-0 flex-col gap-4",
      className
    )}
    data-orientation={orientation}
    data-slot="tabs"
    orientation={orientation}
    {...props}
  />
);

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit max-w-full min-w-0 flex-row flex-wrap items-center rounded-lg bg-muted p-1 text-muted-foreground",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 rounded-none bg-transparent p-0"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

const TabsList = ({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) => (
  <TabsPrimitive.List
    className={cn(tabsListVariants({ variant }), className)}
    data-slot="tabs-list"
    data-variant={variant}
    {...props}
  />
);

const TabsTrigger = ({
  className,
  ...props
}: TabsPrimitive.Tab.Props) => (
  <TabsPrimitive.Tab
    className={cn(
      "inline-flex h-(--control-min-height) shrink-0 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium whitespace-nowrap text-muted-foreground transition-[color,background-color] duration-(--motion-duration) hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-active:bg-background data-active:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
      className
    )}
    data-slot="tabs-trigger"
    {...props}
  />
);

const TabsContent = ({
  className,
  ...props
}: TabsPrimitive.Panel.Props) => (
  <TabsPrimitive.Panel
    className={cn("min-w-0 outline-none", className)}
    data-slot="tabs-content"
    {...props}
  />
);

export { Tabs, TabsContent, TabsList, TabsTrigger, tabsListVariants };
