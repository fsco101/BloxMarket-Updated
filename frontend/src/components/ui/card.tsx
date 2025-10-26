import * as React from "react";

import { cn } from "./utils";

function Card({ className, hover = true, ...props }: React.ComponentProps<"div"> & { hover?: boolean }) {
  return (
    <div
      data-slot="card"
      className={cn(
        "card h-100 border-0 shadow-sm position-relative overflow-hidden",
        "bg-white bg-opacity-95 backdrop-blur-sm",
        "transition-all duration-300 ease-in-out",
        className,
      )}
      style={hover ? {
        transition: 'box-shadow 0.2s ease-in-out, transform 0.2s ease-in-out',
      } : undefined}
      onMouseEnter={(e) => {
        if (hover) {
          e.currentTarget.classList.remove('shadow-sm');
          e.currentTarget.classList.add('shadow');
        }
      }}
      onMouseLeave={(e) => {
        if (hover) {
          e.currentTarget.classList.remove('shadow');
          e.currentTarget.classList.add('shadow-sm');
        }
      }}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "card-header d-flex align-items-start justify-content-between gap-3 p-4 pb-3 bg-transparent border-0",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <h4
      data-slot="card-title"
      className={cn(
        "card-title h5 mb-0 fw-bold text-dark lh-base",
        "transition-colors duration-200",
        className
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <p
      data-slot="card-description"
      className={cn(
        "card-text text-muted small mb-0 lh-sm",
        className
      )}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "d-flex align-items-center gap-2",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn(
        "card-body p-4 pt-0",
        className
      )}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "card-footer d-flex align-items-center justify-content-between gap-3 p-4 pt-3 bg-light bg-opacity-50 border-0 rounded-bottom",
        className
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
