/**
 * cn() — the standard Shadcn helper for conditional Tailwind classes.
 * Principle C10: use this instead of inline styles or string concatenation.
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
