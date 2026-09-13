/* Hallmark · component: switch · genre: modern-minimal · theme: Flat
 * states: default · hover · focus · active · disabled · loading · error · success
 * contrast: pass (track vs thumb)
 */
"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";

import { cn } from "../lib/cn";

const Switch = ({
  className,
  ...props
}: SwitchPrimitive.Root.Props) => (
  <SwitchPrimitive.Root
    className={cn(
      "relative inline-flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition-[color,background-color,border-color] duration-(--motion-duration) after:absolute after:top-1/2 after:left-1/2 after:h-(--control-min-height) after:w-(--control-min-height) after:-translate-x-1/2 after:-translate-y-1/2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none data-checked:bg-primary data-disabled:cursor-not-allowed data-disabled:opacity-50 data-unchecked:bg-input",
      className
    )}
    data-slot="switch"
    {...props}
  >
    <SwitchPrimitive.Thumb
      className="pointer-events-none block size-6 rounded-full bg-background shadow-none transition-transform duration-(--motion-duration) data-checked:translate-x-6 data-unchecked:translate-x-0"
      data-slot="switch-thumb"
    />
  </SwitchPrimitive.Root>
);

export { Switch };
