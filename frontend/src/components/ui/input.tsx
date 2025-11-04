import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const inputVariants = cva(
  "file:text-foreground placeholder:text-muted-foreground/70 selection:bg-primary selection:text-primary-foreground border-input flex w-full min-w-0 rounded-lg border border-border/50 bg-background shadow-sm transition-all duration-200 outline-none file:inline-flex file:border-0 file:bg-transparent file:font-medium disabled:pointer-events-none disabled:opacity-50 form-control focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:shadow-md focus-visible:bg-background hover:border-border hover:shadow-sm aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      size: {
        xs: "h-7 px-2 py-1 text-xs file:h-5 file:text-xs rounded-md",
        sm: "h-8 px-2.5 py-1.5 text-sm file:h-6 file:text-xs rounded-md",
        default: "h-10 px-3 py-2 text-sm file:h-7 file:text-sm rounded-lg",
        lg: "h-12 px-4 py-3 text-base file:h-8 file:text-sm rounded-lg",
        xl: "h-14 px-5 py-4 text-lg file:h-10 file:text-base rounded-xl",
      },
      variant: {
        default: "bg-background border-border/50",
        filled: "bg-muted/50 border-transparent hover:bg-muted/70 focus-visible:bg-background focus-visible:border-ring/50",
        ghost: "bg-transparent border-transparent hover:bg-muted/50 focus-visible:bg-background focus-visible:border-ring/50",
        flushed: "bg-transparent border-0 border-b-2 border-border rounded-none px-0 focus-visible:border-b-ring focus-visible:ring-0",
      }
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
);

export interface InputProps
  extends Omit<React.ComponentProps<"input">, "size">,
    VariantProps<typeof inputVariants> {}

function Input({ 
  className, 
  type, 
  size, 
  variant,
  ...props 
}: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(inputVariants({ size, variant, className }))}
      {...props}
    />
  );
}

export { Input };
