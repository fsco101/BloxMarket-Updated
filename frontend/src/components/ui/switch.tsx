"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "./utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        // Track - enhanced size and animations
        "peer inline-flex h-7 w-12 shrink-0 items-center rounded-full border-2 outline-none group",
        "transition-all duration-300 ease-spring hover-lift click-scale",
        // Colors & state with enhanced gradients
        "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-success data-[state=checked]:to-emerald-500",
        "data-[state=checked]:border-success/50 data-[state=checked]:shadow-lg data-[state=checked]:shadow-success/25",
        "data-[state=unchecked]:bg-secondary dark:data-[state=unchecked]:bg-secondary/80",
        "data-[state=unchecked]:border-secondary/50 data-[state=unchecked]:hover:border-secondary/70",
        // Interactive states
        "hover:shadow-lg hover:scale-[1.02] active:scale-95",
        "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2",
        // Disabled state
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none disabled:hover:scale-100",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          // Enhanced thumb with animations
          "pointer-events-none block size-6 rounded-full ring-0 border transition-all duration-300 ease-spring",
          // Positioning with smooth animation
          "data-[state=checked]:translate-x-6 data-[state=unchecked]:translate-x-0",
          // Enhanced colors and effects
          "bg-white dark:bg-neutral-100 border-secondary/30",
          "data-[state=checked]:shadow-lg data-[state=checked]:shadow-success/30",
          "data-[state=unchecked]:shadow-md shadow-black/20",
          // Micro-interactions
          "group-hover:shadow-lg group-active:scale-90",
          // Add subtle glow effect when checked
          "data-[state=checked]:ring-2 data-[state=checked]:ring-white/30",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
