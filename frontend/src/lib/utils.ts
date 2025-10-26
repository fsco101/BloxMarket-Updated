import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines and merges CSS classes with Tailwind utilities
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}