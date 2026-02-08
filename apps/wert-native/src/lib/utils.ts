import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 格式化货币金额
 */
export function formatCurrency(
  value: number,
  options?: {
    currency?: string;
    compact?: boolean;
    showSign?: boolean;
  }
): string {
  const { currency = "CNY", compact = false, showSign = false } = options || {};

  const absValue = Math.abs(value);
  let formatted: string;

  if (compact && absValue >= 10000) {
    // 使用中文单位
    if (absValue >= 100000000) {
      formatted = `${(absValue / 100000000).toFixed(2)}亿`;
    } else if (absValue >= 10000) {
      formatted = `${(absValue / 10000).toFixed(2)}万`;
    } else {
      formatted = absValue.toLocaleString("zh-CN");
    }
  } else {
    formatted = absValue.toLocaleString("zh-CN", {
      maximumFractionDigits: 2,
    });
  }

  if (showSign && value !== 0) {
    return value > 0 ? `+${formatted}` : `-${formatted}`;
  }

  return value < 0 ? `-${formatted}` : formatted;
}

/**
 * 格式化百分比
 */
export function formatPercentage(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * 格式化日期
 */
export function formatDate(date: Date | string, format: "short" | "long" = "short"): string {
  const d = typeof date === "string" ? new Date(date) : date;

  if (format === "short") {
    return d.toLocaleDateString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
    });
  }

  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
