"use client";

import * as React from "react";
import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const aspectRatioVariants = cva(
  "relative overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800",
  {
    variants: {
      variant: {
        default: "",
        card: "border border-gray-200 shadow-sm dark:border-gray-700",
        image: "bg-gray-50 dark:bg-gray-900",
        video: "bg-black",
        placeholder: "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 animate-pulse",
      },
      rounded: {
        none: "rounded-none",
        sm: "rounded-sm",
        md: "rounded-md",
        lg: "rounded-lg",
        xl: "rounded-xl",
        full: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      rounded: "lg",
    },
  }
);

type AspectRatioProps = React.ComponentProps<typeof AspectRatioPrimitive.Root> &
  VariantProps<typeof aspectRatioVariants> & {
    ratio?: number;
    className?: string;
  };

const aspectRatioPresets = {
  square: 1,
  "4/3": 4 / 3,
  "16/9": 16 / 9,
  "21/9": 21 / 9,
  portrait: 3 / 4,
  banner: 5 / 1,
} as const;

type AspectRatioPreset = keyof typeof aspectRatioPresets;

function AspectRatio({
  className,
  variant,
  rounded,
  ratio = 16 / 9,
  ...props
}: AspectRatioProps) {
  return (
    <AspectRatioPrimitive.Root
      data-slot="aspect-ratio"
      ratio={ratio}
      className={cn(aspectRatioVariants({ variant, rounded }), className)}
      {...props}
    />
  );
}

// Preset component for common aspect ratios
function AspectRatioPreset({
  preset,
  ...props
}: Omit<AspectRatioProps, 'ratio'> & { preset: AspectRatioPreset }) {
  return <AspectRatio ratio={aspectRatioPresets[preset]} {...props} />;
}

// Responsive aspect ratio component
function ResponsiveAspectRatio({
  ratios = { default: 16 / 9, sm: 4 / 3, md: 16 / 9, lg: 21 / 9 },
  ...props
}: Omit<AspectRatioProps, 'ratio'> & {
  ratios?: { default?: number; sm?: number; md?: number; lg?: number; xl?: number };
}) {
  const [currentRatio, setCurrentRatio] = React.useState(ratios.default || 16 / 9);

  React.useEffect(() => {
    const updateRatio = () => {
      const width = window.innerWidth;
      if (width >= 1280 && ratios.xl) setCurrentRatio(ratios.xl);
      else if (width >= 1024 && ratios.lg) setCurrentRatio(ratios.lg);
      else if (width >= 768 && ratios.md) setCurrentRatio(ratios.md);
      else if (width >= 640 && ratios.sm) setCurrentRatio(ratios.sm);
      else setCurrentRatio(ratios.default || 16 / 9);
    };

    updateRatio();
    window.addEventListener('resize', updateRatio);
    return () => window.removeEventListener('resize', updateRatio);
  }, [ratios]);

  return <AspectRatio ratio={currentRatio} {...props} />;
}

export { AspectRatio, AspectRatioPreset, ResponsiveAspectRatio, aspectRatioPresets };
