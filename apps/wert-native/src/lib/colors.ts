/**
 * HSL 颜色类型
 */
export type HSLColor = { h: number; s: number; l: number };

/**
 * 资产类别颜色映射
 */
export const CATEGORY_COLORS: Record<string, HSLColor> = {
  CASH: { h: 217, s: 91, l: 60 }, // Blue
  STOCK: { h: 38, s: 92, l: 50 }, // Amber
  FUND: { h: 262, s: 83, l: 58 }, // Violet
  BOND: { h: 190, s: 90, l: 50 }, // Cyan
  CRYPTO: { h: 280, s: 70, l: 60 }, // Purple
  REAL_ESTATE: { h: 147, s: 50, l: 47 }, // Green
  VEHICLE: { h: 0, s: 84, l: 60 }, // Red
  PRECIOUS_METAL: { h: 50, s: 100, l: 50 }, // Gold
  COLLECTIBLE: { h: 300, s: 76, l: 72 }, // Pink
  LIABILITY: { h: 0, s: 0, l: 40 }, // Grey
  OTHER: { h: 200, s: 10, l: 50 }, // Slate
};

/**
 * 获取类别颜色
 */
export function getCategoryColor(category: string): HSLColor {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.OTHER;
}

/**
 * HSL 转字符串
 */
export function hslToString(c: HSLColor): string {
  return `hsl(${c.h}, ${c.s}%, ${c.l}%)`;
}

/**
 * HSL 转 RGBA（用于 React Native）
 */
export function hslToRgba(c: HSLColor, alpha = 1): string {
  const { h, s, l } = c;
  const sNorm = s / 100;
  const lNorm = l / 100;

  const k = (n: number) => (n + h / 30) % 12;
  const a = sNorm * Math.min(lNorm, 1 - lNorm);
  const f = (n: number) =>
    lNorm - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

  const r = Math.round(255 * f(0));
  const g = Math.round(255 * f(8));
  const b = Math.round(255 * f(4));

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * 主题颜色（支持亮色/暗色模式）
 */
export const THEME_COLORS = {
  light: {
    background: "#ffffff",
    foreground: "#0a0a0a",
    card: "#ffffff",
    cardForeground: "#0a0a0a",
    primary: "#171717",
    primaryForeground: "#fafafa",
    secondary: "#f5f5f5",
    secondaryForeground: "#171717",
    muted: "#f5f5f5",
    mutedForeground: "#737373",
    accent: "#f5f5f5",
    accentForeground: "#171717",
    destructive: "#ef4444",
    destructiveForeground: "#fafafa",
    border: "#e5e5e5",
    success: "#22c55e",
    warning: "#f59e0b",
    error: "#ef4444",
  },
  dark: {
    background: "#0a0a0a",
    foreground: "#fafafa",
    card: "#0a0a0a",
    cardForeground: "#fafafa",
    primary: "#fafafa",
    primaryForeground: "#171717",
    secondary: "#262626",
    secondaryForeground: "#fafafa",
    muted: "#262626",
    mutedForeground: "#a3a3a3",
    accent: "#262626",
    accentForeground: "#fafafa",
    destructive: "#7f1d1d",
    destructiveForeground: "#fafafa",
    border: "#262626",
    success: "#22c55e",
    warning: "#f59e0b",
    error: "#ef4444",
  },
};

export type ThemeMode = "light" | "dark";
