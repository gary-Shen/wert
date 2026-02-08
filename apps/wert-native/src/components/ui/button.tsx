import { forwardRef, ReactNode } from "react";
import {
  Pressable,
  type PressableProps,
  ActivityIndicator,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { cn } from "@/lib/utils";
import { Text } from "./text";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface ButtonProps extends Omit<PressableProps, "children"> {
  children?: ReactNode;
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
  haptic?: boolean;
}

const Button = forwardRef<typeof AnimatedPressable, ButtonProps>(
  (
    {
      children,
      variant = "default",
      size = "md",
      loading = false,
      haptic = true,
      className,
      disabled,
      onPressIn,
      onPressOut,
      onPress,
      ...props
    },
    ref
  ) => {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: withSpring(scale.value, { damping: 20, stiffness: 400 }) }],
    }));

    const handlePressIn = (e: any) => {
      scale.value = 0.95;
      onPressIn?.(e);
    };

    const handlePressOut = (e: any) => {
      scale.value = 1;
      onPressOut?.(e);
    };

    const handlePress = (e: any) => {
      if (haptic) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onPress?.(e);
    };

    return (
      <AnimatedPressable
        ref={ref as any}
        style={animatedStyle}
        className={cn(
          // Base
          "flex-row items-center justify-center rounded-xl",
          // Variants
          variant === "default" && "bg-primary",
          variant === "secondary" && "bg-secondary",
          variant === "outline" && "border border-border bg-transparent",
          variant === "ghost" && "bg-transparent",
          variant === "destructive" && "bg-destructive",
          // Sizes
          size === "sm" && "h-9 px-3",
          size === "md" && "h-11 px-4",
          size === "lg" && "h-14 px-6",
          size === "icon" && "h-11 w-11",
          // States
          (disabled || loading) && "opacity-50",
          className
        )}
        disabled={disabled || loading}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        {...props}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === "default" ? "#fff" : "#000"}
          />
        ) : typeof children === "string" ? (
          <Text
            weight="medium"
            className={cn(
              variant === "default" && "text-primary-foreground",
              variant === "secondary" && "text-secondary-foreground",
              variant === "outline" && "text-foreground",
              variant === "ghost" && "text-foreground",
              variant === "destructive" && "text-destructive-foreground"
            )}
          >
            {children}
          </Text>
        ) : (
          children
        )}
      </AnimatedPressable>
    );
  }
);

Button.displayName = "Button";

export { Button };
