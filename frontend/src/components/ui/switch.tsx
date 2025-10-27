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
        "peer data-[state=checked]:bg-success data-[state=unchecked]:bg-secondary focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-secondary/80 inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-secondary/50 transition-all duration-300 outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 shadow-lg hover:shadow-xl",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "bg-white dark:bg-dark data-[state=unchecked]:bg-dark dark:data-[state=unchecked]:bg-light pointer-events-none block size-5 rounded-full ring-0 transition-all duration-300 data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0 shadow-md border border-secondary/30",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
