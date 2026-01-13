import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeRelayUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  // If it already has a protocol, return as-is
  if (trimmed.includes('://')) {
    return trimmed;
  }

  // For localhost or IP addresses, don't auto-add protocol - let user specify
  if (trimmed.startsWith('localhost') || trimmed.match(/^\d+\.\d+\.\d+\.\d+/)) {
    // If user types localhost:3777 without protocol, they probably want ws://
    // But we'll let them be explicit about it
    return trimmed;
  }

  // For regular domains, add wss:// prefix
  return `wss://${trimmed}`;
}
