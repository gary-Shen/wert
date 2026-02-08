import { toast as burntToast } from "burnt";

export type ToastType = "success" | "error" | "info";

export interface ToastOptions {
  title: string;
  message?: string;
  type?: ToastType;
  duration?: number;
  haptic?: "success" | "warning" | "error" | "none";
}

/**
 * 显示 Toast 通知
 * 使用 burnt 库实现原生 Toast
 */
export function toast(options: ToastOptions) {
  const {
    title,
    message,
    type = "info",
    duration = 3,
    haptic = type === "success"
      ? "success"
      : type === "error"
        ? "error"
        : "none",
  } = options;

  // burnt 的 preset 映射
  const presetMap: Record<ToastType, "done" | "error" | "none"> = {
    success: "done",
    error: "error",
    info: "none",
  };

  burntToast({
    title,
    message,
    preset: presetMap[type],
    duration,
    haptic,
  });
}

/**
 * 快捷方法
 */
export const showToast = {
  success: (title: string, message?: string) =>
    toast({ title, message, type: "success" }),
  error: (title: string, message?: string) =>
    toast({ title, message, type: "error" }),
  info: (title: string, message?: string) =>
    toast({ title, message, type: "info" }),
};
