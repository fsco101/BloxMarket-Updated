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
          "border-transparent bg-blue-500 text-white hover:bg-blue-600 shadow-sm hover:shadow-md",
        secondary:
          "border-transparent bg-gray-800 text-gray-200 hover:bg-gray-700 shadow-sm hover:shadow-md dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600",
        destructive:
          "border-transparent bg-red-500 text-white hover:bg-red-600 shadow-sm hover:shadow-md focus-visible:ring-red-500/20",
        outline:
          "text-gray-200 border-gray-600 hover:bg-gray-700 hover:text-white dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700",
        success:
          "border-transparent bg-green-500 text-white hover:bg-green-600 shadow-sm hover:shadow-md",
        warning:
          "border-transparent bg-yellow-500 text-black hover:bg-yellow-600 shadow-sm hover:shadow-md",
        // Discord-inspired variants
        "discord-blurple": "border-transparent bg-blue-500 text-white hover:bg-blue-600 shadow-sm hover:shadow-md",
        "discord-green": "border-transparent bg-green-500 text-white hover:bg-green-600 shadow-sm hover:shadow-md",
        "discord-yellow": "border-transparent bg-yellow-500 text-black hover:bg-yellow-600 shadow-sm hover:shadow-md",
        "discord-red": "border-transparent bg-red-500 text-white hover:bg-red-600 shadow-sm hover:shadow-md",
        "discord-grey": "border-transparent bg-gray-800 text-gray-200 hover:bg-gray-700 shadow-sm hover:shadow-md dark:bg-gray-700 dark:hover:bg-gray-600",
        "discord-dark": "border-transparent bg-gray-900 text-gray-200 hover:bg-gray-800 shadow-sm hover:shadow-md",
        "discord-nitro": "border-transparent bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-sm hover:shadow-md",
        "discord-boost": "border-transparent bg-gradient-to-r from-pink-500 to-blue-500 text-white hover:from-pink-600 hover:to-blue-600 shadow-sm hover:shadow-md",
        // Bootstrap badge variants (enhanced for Discord theme)
        "badge-primary": "badge bg-blue-500 text-white rounded-md shadow-sm hover:shadow-md",
        "badge-secondary": "badge bg-gray-800 text-gray-200 rounded-md shadow-sm hover:shadow-md dark:bg-gray-700",
        "badge-success": "badge bg-green-500 text-white rounded-md shadow-sm hover:shadow-md",
        "badge-danger": "badge bg-red-500 text-white rounded-md shadow-sm hover:shadow-md",
        "badge-warning": "badge bg-yellow-500 text-black rounded-md shadow-sm hover:shadow-md",
        "badge-info": "badge bg-cyan-500 text-white rounded-md shadow-sm hover:shadow-md",
        "badge-light": "badge bg-gray-100 text-gray-800 rounded-md shadow-sm hover:shadow-md dark:bg-gray-700 dark:text-gray-200",
        "badge-dark": "badge bg-gray-900 text-gray-200 rounded-md shadow-sm hover:shadow-md",
        "badge-outline-primary": "badge border border-blue-500 text-blue-500 rounded-md hover:bg-blue-500 hover:text-white",
        "badge-outline-secondary": "badge border border-gray-600 text-gray-200 rounded-md hover:bg-gray-700 dark:border-gray-600",
        "badge-outline-success": "badge border border-green-500 text-green-500 rounded-md hover:bg-green-500 hover:text-white",
        "badge-outline-danger": "badge border border-red-500 text-red-500 rounded-md hover:bg-red-500 hover:text-white",
        "badge-outline-warning": "badge border border-yellow-500 text-yellow-500 rounded-md hover:bg-yellow-500 hover:text-black",
        "badge-outline-info": "badge border border-cyan-500 text-cyan-500 rounded-md hover:bg-cyan-500 hover:text-white",
        "badge-outline-light": "badge border border-gray-100 text-gray-100 rounded-md hover:bg-gray-100 hover:text-gray-800",
        "badge-outline-dark": "badge border border-gray-900 text-gray-200 rounded-md hover:bg-gray-900",
        "badge-pill": "badge badge-pill bg-blue-500 text-white rounded-full shadow-sm hover:shadow-md px-3",
        "badge-lg": "badge badge-lg bg-blue-500 text-white rounded-md shadow-sm hover:shadow-md px-3 py-1 text-sm",
        "badge-sm": "badge badge-sm bg-blue-500 text-white rounded-md shadow-sm hover:shadow-md px-1.5 py-0.5 text-xs",
        // Role-specific variants
        admin: "border-transparent bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-sm hover:shadow-md font-semibold",
        moderator: "border-transparent bg-gradient-to-r from-yellow-500 to-yellow-600 text-black hover:from-yellow-600 hover:to-yellow-700 shadow-sm hover:shadow-md font-semibold",
        user: "border-transparent bg-green-500 text-white hover:bg-green-600 shadow-sm hover:shadow-md",
        verified: "border-transparent bg-blue-500 text-white hover:bg-blue-600 shadow-sm hover:shadow-md",
        middleman: "border-transparent bg-gradient-to-r from-pink-500 to-pink-600 text-white hover:from-pink-600 hover:to-pink-700 shadow-sm hover:shadow-md font-semibold",
        banned: "border-transparent bg-red-500 text-white hover:bg-red-600 shadow-sm hover:shadow-md",
        pending: "border-transparent bg-yellow-500 text-black hover:bg-yellow-600 shadow-sm hover:shadow-md",
        active: "border-transparent bg-green-500 text-white hover:bg-green-600 shadow-sm hover:shadow-md",
        inactive: "border-transparent bg-gray-600 text-white hover:bg-gray-700 shadow-sm hover:shadow-md",
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
