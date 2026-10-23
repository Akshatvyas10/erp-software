import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const BACKEND_BASE = (import.meta.env.VITE_API_URL?.replace(/\/api$/, "") ?? "http://localhost:5000").replace(/\/$/, "");

/**
 * Resolves relative uploaded asset paths (e.g. /uploads/students/xyz.jpg) to full backend URLs.
 * Leaves blob:, data:, and full http(s) URLs untouched.
 */
export function getImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("blob:") || path.startsWith("data:") || path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${BACKEND_BASE}${cleanPath}`;
}
