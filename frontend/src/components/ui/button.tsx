import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

/*
  Add these CSS animations to your global styles (index.css or globals.css):
  
  @keyframes ripple {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
  
  @keyframes gradient-x {
    0%, 100% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
  }
  
  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
  
  @keyframes float-subtle {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-2px);
    }
  }
  
  @keyframes float-active {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-6px);
    }
  }
  
  @keyframes pulse-subtle {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.8;
    }
  }
  
  @keyframes loading-shine {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
  
  .bg-size-200 {
    background-size: 200% 200%;
  }
  
  .animate-gradient-x {
    animation: gradient-x 3s ease infinite;
  }
  
  .animate-shimmer {
    animation: shimmer 2s linear infinite;
  }
  
  .animate-float-subtle {
    animation: float-subtle 3s ease-in-out infinite;
  }
  
  .animate-float-active {
    animation: float-active 1s ease-in-out infinite;
  }
  
  .animate-pulse-subtle {
    animation: pulse-subtle 2s ease-in-out infinite;
  }
  
  .animate-loading-shine {
    animation: loading-shine 1.5s ease-in-out infinite;
  }
*/

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-invalid:outline-destructive aria-invalid:outline-2 active:scale-[0.96] transform hover:scale-[1.02] shadow-sm hover:shadow-lg backdrop-blur-sm border-0 relative overflow-hidden group",
  {
    variants: {
      variant: {
        // Enhanced Primary Variants with theme variables
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl hover:shadow-primary/30 before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/20 before:via-transparent before:to-white/10 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
        
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg hover:shadow-xl hover:shadow-destructive/30",
        
        success: "bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white hover:from-green-600 hover:via-emerald-600 hover:to-teal-600 shadow-lg hover:shadow-xl hover:shadow-green-500/30 before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/20 before:via-transparent before:to-white/10 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
        
        warning: "bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 text-white hover:from-amber-600 hover:via-orange-600 hover:to-yellow-600 shadow-lg hover:shadow-xl hover:shadow-amber-500/30 before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/20 before:via-transparent before:to-white/10 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
        
        info: "bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 text-white hover:from-cyan-600 hover:via-blue-600 hover:to-indigo-600 shadow-lg hover:shadow-xl hover:shadow-cyan-500/30 before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/20 before:via-transparent before:to-white/10 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
        
        // Enhanced Outline Variants
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        
        "outline-destructive": "border-2 bg-background/70 backdrop-blur-md text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/40 hover:border-destructive/80 hover:shadow-lg hover:shadow-destructive/20 before:absolute before:inset-0 before:bg-gradient-to-r before:from-destructive/10 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
        
        "outline-success": "border-2 bg-background/70 backdrop-blur-md text-green-600 hover:bg-green-50 hover:text-green-700 border-green-300 hover:border-green-500 hover:shadow-lg hover:shadow-green-500/20 dark:text-green-400 dark:hover:bg-green-950/30 dark:border-green-700 before:absolute before:inset-0 before:bg-gradient-to-r before:from-green-500/10 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
        
        // Enhanced Ghost & Link Variants
        ghost: "hover:bg-accent hover:text-accent-foreground",
        
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-lg hover:shadow-xl hover:shadow-secondary/30",
        
        link: "text-primary underline-offset-4 hover:underline",
        
        // Premium Glass Morphism Variants
        glass: "bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-white/20 hover:border-white/40 shadow-2xl hover:shadow-3xl hover:shadow-white/10 before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/20 before:via-transparent before:to-white/5 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500",
        
        "glass-dark": "bg-black/10 backdrop-blur-xl border border-black/20 text-black hover:bg-black/20 hover:border-black/40 shadow-2xl hover:shadow-3xl hover:shadow-black/10 before:absolute before:inset-0 before:bg-gradient-to-br before:from-black/15 before:via-transparent before:to-black/5 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500",
        
        "glass-primary": "bg-primary/10 backdrop-blur-xl border border-primary/20 text-primary hover:bg-primary/20 hover:border-primary/40 hover:text-primary shadow-2xl hover:shadow-3xl hover:shadow-primary/20 before:absolute before:inset-0 before:bg-gradient-to-br before:from-primary/20 before:via-transparent before:to-primary/5 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500",
        
        // Advanced Neon & Glow Effects
        neon: "bg-transparent border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black shadow-lg hover:shadow-2xl hover:shadow-cyan-400/60 animate-pulse-subtle relative before:absolute before:inset-0 before:bg-cyan-400/20 before:blur-md before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300 after:absolute after:inset-0 after:border-2 after:border-cyan-400/50 after:rounded-lg after:scale-105 after:opacity-0 hover:after:opacity-100 after:transition-all after:duration-300",
        
        "neon-pink": "bg-transparent border-2 border-pink-400 text-pink-400 hover:bg-pink-400 hover:text-black shadow-lg hover:shadow-2xl hover:shadow-pink-400/60 animate-pulse-subtle relative before:absolute before:inset-0 before:bg-pink-400/20 before:blur-md before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
        
        "neon-green": "bg-transparent border-2 border-green-400 text-green-400 hover:bg-green-400 hover:text-black shadow-lg hover:shadow-2xl hover:shadow-green-400/60 animate-pulse-subtle relative before:absolute before:inset-0 before:bg-green-400/20 before:blur-md before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
        
        // Holographic & Rainbow Effects
        holographic: "bg-gradient-to-r from-purple-500 via-pink-500 via-blue-500 to-green-500 bg-size-200 animate-gradient-x text-white hover:scale-105 shadow-2xl hover:shadow-3xl relative before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/30 before:via-transparent before:to-white/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500",
        
        rainbow: "bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 bg-size-200 animate-gradient-x text-white hover:scale-105 shadow-2xl hover:shadow-3xl relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/25 before:via-transparent before:to-white/15 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500",
        
        // Particle & Shimmer Effects
        shimmer: "bg-gradient-to-r from-gray-700 via-gray-900 via-gray-700 to-gray-900 bg-size-200 animate-shimmer text-white hover:from-gray-600 hover:via-gray-800 hover:to-gray-600 shadow-xl hover:shadow-2xl relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:skew-x-12 before:-translate-x-full hover:before:translate-x-full before:transition-transform before:duration-1000",
        
        gradient: "bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-white hover:from-purple-600 hover:via-pink-600 hover:to-red-600 shadow-xl hover:shadow-2xl hover:scale-105 relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/20 before:via-transparent before:to-white/10 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
        
        // Interactive & Animated Variants
        floating: "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 shadow-2xl hover:shadow-3xl animate-float-subtle hover:animate-float-active relative before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/20 before:via-transparent before:to-white/10 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
        
        morphing: "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-xl hover:shadow-2xl hover:rounded-2xl transition-all duration-500 relative before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/20 before:via-transparent before:to-white/10 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
        
        // Loading & State Variants
        loading: "bg-gradient-to-r from-gray-400 to-gray-600 text-white cursor-not-allowed relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:animate-loading-shine",
        
        // Bootstrap-compatible variants (enhanced)
        "btn-primary": "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl hover:shadow-blue-500/25",
        "btn-secondary": "bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-700 hover:to-gray-800 shadow-lg hover:shadow-xl",
        "btn-success": "bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl hover:shadow-green-500/25",
        "btn-danger": "bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 shadow-lg hover:shadow-xl hover:shadow-red-500/25",
        "btn-warning": "bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600 shadow-lg hover:shadow-xl hover:shadow-yellow-500/25",
        "btn-info": "bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600 shadow-lg hover:shadow-xl hover:shadow-cyan-500/25",
        "btn-light": "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-900 hover:from-gray-200 hover:to-gray-300 shadow-lg hover:shadow-xl border border-gray-300",
        "btn-dark": "bg-gradient-to-r from-gray-800 to-gray-900 text-white hover:from-gray-900 hover:to-black shadow-lg hover:shadow-xl",
        
        // Enhanced outline Bootstrap variants
        "btn-outline-primary": "border-2 border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300",
        "btn-outline-secondary": "border-2 border-gray-500 text-gray-600 hover:bg-gray-500 hover:text-white hover:shadow-lg transition-all duration-300",
        "btn-outline-success": "border-2 border-green-500 text-green-600 hover:bg-green-500 hover:text-white hover:shadow-lg hover:shadow-green-500/25 transition-all duration-300",
        "btn-outline-danger": "border-2 border-red-500 text-red-600 hover:bg-red-500 hover:text-white hover:shadow-lg hover:shadow-red-500/25 transition-all duration-300",
        "btn-outline-warning": "border-2 border-yellow-500 text-yellow-600 hover:bg-yellow-500 hover:text-white hover:shadow-lg hover:shadow-yellow-500/25 transition-all duration-300",
        "btn-outline-info": "border-2 border-cyan-500 text-cyan-600 hover:bg-cyan-500 hover:text-white hover:shadow-lg hover:shadow-cyan-500/25 transition-all duration-300",
        "btn-outline-light": "border-2 border-gray-300 text-gray-700 hover:bg-gray-300 hover:text-gray-900 hover:shadow-lg transition-all duration-300",
        "btn-outline-dark": "border-2 border-gray-800 text-gray-800 hover:bg-gray-800 hover:text-white hover:shadow-lg transition-all duration-300",
      },
      size: {
        // Text-based sizes
        xs: "h-6 rounded-md gap-1 px-2 has-[>svg]:px-1.5 text-xs font-medium",
        sm: "h-8 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5 text-xs font-medium",
        default: "h-10 px-4 py-2 has-[>svg]:px-3 text-sm font-medium",
        lg: "h-12 rounded-xl px-6 has-[>svg]:px-5 text-base font-semibold",
        xl: "h-14 rounded-2xl px-8 has-[>svg]:px-7 text-lg font-bold",
        "2xl": "h-16 rounded-3xl px-10 has-[>svg]:px-9 text-xl font-bold",
        
        // Icon-only sizes
        "icon-xs": "size-6 rounded-md",
        "icon-sm": "size-8 rounded-lg",
        "icon": "size-10 rounded-xl",
        "icon-lg": "size-12 rounded-xl",
        "icon-xl": "size-14 rounded-2xl",
        "icon-2xl": "size-16 rounded-3xl",
        
        // Specialized sizes
        pill: "h-10 px-6 rounded-full text-sm font-medium",
        "pill-sm": "h-8 px-4 rounded-full text-xs font-medium",
        "pill-lg": "h-12 px-8 rounded-full text-base font-semibold",
        
        wide: "h-10 px-8 py-2 w-full max-w-xs text-sm font-medium",
        "wide-lg": "h-12 px-10 py-3 w-full max-w-md text-base font-semibold",
        
        compact: "h-8 px-2 py-1 text-xs font-medium rounded-md",
        floating: "h-12 px-6 rounded-2xl shadow-2xl hover:shadow-3xl text-base font-semibold",
        
        // Bootstrap-compatible sizes
        "btn-sm": "h-8 px-3 text-xs rounded-lg",
        "btn-lg": "h-12 px-6 text-base rounded-xl font-semibold",
        
        // Special purpose sizes
        fab: "size-14 rounded-full shadow-2xl hover:shadow-3xl", // Floating Action Button
        "fab-sm": "size-10 rounded-full shadow-xl hover:shadow-2xl",
        "fab-lg": "size-16 rounded-full shadow-2xl hover:shadow-3xl",
        
        // Responsive sizes
        responsive: "h-8 px-3 text-xs sm:h-10 sm:px-4 sm:text-sm md:h-12 md:px-6 md:text-base font-medium rounded-lg sm:rounded-xl md:rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loadingText?: string;
  ripple?: boolean;
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  leftIcon,
  rightIcon,
  loadingText,
  ripple = true,
  children,
  disabled,
  onClick,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  const isDisabled = disabled || loading;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isDisabled) return;
    
    // Ripple effect
    if (ripple) {
      const button = e.currentTarget;
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      const rippleElement = document.createElement('span');
      rippleElement.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 0.6s linear;
        pointer-events: none;
        z-index: 0;
      `;
      
      button.style.position = 'relative';
      button.style.overflow = 'hidden';
      button.appendChild(rippleElement);
      
      setTimeout(() => {
        rippleElement.remove();
      }, 600);
    }
    
    onClick?.(e);
  };

  return (
    <Comp
      data-slot="button"
      className={cn(
        buttonVariants({ variant: loading ? "loading" : variant, size, className }),
        isDisabled && "cursor-not-allowed opacity-50"
      )}
      disabled={isDisabled}
      onClick={handleClick}
      aria-disabled={isDisabled}
      aria-busy={loading}
      {...props}
    >
      {/* Loading spinner */}
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}
      
      {/* Left icon */}
      {!loading && leftIcon && (
        <span className="flex items-center justify-center" aria-hidden="true">
          {leftIcon}
        </span>
      )}
      
      {/* Button content */}
      <span className="relative z-10 flex items-center gap-2">
        {loading ? (loadingText || "Loading...") : children}
      </span>
      
      {/* Right icon */}
      {!loading && rightIcon && (
        <span className="flex items-center justify-center" aria-hidden="true">
          {rightIcon}
        </span>
      )}
    </Comp>
  );
}

export { Button };
export type { ButtonProps };
