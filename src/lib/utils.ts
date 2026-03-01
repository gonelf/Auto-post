import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatInTimeZone } from 'date-fns-tz';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDatetime(isoString: string, timezone?: string): string {
  const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    return formatInTimeZone(new Date(isoString), tz, 'MMM d, yyyy HH:mm');
  } catch {
    return new Date(isoString).toLocaleString();
  }
}

export function isTokenExpired(tokenExpiresAt: string, bufferMs = 60_000): boolean {
  return new Date(tokenExpiresAt).getTime() < Date.now() + bufferMs;
}
