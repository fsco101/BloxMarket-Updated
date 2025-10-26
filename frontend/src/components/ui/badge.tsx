import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1.5 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-all duration-200 overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#5865f2] text-white hover:bg-[#4752c4] shadow-sm hover:shadow-md",
        secondary:
          "border-transparent bg-[#2c2f33] text-[#dcddde] hover:bg-[#36393f] shadow-sm hover:shadow-md dark:bg-[#36393f] dark:text-[#dcddde] dark:hover:bg-[#40444b]",
        destructive:
          "border-transparent bg-[#ed4245] text-white hover:bg-[#c03537] shadow-sm hover:shadow-md focus-visible:ring-red-500/20",
        outline:
          "text-[#dcddde] border-[#202225] hover:bg-[#36393f] hover:text-white dark:border-[#202225] dark:text-[#dcddde] dark:hover:bg-[#36393f]",
        success:
          "border-transparent bg-[#57f287] text-[#0f0f0f] hover:bg-[#4ad482] shadow-sm hover:shadow-md",
        warning:
          "border-transparent bg-[#fee75c] text-[#0f0f0f] hover:bg-[#fcd34d] shadow-sm hover:shadow-md",
        // Discord-inspired variants
        "discord-blurple": "border-transparent bg-[#5865f2] text-white hover:bg-[#4752c4] shadow-sm hover:shadow-md",
        "discord-green": "border-transparent bg-[#57f287] text-[#0f0f0f] hover:bg-[#4ad482] shadow-sm hover:shadow-md",
        "discord-yellow": "border-transparent bg-[#fee75c] text-[#0f0f0f] hover:bg-[#fcd34d] shadow-sm hover:shadow-md",
        "discord-red": "border-transparent bg-[#ed4245] text-white hover:bg-[#c03537] shadow-sm hover:shadow-md",
        "discord-grey": "border-transparent bg-[#2c2f33] text-[#dcddde] hover:bg-[#36393f] shadow-sm hover:shadow-md dark:bg-[#36393f] dark:hover:bg-[#40444b]",
        "discord-dark": "border-transparent bg-[#202225] text-[#dcddde] hover:bg-[#2c2f33] shadow-sm hover:shadow-md",
        "discord-nitro": "border-transparent bg-gradient-to-r from-[#5865f2] to-[#7289da] text-white hover:from-[#4752c4] hover:to-[#5b6eae] shadow-sm hover:shadow-md",
        "discord-boost": "border-transparent bg-gradient-to-r from-[#ff73fa] to-[#5865f2] text-white hover:from-[#e66ce0] hover:to-[#4752c4] shadow-sm hover:shadow-md",
        // Bootstrap badge variants (enhanced for Discord theme)
        "badge-primary": "badge bg-[#5865f2] text-white rounded-md shadow-sm hover:shadow-md",
        "badge-secondary": "badge bg-[#2c2f33] text-[#dcddde] rounded-md shadow-sm hover:shadow-md dark:bg-[#36393f]",
        "badge-success": "badge bg-[#57f287] text-[#0f0f0f] rounded-md shadow-sm hover:shadow-md",
        "badge-danger": "badge bg-[#ed4245] text-white rounded-md shadow-sm hover:shadow-md",
        "badge-warning": "badge bg-[#fee75c] text-[#0f0f0f] rounded-md shadow-sm hover:shadow-md",
        "badge-info": "badge bg-[#00b8d4] text-white rounded-md shadow-sm hover:shadow-md",
        "badge-light": "badge bg-[#f8f9fa] text-[#2c2f33] rounded-md shadow-sm hover:shadow-md dark:bg-[#36393f] dark:text-[#dcddde]",
        "badge-dark": "badge bg-[#202225] text-[#dcddde] rounded-md shadow-sm hover:shadow-md",
        "badge-outline-primary": "badge border border-[#5865f2] text-[#5865f2] rounded-md hover:bg-[#5865f2] hover:text-white",
        "badge-outline-secondary": "badge border border-[#2c2f33] text-[#dcddde] rounded-md hover:bg-[#36393f] dark:border-[#36393f]",
        "badge-outline-success": "badge border border-[#57f287] text-[#57f287] rounded-md hover:bg-[#57f287] hover:text-[#0f0f0f]",
        "badge-outline-danger": "badge border border-[#ed4245] text-[#ed4245] rounded-md hover:bg-[#ed4245] hover:text-white",
        "badge-outline-warning": "badge border border-[#fee75c] text-[#fee75c] rounded-md hover:bg-[#fee75c] hover:text-[#0f0f0f]",
        "badge-outline-info": "badge border border-[#00b8d4] text-[#00b8d4] rounded-md hover:bg-[#00b8d4] hover:text-white",
        "badge-outline-light": "badge border border-[#f8f9fa] text-[#f8f9fa] rounded-md hover:bg-[#f8f9fa] hover:text-[#2c2f33]",
        "badge-outline-dark": "badge border border-[#202225] text-[#dcddde] rounded-md hover:bg-[#202225]",
        "badge-pill": "badge badge-pill bg-[#5865f2] text-white rounded-full shadow-sm hover:shadow-md px-3",
        "badge-lg": "badge badge-lg bg-[#5865f2] text-white rounded-md shadow-sm hover:shadow-md px-3 py-1 text-sm",
        "badge-sm": "badge badge-sm bg-[#5865f2] text-white rounded-md shadow-sm hover:shadow-md px-1.5 py-0.5 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
