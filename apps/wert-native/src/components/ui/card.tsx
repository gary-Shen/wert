import { forwardRef, ReactNode } from "react";
import { View, type ViewProps } from "react-native";
import { cn } from "@/lib/utils";

export interface CardProps extends ViewProps {
  children?: ReactNode;
  variant?: "default" | "elevated" | "outline" | "filled" | "gradient";
}

const Card = forwardRef<View, CardProps>(
  ({ children, variant = "default", className, ...props }, ref) => {
    return (
      <View
        ref={ref}
        className={cn(
          "rounded-2xl p-4",
          variant === "default" && "bg-card",
          variant === "elevated" && "bg-card shadow-lg",
          variant === "outline" && "bg-card border border-border",
          variant === "filled" && "bg-muted",
          variant === "gradient" && "bg-primary/5 border border-primary/20",
          className
        )}
        {...props}
      >
        {children}
      </View>
    );
  }
);

Card.displayName = "Card";

const CardHeader = forwardRef<View, ViewProps>(
  ({ className, ...props }, ref) => (
    <View ref={ref} className={cn("mb-3", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

const CardContent = forwardRef<View, ViewProps>(
  ({ className, ...props }, ref) => (
    <View ref={ref} className={cn("", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = forwardRef<View, ViewProps>(
  ({ className, ...props }, ref) => (
    <View ref={ref} className={cn("mt-3 flex-row", className)} {...props} />
  )
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardContent, CardFooter };
