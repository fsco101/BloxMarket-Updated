import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current alert d-flex align-items-start",
  {
    variants: {
      variant: {
        default: "bg-light text-dark border-secondary alert-light shadow-sm",
        destructive:
          "text-danger bg-danger bg-opacity-10 border-danger alert-danger [&>svg]:text-danger",
        success: "text-success bg-success bg-opacity-10 border-success alert-success [&>svg]:text-success",
        warning: "text-warning bg-warning bg-opacity-10 border-warning alert-warning [&>svg]:text-warning",
        info: "text-info bg-info bg-opacity-10 border-info alert-info [&>svg]:text-info",
        primary: "text-primary bg-primary bg-opacity-10 border-primary alert-primary [&>svg]:text-primary",
        secondary: "text-secondary bg-secondary bg-opacity-10 border-secondary alert-secondary [&>svg]:text-secondary",
        light: "bg-light text-dark border-light alert-light",
        dark: "bg-dark text-light border-dark alert-dark [&>svg]:text-light",
        // Bootstrap dismissible variants
        "primary-dismissible": "alert alert-primary alert-dismissible fade show",
        "secondary-dismissible": "alert alert-secondary alert-dismissible fade show",
        "success-dismissible": "alert alert-success alert-dismissible fade show",
        "danger-dismissible": "alert alert-danger alert-dismissible fade show",
        "warning-dismissible": "alert alert-warning alert-dismissible fade show",
        "info-dismissible": "alert alert-info alert-dismissible fade show",
        "light-dismissible": "alert alert-light alert-dismissible fade show",
        "dark-dismissible": "alert alert-dark alert-dismissible fade show",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

function AlertDismissible({
  className,
  variant = "primary",
  children,
  onDismiss,
  ...props
}: React.ComponentProps<"div"> & {
  variant?: "primary" | "secondary" | "success" | "danger" | "warning" | "info" | "light" | "dark";
  onDismiss?: () => void;
}) {
  const dismissibleVariant = `${variant}-dismissible` as const;

  return (
    <div
      data-slot="alert-dismissible"
      role="alert"
      className={cn(alertVariants({ variant: dismissibleVariant }), className)}
      {...props}
    >
      {children}
      <button
        type="button"
        className="btn-close"
        aria-label="Close"
        onClick={onDismiss}
      />
    </div>
  );
}

export { Alert, AlertTitle, AlertDescription, AlertDismissible };
