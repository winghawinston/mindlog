import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Merges Tailwind classes safely, resolving conflicts.
// e.g. cn("px-2 px-4") → "px-4" (no duplicate/conflicting classes)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}