import { forwardRef } from "react";
import {
  Text as RNText,
  type TextProps as RNTextProps,
  StyleSheet,
} from "react-native";
import { cn } from "@/lib/utils";

export interface TextProps extends RNTextProps {
  variant?: "default" | "display" | "headline" | "heading" | "title" | "body" | "caption" | "label";
  weight?: "normal" | "medium" | "semibold" | "bold";
  color?: "default" | "muted" | "primary" | "success" | "error" | "warning";
}

const Text = forwardRef<RNText, TextProps>(
  ({ variant = "body", weight = "normal", color = "default", className, style, ...props }, ref) => {
    return (
      <RNText
        ref={ref}
        className={cn(
          // Base
          "text-foreground",
          // Variants
          variant === "display" && "text-4xl",
          variant === "headline" && "text-2xl",
          variant === "heading" && "text-3xl",
          variant === "title" && "text-xl",
          variant === "body" && "text-base",
          variant === "caption" && "text-sm",
          variant === "label" && "text-xs uppercase tracking-wider",
          // Weights
          weight === "normal" && "font-normal",
          weight === "medium" && "font-medium",
          weight === "semibold" && "font-semibold",
          weight === "bold" && "font-bold",
          // Colors
          color === "muted" && "text-muted-foreground",
          color === "primary" && "text-primary",
          color === "success" && "text-green-500",
          color === "error" && "text-red-500",
          color === "warning" && "text-amber-500",
          className
        )}
        style={style}
        {...props}
      />
    );
  }
);

Text.displayName = "Text";

export { Text };
