"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const avatarVariants = cva(
  "relative flex shrink-0 overflow-hidden rounded-full border-2 border-white shadow-sm",
  {
    variants: {
      size: {
        xs: "size-6",
        sm: "size-8",
        default: "size-10",
        lg: "size-12",
        xl: "size-16",
        "2xl": "size-20",
        "3xl": "size-24",
      },
      variant: {
        default: "border-white",
        primary: "border-primary",
        secondary: "border-secondary",
        success: "border-success",
        danger: "border-danger",
        warning: "border-warning",
        info: "border-info",
        light: "border-light",
        dark: "border-dark",
        outline: "border-gray-300 bg-white",
        solid: "border-transparent",
      },
      status: {
        none: "",
        online: "[&::after]:content-[''] [&::after]:absolute [&::after]:bottom-0 [&::after]:right-0 [&::after]:size-3 [&::after]:rounded-full [&::after]:bg-success [&::after]:border-2 [&::after]:border-white",
        offline: "[&::after]:content-[''] [&::after]:absolute [&::after]:bottom-0 [&::after]:right-0 [&::after]:size-3 [&::after]:rounded-full [&::after]:bg-gray-400 [&::after]:border-2 [&::after]:border-white",
        away: "[&::after]:content-[''] [&::after]:absolute [&::after]:bottom-0 [&::after]:right-0 [&::after]:size-3 [&::after]:rounded-full [&::after]:bg-warning [&::after]:border-2 [&::after]:border-white",
        busy: "[&::after]:content-[''] [&::after]:absolute [&::after]:bottom-0 [&::after]:right-0 [&::after]:size-3 [&::after]:rounded-full [&::after]:bg-danger [&::after]:border-2 [&::after]:border-white",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
      status: "none",
    },
  }
);

type AvatarProps = React.ComponentProps<typeof AvatarPrimitive.Root> &
  VariantProps<typeof avatarVariants> & {
    badge?: React.ReactNode;
    badgePosition?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  };

function Avatar({
  className,
  size,
  variant,
  status,
  badge,
  badgePosition = "top-right",
  ...props
}: AvatarProps) {
  const badgePositionClasses = {
    "top-right": "top-0 right-0",
    "top-left": "top-0 left-0",
    "bottom-right": "bottom-0 right-0",
    "bottom-left": "bottom-0 left-0",
  };

  return (
    <div className="relative inline-block">
      <AvatarPrimitive.Root
        data-slot="avatar"
        className={cn(avatarVariants({ size, variant, status }), className)}
        {...props}
      />
      {badge && (
        <div
          className={cn(
            "absolute z-10",
            badgePositionClasses[badgePosition]
          )}
        >
          {badge}
        </div>
      )}
    </div>
  );
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full object-cover", className)}
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-gray-100 text-gray-600 flex size-full items-center justify-center rounded-full font-medium text-sm",
        "dark:bg-gray-700 dark:text-gray-300",
        className,
      )}
      {...props}
    >
      {children}
    </AvatarPrimitive.Fallback>
  );
}

// Bootstrap-style Avatar Group Component
function AvatarGroup({
  children,
  max = 3,
  size = "default",
  className,
  ...props
}: {
  children: React.ReactNode;
  max?: number;
  size?: "xs" | "sm" | "default" | "lg" | "xl" | "2xl" | "3xl";
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  const avatars = React.Children.toArray(children);
  const visibleAvatars = avatars.slice(0, max);
  const remainingCount = avatars.length - max;

  return (
    <div
      className={cn("flex -space-x-2", className)}
      {...props}
    >
      {visibleAvatars.map((avatar, index) => (
        <div key={index} className="relative">
          <div className="ring-2 ring-white rounded-full">
            {avatar}
          </div>
        </div>
      ))}
      {remainingCount > 0 && (
        <Avatar size={size} className="ring-2 ring-white">
          <AvatarFallback className="bg-gray-500 text-white text-xs font-medium">
            +{remainingCount}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

// Status Indicator Component for standalone use
function AvatarStatus({
  status,
  size = "sm",
  className,
  ...props
}: {
  status: "online" | "offline" | "away" | "busy";
  size?: "xs" | "sm" | "default";
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  const statusColors = {
    online: "bg-success",
    offline: "bg-gray-400",
    away: "bg-warning",
    busy: "bg-danger",
  };

  const sizeClasses = {
    xs: "size-2",
    sm: "size-3",
    default: "size-4",
  };

  return (
    <div
      className={cn(
        "rounded-full border-2 border-white",
        statusColors[status],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback, AvatarGroup, AvatarStatus };
