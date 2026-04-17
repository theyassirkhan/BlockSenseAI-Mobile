import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatKL(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}ML`;
  return `${value.toFixed(1)} KL`;
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function daysFromNow(ts: number): string {
  const diff = ts - Date.now();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

export function levelColor(pct: number): string {
  if (pct >= 50) return "#3B6D11";
  if (pct >= 20) return "#BA7517";
  return "#A32D2D";
}
