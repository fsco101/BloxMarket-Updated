import * as React from "react";

import { cn } from "./utils";

function Card({ className, hover = true, variant = "default", glow = false, ...props }: React.ComponentProps<"div"> & { 
  hover?: boolean; 
  variant?: "default" | "glass" | "glassDark" | "neon" | "gradient" | "floating" | "morphing"; 
  glow?: boolean;
}) {
  const getVariantClasses = () => {
    switch (variant) {
      case "glass":
        return "bg-background/10 backdrop-blur-xl border border-border/20 text-foreground shadow-2xl";
      case "glassDark":
        return "bg-background/90 backdrop-blur-xl border border-border/20 text-foreground shadow-2xl";
      case "neon":
        return "bg-transparent border-2 border-primary text-primary shadow-lg shadow-primary/25 animate-pulse";
      case "gradient":
        return "bg-gradient-to-br from-primary via-accent to-secondary text-primary-foreground shadow-2xl";
      case "floating":
        return "bg-card text-card-foreground border border-border shadow-2xl animate-float";
      case "morphing":
        return "bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-2xl animate-morphing";
      default:
        return "bg-card text-card-foreground border border-border shadow-xl";
    }
  };

  return (
    <div
      data-slot="card"
      className={cn(
        "rounded-2xl transition-all duration-500 ease-out relative overflow-hidden",
        getVariantClasses(),
        hover && "hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.02] cursor-pointer",
        hover && variant === "default" && "hover:shadow-blue-500/20 hover:border-blue-500/40",
        hover && variant === "glass" && "hover:bg-white/20 hover:border-white/30",
        hover && variant === "glassDark" && "hover:bg-black/20 hover:border-black/30",
        hover && variant === "neon" && "hover:shadow-cyan-400/50 hover:border-cyan-300",
        hover && variant === "gradient" && "hover:shadow-purple-500/30",
        glow && "animate-pulse-glow",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "flex flex-col space-y-2 p-6 pb-4 relative",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "text-2xl font-semibold leading-none tracking-tight",
        className
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn(
        "text-sm text-muted-foreground",
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
        "p-6 pt-0",
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
        "flex items-center p-6 pt-0",
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
